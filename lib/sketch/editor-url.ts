import type { CellStyleMap } from "./editor-types";
import { DEFAULT_STYLES, serializeStylesParam, TRANSPARENT_CHAR } from "./editor-types";
import {
  parseGridRows,
  parsePlanFeature,
  parseElevationFeature,
  parseTitle,
} from "./parse";
import { parseStylesParam } from "./style-codec";

export type EditorState = {
  title: string;
  subtitle: string;
  grid: string[][];
  styleMap: CellStyleMap;
  planEnabled: boolean;
  setback: number;
  maxheight: number;
  elevationEnabled: boolean;
  showover: boolean;
};

type StringQuery = Record<string, string | string[] | undefined>;

export function normalizeRouterQuery(query: StringQuery): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }
    normalized[key] = Array.isArray(value) ? value[0] : value;
  }
  return normalized;
}

export function hasSketchQuery(query: StringQuery): boolean {
  const normalized = normalizeRouterQuery(query);
  return Boolean(normalized.rows?.trim() || normalized.grid?.trim());
}

export function editorStateFromQuery(query: StringQuery): EditorState | null {
  const normalized = normalizeRouterQuery(query);
  const rows = parseGridRows(normalized);
  if (!rows) {
    return null;
  }

  const grid = rows.map((row: string) => row.split(""));
  const styleMap = parseStylesParam(normalized.styles) as CellStyleMap;
  const plan = parsePlanFeature(normalized);
  const elevation = parseElevationFeature(normalized);

  let maxheight = 25;
  if (elevation.enabled && elevation.maxheight) {
    maxheight = elevation.maxheight;
  } else if (plan.enabled && plan.maxheight) {
    maxheight = plan.maxheight;
  } else if (normalized.maxheight) {
    const parsed = Number.parseInt(normalized.maxheight, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      maxheight = parsed;
    }
  }

  return {
    title: parseTitle(normalized.title, "Zoning Regulation"),
    subtitle: typeof normalized.subtitle === "string" ? normalized.subtitle.trim() : "",
    grid,
    styleMap,
    planEnabled: plan.enabled,
    setback: plan.enabled ? (plan.setback ?? 0) : 0,
    maxheight,
    elevationEnabled: elevation.enabled,
    showover: elevation.showOverLimit ?? true,
  };
}

export function sketchSearchParamsFromState(state: EditorState): URLSearchParams {
  const plotWidth = state.grid[0]?.length ?? 1;
  const plotDepth = state.grid.length;
  const search = new URLSearchParams();

  search.set("title", state.title || "Zoning Regulation");
  search.set("rows", state.grid.map((row) => row.join("")).join("|"));
  search.set("styles", serializeStylesParam(state.styleMap));

  if (state.subtitle.trim()) {
    search.set("subtitle", state.subtitle.trim());
  }
  if (state.planEnabled) {
    search.set("plan", "1");
    search.set("width", String(plotWidth));
    search.set("depth", String(plotDepth));
    search.set("setback", String(state.setback));
    search.set("maxheight", String(state.maxheight));
  }
  if (state.elevationEnabled) {
    search.set("elevation", "1");
    search.set("maxheight", String(state.maxheight));
    search.set("showover", state.showover ? "1" : "0");
  }

  return search;
}

export function sketchApiPathFromState(state: EditorState): string {
  return `/api/render-sketch?${sketchSearchParamsFromState(state).toString()}`;
}

export function sketchQueryFromImportUrl(input: string): URLSearchParams | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.startsWith("?")) {
      return new URLSearchParams(trimmed.slice(1));
    }

    if (!trimmed.includes("/") && trimmed.includes("=")) {
      return new URLSearchParams(trimmed);
    }

    const base =
      typeof window !== "undefined" ? window.location.origin : "https://condoria.vercel.app";
    const url = new URL(trimmed, base);
    if (
      url.pathname.endsWith("/api/render-sketch") ||
      url.pathname.endsWith("/sketch-editor")
    ) {
      return url.searchParams;
    }
  } catch {
    return null;
  }

  return null;
}

export function editorStateFromImportUrl(input: string): EditorState | null {
  const params = sketchQueryFromImportUrl(input);
  if (!params) {
    return null;
  }
  const query: Record<string, string> = {};
  params.forEach((value, key) => {
    query[key] = value;
  });
  return editorStateFromQuery(query);
}

export function gridToRowsText(grid: string[][]): string {
  return grid.map((row) => row.join("")).join("\n");
}

export function defaultEditorState(): EditorState {
  const grid = [
    ["a", "b", "a", "b", "a"],
    [TRANSPARENT_CHAR, "b", TRANSPARENT_CHAR, "b", TRANSPARENT_CHAR],
  ];
  return {
    title: "Rail Pattern",
    subtitle: "",
    grid,
    styleMap: { ...DEFAULT_STYLES },
    planEnabled: false,
    setback: 1,
    maxheight: 25,
    elevationEnabled: false,
    showover: true,
  };
}
