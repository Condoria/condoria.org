/**
 * Litematica pipeline regression tests — the parser and the DeepSlate
 * `Structure` conversion, validated against synthetic fixtures AND the real
 * reference schematic (src/seed/assets/simple-house.litematic). No browser
 * needed (Structure comes from deepslate/core, which is pure).
 *
 *   pnpm test:litematic
 *
 * These guard the two subtle correctness traps that have already bitten us:
 * the pre-1.16 SPANNING bit-unpack, and negative-Size axis mirroring — plus the
 * new invariant that every non-air block survives the DeepSlate conversion.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Int32, write } from 'nbtify'

import {
  aoBrightness,
  aoLevel,
  faceShade,
  isOccludingCube,
} from '../src/blocks/components/Litematic/deepslate/ambientOcclusion'
import { litematicToStructure } from '../src/blocks/components/Litematic/deepslate/structure'
import { parseLitematic } from '../src/lib/litematic/parse'

let failed = false
function assert(cond: boolean, msg: string): void {
  console.log(`${cond ? 'ok  ' : 'FAIL'} — ${msg}`)
  if (!cond) failed = true
}

/** Independent (spec) spanning pack — inverse of the parser's unpack. */
function packSpanning(indices: number[], bits: number): BigInt64Array {
  const longCount = Math.ceil((indices.length * bits) / 64)
  const u = new BigUint64Array(longCount)
  const mask = (1n << BigInt(bits)) - 1n
  const U64 = 0xffffffffffffffffn
  for (let i = 0; i < indices.length; i++) {
    const value = BigInt(indices[i]) & mask
    const bitStart = i * bits
    const startLong = Math.floor(bitStart / 64)
    const startOffset = bitStart % 64
    const endLong = Math.floor((bitStart + bits - 1) / 64)
    u[startLong] = (u[startLong] | ((value << BigInt(startOffset)) & U64)) & U64
    if (startLong !== endLong) u[endLong] = (u[endLong] | (value >> BigInt(64 - startOffset))) & U64
  }
  const longs = new BigInt64Array(longCount)
  for (let k = 0; k < longCount; k++) longs[k] = BigInt.asIntN(64, u[k])
  return longs
}

async function buildFile(
  sx: number,
  sy: number,
  sz: number,
  palette: string[],
  indices: number[],
): Promise<Uint8Array> {
  const bits = Math.max(2, 32 - Math.clz32(palette.length - 1))
  const root = {
    MinecraftDataVersion: new Int32(3465),
    Version: new Int32(6),
    Metadata: { RegionCount: new Int32(1) },
    Regions: {
      R: {
        Position: { x: new Int32(0), y: new Int32(0), z: new Int32(0) },
        Size: { x: new Int32(sx), y: new Int32(sy), z: new Int32(sz) },
        BlockStatePalette: palette.map((Name) => ({ Name })),
        BlockStates: packSpanning(indices, bits),
      },
    },
  }
  return (await write(root, { compression: 'gzip', endian: 'big', rootName: '' })) as Uint8Array
}

async function main(): Promise<void> {
  const PAL5 = ['minecraft:air', 'minecraft:stone', 'minecraft:oak_planks', 'minecraft:glass', 'minecraft:dirt']

  // ── Parser: spanning unpack (3 bits/index) round-trips across long edges ────
  {
    const [sx, sy, sz] = [4, 5, 5]
    const vol = sx * sy * sz
    const pattern = Array.from({ length: vol }, (_, i) => i % 5)
    const r = (await parseLitematic(await buildFile(sx, sy, sz, PAL5, pattern))).regions[0]
    let mism = 0
    for (let j = 0; j < vol; j++) if (r.indices[j] !== pattern[j]) mism++
    assert(mism === 0, `spanning unpack round-trips ${vol} indices (mismatches=${mism})`)
  }

  // ── Parser: negative-Size axis sets the min corner but keeps LOCAL order ────
  // (facings are baked in the local frame; reflecting the order would desync them)
  {
    const nr = (await parseLitematic(await buildFile(-3, 1, 1, PAL5, [1, 2, 3]))).regions[0]
    assert(nr.min[0] === -2, `negative-size min.x = ${nr.min[0]} (expected -2)`)
    assert([nr.indices[0], nr.indices[1], nr.indices[2]].join(',') === '1,2,3', 'kept in local order (no reflect)')
  }

  // ── Conversion: a solid 3³ stone cube → 27 placed blocks, size preserved ────
  {
    const model = await parseLitematic(
      await buildFile(3, 3, 3, ['minecraft:air', 'minecraft:stone'], new Array(27).fill(1)),
    )
    const { structure: s, center } = litematicToStructure(model)
    assert(s.getSize().join(',') === '3,3,3', `structure size = ${s.getSize().join(',')}`)
    assert(center.join(',') === '1.5,1.5,1.5', `orbit pivot = block centroid (${center.join(',')})`)
    assert(s.getBlocks().length === 27, `all 27 blocks placed (${s.getBlocks().length})`)
    assert(s.getBlocks().length === model.blockCount, 'conversion keeps every non-air block')
    const b = s.getBlock([1, 1, 1])
    assert(b?.state.getName().toString() === 'minecraft:stone', 'block ids survive conversion')
  }

  // ── Conversion: air is skipped ──────────────────────────────────────────────
  {
    const model = await parseLitematic(await buildFile(1, 1, 2, ['minecraft:air', 'minecraft:stone'], [0, 1]))
    const { structure: s } = litematicToStructure(model)
    assert(s.getBlocks().length === 1, `air voxel skipped (${s.getBlocks().length} placed)`)
  }

  // ── Ambient occlusion: corner levels, brightness ramp, occluder predicate ───
  assert(aoLevel(true, true, false) === 0, 'both edges occluded → darkest (0)')
  assert(aoLevel(false, false, false) === 3, 'open corner → brightest (3)')
  assert(aoLevel(true, false, false) === 2, 'one edge → level 2')
  assert(aoLevel(true, false, true) === 1, 'one edge + diagonal → level 1')
  assert(aoBrightness(3, 0.5) === 1, 'open corner keeps full brightness')
  assert(aoBrightness(0, 1) < aoBrightness(0, 0.5), 'more strength darkens a corner more')
  assert(
    aoBrightness(0, 0.5) < aoBrightness(1, 0.5) && aoBrightness(1, 0.5) < aoBrightness(2, 0.5),
    'brightness ramps monotonically with openness',
  )
  assert(aoBrightness(2, 0.5) < 1, 'a partly-occluded corner is darkened')
  // Directional face shading: top brightest, bottom darkest, E/W darker than N/S.
  assert(faceShade(0, 1, 0) === 1, 'top face full brightness')
  assert(faceShade(0, -1, 0) < faceShade(1, 0, 0), 'bottom darker than sides')
  assert(faceShade(1, 0, 0) < faceShade(0, 0, 1), 'east/west darker than north/south')
  assert(faceShade(0, 0, 1) < 1, 'side faces are shaded below the top')
  assert(isOccludingCube('minecraft:stone') && isOccludingCube('minecraft:oak_planks'), 'solid cubes occlude')
  assert(
    !isOccludingCube('minecraft:oak_stairs') &&
      !isOccludingCube('minecraft:oak_slab') &&
      !isOccludingCube('minecraft:glass') &&
      !isOccludingCube('minecraft:glass_pane') &&
      !isOccludingCube('minecraft:oak_leaves') &&
      !isOccludingCube('minecraft:lantern') &&
      !isOccludingCube('minecraft:air'),
    'partial / transparent blocks do not occlude',
  )

  // ── Real reference schematic: parser + conversion fidelity ──────────────────
  const here = path.dirname(fileURLToPath(import.meta.url))
  const model = await parseLitematic(await readFile(path.resolve(here, '../src/seed/assets/simple-house.litematic')))
  const { structure: s } = litematicToStructure(model)
  console.log('\nhouse blockCount:', model.blockCount, '\nbounds size:', model.bounds.size.join(','))

  assert(model.blockCount > 600, `real house has its blocks (${model.blockCount})`)
  assert(s.getSize().join(',') === model.bounds.size.join(','), 'structure size matches model bounds')
  assert(s.getBlocks().length === model.blockCount, 'every non-air block reaches the structure')
  // Every placed block sits inside the declared bounds.
  const [bx, by, bz] = s.getSize()
  const outOfBounds = s
    .getBlocks()
    .some(({ pos: [x, y, z] }) => x < 0 || y < 0 || z < 0 || x >= bx || y >= by || z >= bz)
  assert(!outOfBounds, 'all placed blocks lie within the structure bounds')

  console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS')
  process.exit(failed ? 1 : 0)
}

try {
  await main()
} catch (err) {
  console.error('threw:', err)
  process.exit(1)
}
