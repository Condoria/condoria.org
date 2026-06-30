import Head from "next/head";
import { useCallback, useMemo, useState } from "react";
import styles from "@/styles/sketch-editor.module.css";

type ViewType = "plan" | "elevation" | "grid";
type GridSymbol = "x" | "o" | "-" | ".";

const SYMBOL_CYCLE: GridSymbol[] = [".", "x", "o", "-"];
const SYMBOL_META: Record<GridSymbol, { label: string; className: string }> = {
  ".": { label: "empty", className: styles.gridCellEmpty },
  x: { label: "wooden slab", className: styles.gridCellWood },
  o: { label: "polished deepslate", className: styles.gridCellStone },
  "-": { label: "rail gap", className: styles.gridCellGap },
};

function createEmptyGrid(rows: number, cols: number, fill: GridSymbol = ".") {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function parseRowsText(text: string, cols: number): GridSymbol[][] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ""))
    .filter(Boolean);
  if (lines.length === 0) {
    return createEmptyGrid(2, cols);
  }
  const width = Math.max(cols, ...lines.map((line) => line.length));
  return lines.map((line) =>
    line
      .padEnd(width, ".")
      .split("")
      .map((ch) => (ch in SYMBOL_META ? (ch as GridSymbol) : ".")),
  );
}

function gridToRowsParam(grid: GridSymbol[][]) {
  return grid.map((row) => row.join("")).join("|");
}

function buildSketchUrl(
  view: ViewType,
  params: {
    title: string;
    subtitle: string;
    width: number;
    depth: number;
    setback: number;
    maxheight: number;
    showover: boolean;
    columns: number;
    grid: GridSymbol[][];
  },
) {
  const search = new URLSearchParams();
  if (view !== "plan") {
    search.set("view", view);
  }
  search.set("title", params.title || "Zoning Regulation");

  if (view === "plan") {
    search.set("width", String(params.width));
    search.set("depth", String(params.depth));
    search.set("setback", String(params.setback));
    search.set("maxheight", String(params.maxheight));
  } else if (view === "elevation") {
    search.set("maxheight", String(params.maxheight));
    search.set("showover", params.showover ? "1" : "0");
    if (params.columns > 1) {
      search.set("columns", String(params.columns));
    }
  } else {
    search.set("rows", gridToRowsParam(params.grid));
    if (params.subtitle.trim()) {
      search.set("subtitle", params.subtitle.trim());
    }
  }

  return `/api/render-sketch?${search.toString()}`;
}

export default function SketchEditorPage() {
  const [view, setView] = useState<ViewType>("plan");
  const [title, setTitle] = useState("Zoning Regulation");
  const [subtitle, setSubtitle] = useState("");
  const [width, setWidth] = useState(16);
  const [depth, setDepth] = useState(16);
  const [setback, setSetback] = useState(3);
  const [maxheight, setMaxheight] = useState(25);
  const [showover, setShowover] = useState(true);
  const [columns, setColumns] = useState(1);
  const [gridCols, setGridCols] = useState(5);
  const [gridRows, setGridRows] = useState(2);
  const [grid, setGrid] = useState<GridSymbol[][]>(() => [
    ["x", "o", "x", "o", "x"],
    ["-", "o", "-", "o", "-"],
  ]);
  const [rowsText, setRowsText] = useState("xoxox\n-o-o-");
  const [brush, setBrush] = useState<GridSymbol>("x");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const params = useMemo(
    () => ({
      title,
      subtitle,
      width,
      depth,
      setback,
      maxheight,
      showover,
      columns,
      grid,
    }),
    [title, subtitle, width, depth, setback, maxheight, showover, columns, grid],
  );

  const draftUrl = useMemo(() => buildSketchUrl(view, params), [view, params]);

  const resizeGrid = useCallback((rows: number, cols: number) => {
    setGridRows(rows);
    setGridCols(cols);
    setGrid((prev) => {
      const next = createEmptyGrid(rows, cols);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          next[r][c] = prev[r]?.[c] ?? ".";
        }
      }
      return next;
    });
  }, []);

  const applyRowsText = useCallback(() => {
    const parsed = parseRowsText(rowsText, gridCols);
    setGrid(parsed);
    setGridRows(parsed.length);
    setGridCols(parsed[0]?.length ?? gridCols);
  }, [rowsText, gridCols]);

  const paintCell = useCallback((row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = brush;
      return next;
    });
  }, [brush]);

  const cycleCell = useCallback((row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      const current = next[row][col];
      const idx = SYMBOL_CYCLE.indexOf(current);
      next[row][col] = SYMBOL_CYCLE[(idx + 1) % SYMBOL_CYCLE.length];
      return next;
    });
  }, []);

  const handlePreview = () => {
    setPreviewUrl(draftUrl);
    setPreviewKey((k) => k + 1);
    setCopied(false);
  };

  const handleCopy = async () => {
    const absolute = typeof window !== "undefined" ? `${window.location.origin}${draftUrl}` : draftUrl;
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
  };

  return (
    <>
      <Head>
        <title>Sketch Editor · Condoria</title>
      </Head>
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>Zoning Sketch Editor</h1>
          <p>
            Design plan grids, height limits, or material patterns client-side. Preview renders the
            live API URL you can embed in docs or regulations.
          </p>
        </header>

        <div className={styles.layout}>
          <section className={styles.panel}>
            <h2>Design</h2>

            <div className={styles.viewTabs}>
              {(["plan", "elevation", "grid"] as ViewType[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={view === v ? styles.viewTabActive : styles.viewTab}
                  onClick={() => setView(v)}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className={styles.field}>
              <label htmlFor="title">Title</label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            {view === "plan" && (
              <>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label htmlFor="width">Width (blocks)</label>
                    <input
                      id="width"
                      type="number"
                      min={1}
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="depth">Depth (blocks)</label>
                    <input
                      id="depth"
                      type="number"
                      min={1}
                      value={depth}
                      onChange={(e) => setDepth(Number(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label htmlFor="setback">Setback</label>
                    <input
                      id="setback"
                      type="number"
                      min={0}
                      value={setback}
                      onChange={(e) => setSetback(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="maxheight-plan">Max height (label)</label>
                    <input
                      id="maxheight-plan"
                      type="number"
                      min={1}
                      value={maxheight}
                      onChange={(e) => setMaxheight(Number(e.target.value) || 1)}
                    />
                  </div>
                </div>
              </>
            )}

            {view === "elevation" && (
              <>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label htmlFor="maxheight-elev">Max height</label>
                    <input
                      id="maxheight-elev"
                      type="number"
                      min={1}
                      value={maxheight}
                      onChange={(e) => setMaxheight(Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="columns">Columns</label>
                    <input
                      id="columns"
                      type="number"
                      min={1}
                      value={columns}
                      onChange={(e) => setColumns(Number(e.target.value) || 1)}
                    />
                  </div>
                </div>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={showover}
                    onChange={(e) => setShowover(e.target.checked)}
                  />
                  Show over-limit block (red, 50% opacity)
                </label>
              </>
            )}

            {view === "grid" && (
              <>
                <div className={styles.field}>
                  <label htmlFor="subtitle">Subtitle (optional)</label>
                  <input
                    id="subtitle"
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Custom legend text"
                  />
                </div>

                <p className={styles.hint}>Brush — click a cell to paint, or double-click to cycle symbols.</p>
                <div className={styles.palette}>
                  {(Object.keys(SYMBOL_META) as GridSymbol[]).map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      className={brush === sym ? styles.swatchActive : styles.swatch}
                      onClick={() => setBrush(sym)}
                    >
                      {sym} · {SYMBOL_META[sym].label}
                    </button>
                  ))}
                </div>

                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label htmlFor="grid-rows">Rows</label>
                    <input
                      id="grid-rows"
                      type="number"
                      min={1}
                      value={gridRows}
                      onChange={(e) => resizeGrid(Number(e.target.value) || 1, gridCols)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="grid-cols">Columns</label>
                    <input
                      id="grid-cols"
                      type="number"
                      min={1}
                      value={gridCols}
                      onChange={(e) => resizeGrid(gridRows, Number(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div
                  className={styles.gridEditor}
                  style={{ gridTemplateColumns: `repeat(${gridCols}, 28px)` }}
                >
                  {grid.map((row, r) =>
                    row.map((sym, c) => (
                      <button
                        key={`${r}-${c}`}
                        type="button"
                        className={SYMBOL_META[sym].className}
                        onClick={() => paintCell(r, c)}
                        onDoubleClick={() => cycleCell(r, c)}
                        title={SYMBOL_META[sym].label}
                      >
                        {sym === "." ? "" : sym}
                      </button>
                    )),
                  )}
                </div>

                <div className={styles.field}>
                  <label htmlFor="rows-text">Rows text (alternate input)</label>
                  <textarea
                    id="rows-text"
                    value={rowsText}
                    onChange={(e) => setRowsText(e.target.value)}
                    placeholder={"xoxox\n-o-o-"}
                  />
                  <button type="button" className={styles.buttonSecondary} onClick={applyRowsText}>
                    Apply rows text
                  </button>
                </div>
              </>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.button} onClick={handlePreview}>
                Preview
              </button>
              <button type="button" className={styles.buttonSecondary} onClick={handleCopy}>
                {copied ? "Copied!" : "Copy URL"}
              </button>
            </div>
          </section>

          <section className={styles.panel}>
            <h2>Preview</h2>
            <div className={styles.urlBox}>{draftUrl}</div>
            <div className={styles.previewFrame}>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={previewKey}
                  src={`${previewUrl}&_=${previewKey}`}
                  alt="Sketch preview"
                />
              ) : (
                <span className={styles.placeholder}>Click Preview to render the API result</span>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
