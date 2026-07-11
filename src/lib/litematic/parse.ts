import { read } from 'nbtify'

/**
 * Parser for the Litematica `.litematic` schematic format (gzipped NBT).
 *
 * A `.litematic` is a gzip-compressed NBT compound with one or more named
 * Regions. Each region carries a block-state Palette and a bit-packed
 * `BlockStates` long array whose per-voxel indices use Litematica's PRE-1.16
 * "spanning" packing — an index may straddle a 64-bit long boundary. This is
 * NOT the padded/non-spanning packing vanilla chunks switched to in 1.16, and
 * reusing chunk-unpack code corrupts every index past the first long. See
 * `unpackSpanning` below.
 *
 * nbtify handles the gzip decompression and NBT decode (longs arrive as a
 * signed BigInt64Array); everything Litematica-specific — palette, spanning
 * unpack, negative-Size axis mirroring, multi-region placement — lives here.
 *
 * The output is a render-friendly model: each region's voxels stay in Litematica's
 * LOCAL enumeration order (the same frame its block-state facings are baked in),
 * so a renderer places `min + local` and directional blocks stay consistent. A
 * negative Size axis just reflects that local frame relative to true world; we do
 * NOT reflect it back, or the facings would desync — stairs/doors would point the
 * wrong way (see parseRegion).
 */

export type BlockState = {
  /** Full block id, e.g. "minecraft:oak_stairs". */
  name: string
  /** Block-state properties, e.g. { facing: "north", half: "bottom" }. */
  properties: Record<string, string>
}

export type IndexArray = Uint16Array | Uint32Array

export type LitematicRegion = {
  name: string
  /** True world-space minimum corner (accounts for negative Size axes). */
  min: [number, number, number]
  /** Absolute dimensions. */
  size: [number, number, number]
  palette: BlockState[]
  /** Parallel to `palette`: whether that entry is an air variant (skip it). */
  isAir: boolean[]
  /** Palette index per voxel, canonical order `y*(sx*sz) + z*sx + x`. */
  indices: IndexArray
}

export type LitematicModel = {
  regions: LitematicRegion[]
  bounds: {
    min: [number, number, number]
    max: [number, number, number]
    size: [number, number, number]
  }
  /** Non-air blocks across all regions. */
  blockCount: number
  regionCount: number
}

const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'])

export function isAirName(name: string): boolean {
  return AIR_NAMES.has(name)
}

/** Coerce an nbtify numeric wrapper (Int8/Int16/Int32/…) or bigint to a number. */
function num(value: unknown): number {
  return Number(value as number)
}

/** Bits per index = max(2, ceil(log2(paletteSize))), Litematica's rule. */
function bitsForPalette(paletteSize: number): number {
  if (paletteSize <= 1) return 2
  return Math.max(2, 32 - Math.clz32(paletteSize - 1))
}

/**
 * Litematica spanning bit-unpack. `longs` are treated as UNSIGNED 64-bit
 * (BigInt64Array is signed, so each is masked with asUintN before shifting, or
 * sign extension corrupts the high bits). Index i occupies `bits` bits starting
 * at `i * bits`; when those bits cross a long boundary, the high part comes from
 * the next long shifted up.
 */
function unpackSpanning(longs: BigInt64Array, bits: number, volume: number, out: IndexArray): void {
  const mask = (1n << BigInt(bits)) - 1n
  for (let i = 0; i < volume; i++) {
    const bitStart = i * bits
    const startLong = Math.floor(bitStart / 64)
    const startOffset = bitStart % 64
    const endLong = Math.floor((bitStart + bits - 1) / 64)
    const low = BigInt.asUintN(64, longs[startLong])
    let value: bigint
    if (startLong === endLong) {
      value = (low >> BigInt(startOffset)) & mask
    } else {
      const high = BigInt.asUintN(64, longs[endLong])
      value = ((low >> BigInt(startOffset)) | (high << BigInt(64 - startOffset))) & mask
    }
    out[i] = Number(value)
  }
}

function newIndexArray(volume: number, paletteSize: number): IndexArray {
  return paletteSize <= 0x10000 ? new Uint16Array(volume) : new Uint32Array(volume)
}

type RawRegion = {
  Position?: { x: unknown; y: unknown; z: unknown }
  Size?: { x: unknown; y: unknown; z: unknown }
  BlockStatePalette?: Array<{ Name?: unknown; Properties?: Record<string, unknown> }>
  BlockStates?: BigInt64Array
}

function parseRegion(name: string, raw: RawRegion): LitematicRegion | null {
  const palette: BlockState[] = (raw.BlockStatePalette ?? []).map((entry) => {
    const properties: Record<string, string> = {}
    if (entry.Properties) {
      for (const [key, val] of Object.entries(entry.Properties)) properties[key] = String(val)
    }
    return { name: String(entry.Name ?? 'minecraft:air'), properties }
  })
  if (palette.length === 0) return null
  const isAir = palette.map((b) => isAirName(b.name))

  const px = num(raw.Position?.x)
  const py = num(raw.Position?.y)
  const pz = num(raw.Position?.z)
  const rawSx = num(raw.Size?.x)
  const rawSy = num(raw.Size?.y)
  const rawSz = num(raw.Size?.z)
  const sx = Math.abs(rawSx)
  const sy = Math.abs(rawSy)
  const sz = Math.abs(rawSz)
  const volume = sx * sy * sz
  if (volume === 0) return null

  const longs = raw.BlockStates
  if (!longs || longs.length === 0) return null
  const bits = bitsForPalette(palette.length)
  const needed = Math.ceil((volume * bits) / 64)
  if (longs.length < needed) {
    throw new Error(
      `Region "${name}" is truncated: expected >= ${needed} longs for ${volume} blocks at ${bits} bits, got ${longs.length}.`,
    )
  }

  const rawIndices = newIndexArray(volume, palette.length)
  unpackSpanning(longs, bits, volume, rawIndices)

  // World-min corner per axis, and whether an axis is mirrored (negative Size).
  const minX = rawSx >= 0 ? px : px - (sx - 1)
  const minY = rawSy >= 0 ? py : py - (sy - 1)
  const minZ = rawSz >= 0 ? pz : pz - (sz - 1)

  // Litematica stores each region's block array in LOCAL enumeration order, and
  // the block-state facings are baked in that same local frame. So we render the
  // array as-is (matching Litematica and abfielder's viewer): a negative Size
  // axis only means the local frame is reflected relative to true world —
  // reflecting the positions back while leaving the local-frame facings alone
  // would desync them (stairs, doors… would point the wrong way). The sign
  // therefore affects only the min corner used to lay out regions, not the order.

  return { name, min: [minX, minY, minZ], size: [sx, sy, sz], palette, isAir, indices: rawIndices }
}

/**
 * Parse a `.litematic` file (its raw bytes) into a normalised voxel model.
 * Throws on malformed input; callers should surface a friendly error.
 */
export async function parseLitematic(data: ArrayBuffer | Uint8Array): Promise<LitematicModel> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const nbt = await read(bytes)
  const root = nbt.data as { Regions?: Record<string, RawRegion> }
  const rawRegions = root.Regions
  if (!rawRegions || typeof rawRegions !== 'object') {
    throw new Error('Not a Litematica schematic: no Regions compound found.')
  }

  const regions: LitematicRegion[] = []
  let blockCount = 0
  for (const [name, raw] of Object.entries(rawRegions)) {
    const region = parseRegion(name, raw)
    if (!region) continue
    for (let i = 0; i < region.indices.length; i++) {
      if (!region.isAir[region.indices[i]]) blockCount++
    }
    regions.push(region)
  }
  if (regions.length === 0) {
    throw new Error('Litematica schematic contains no non-empty regions.')
  }

  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (const r of regions) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], r.min[a])
      max[a] = Math.max(max[a], r.min[a] + r.size[a])
    }
  }
  const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]

  return { regions, bounds: { min, max, size }, blockCount, regionCount: regions.length }
}
