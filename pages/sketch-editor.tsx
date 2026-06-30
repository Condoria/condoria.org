import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_STYLES,
  TRANSPARENT_CHAR,
  serializeStylesParam,
  type CellStyleMap,
} from "@/lib/sketch/editor-types";
import styles from "@/styles/sketch-editor.module.css";

type CellChar = string;

function createEmptyGrid(rows: number, cols: number, fill: CellChar = TRANSPARENT_CHAR) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function gridToRowsText(grid: CellChar[][]) {
  return grid.map((row) => row.join("")).join("\n");
}

function parseRowsText(text: string): CellChar[][] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ""))
    .filter(Boolean);
  if (lines.length === 0) {
    return createEmptyGrid(2, 5);
  }
  const cols = Math.max(...lines.map((line) => line.length));
  return lines.map((line) => line.padEnd(cols, TRANSPARENT_CHAR).split(""));
}

function gridToRowsParam(grid: CellChar[][]) {
  return grid.map((row) => row.join("")).join("|");
}

function buildSketchUrl(params: {
  title: string;
  subtitle: string;
  grid: CellChar[][];
  styleMap: CellStyleMap;
  planEnabled: boolean;
  width: number;
  depth: number;
  setback: number;
  maxheight: number;
  elevationEnabled: boolean;
  showover: boolean;
}) {
  const search = new URLSearchParams();
  search.set("title", params.title || "Zoning Regulation");
  search.set("rows", gridToRowsParam(params.grid));
  search.set("styles", serializeStylesParam(params.styleMap));

  if (params.subtitle.trim()) {
    search.set("subtitle", params.subtitle.trim());
  }
  if (params.planEnabled) {
    search.set("plan", "1");
    search.set("width", String(params.width));
    search.set("depth", String(params.depth));
    search.set("setback", String(params.setback));
    search.set("maxheight", String(params.maxheight));
  }
  if (params.elevationEnabled) {
    search.set("elevation", "1");
    search.set("maxheight", String(params.maxheight));
    search.set("showover", params.showover ? "1" : "0");
  }

  return `/api/render-sketch?${search.toString()}`;
}

function nextStyleKey(styleMap: CellStyleMap) {
  for (let code = 97; code <= 122; code++) {
    const key = String.fromCharCode(code);
    if (!styleMap[key]) {
      return key;
    }
  }
  return "z";
}

export default function SketchEditorPage() {
  const [title, setTitle] = useState("Rail Pattern");
  const [subtitle, setSubtitle] = useState("");
  const [styleMap, setStyleMap] = useState<CellStyleMap>(() => ({ ...DEFAULT_STYLES }));
  const [brush, setBrush] = useState<CellChar>("a");
  const [grid, setGrid] = useState<CellChar[][]>(() => [
    ["a", "b", "a", "b", "a"],
    [TRANSPARENT_CHAR, "b", TRANSPARENT_CHAR, "b", TRANSPARENT_CHAR],
  ]);
  const [rowsText, setRowsText] = useState("ababa\n-b-b-");
  const [planEnabled, setPlanEnabled] = useState(false);
  const [elevationEnabled, setElevationEnabled] = useState(false);
  const [width, setWidth] = useState(16);
  const [depth, setDepth] = useState(16);
  const [setback, setSetback] = useState(3);
  const [maxheight, setMaxheight] = useState(25);
  const [showover, setShowover] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const paintRef = useRef(false);

  const gridRows = grid.length;
  const gridCols = grid[0]?.length ?? 1;

  const draftUrl = useMemo(
    () =>
      buildSketchUrl({
        title,
        subtitle,
        grid,
        styleMap,
        planEnabled,
        width,
        depth,
        setback,
        maxheight,
        elevationEnabled,
        showover,
      }),
    [
      title,
      subtitle,
      grid,
      styleMap,
      planEnabled,
      width,
      depth,
      setback,
      maxheight,
      elevationEnabled,
      showover,
    ],
  );

  const syncRowsTextFromGrid = useCallback((nextGrid: CellChar[][]) => {
    setRowsText(gridToRowsText(nextGrid));
  }, []);

  const resizeGrid = useCallback(
    (rows: number, cols: number) => {
      setGrid((prev) => {
        const next = createEmptyGrid(rows, cols);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            next[r][c] = prev[r]?.[c] ?? TRANSPARENT_CHAR;
          }
        }
        syncRowsTextFromGrid(next);
        return next;
      });
    },
    [syncRowsTextFromGrid],
  );

  const paintCell = useCallback((row: number, col: number) => {
    setGrid((prev) => {
      if (prev[row][col] === brush) {
        return prev;
      }
      const next = prev.map((r) => [...r]);
      next[row][col] = brush;
      syncRowsTextFromGrid(next);
      return next;
    });
  }, [brush, syncRowsTextFromGrid]);

  const applyRowsText = useCallback(() => {
    const parsed = parseRowsText(rowsText);
    setGrid(parsed);
  }, [rowsText]);

  const updateStyle = useCallback((key: string, patch: Partial<CellStyleMap[string]>) => {
    setStyleMap((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }, []);

  const addStyle = useCallback(() => {
    const key = nextStyleKey(styleMap);
    setStyleMap((prev) => ({
      ...prev,
      [key]: {
        fill: "#7c9ab8",
        stroke: "#4a6278",
        opacity: 1,
        label: `style ${key}`,
      },
    }));
    setBrush(key);
  }, [styleMap]);

  const removeStyle = useCallback((key: string) => {
    setStyleMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setBrush((current) => (current === key ? TRANSPARENT_CHAR : current));
  }, []);

  useEffect(() => {
    const stopPainting = () => {
      paintRef.current = false;
      setIsPainting(false);
    };
    window.addEventListener("mouseup", stopPainting);
    return () => window.removeEventListener("mouseup", stopPainting);
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

  const cellStyle = (char: CellChar) => {
    if (char === TRANSPARENT_CHAR) {
      return {
        background: "transparent",
        border: "1px dashed #ccc",
        color: "#aaa",
      };
    }
    const style = styleMap[char];
    if (!style) {
      return { background: "#fff", border: "1px solid #ccc", color: "#999" };
    }
    return {
      background: style.fill,
      border: `2px solid ${style.stroke}`,
      color: "#fff",
      opacity: style.opacity,
    };
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
            Paint a grid with custom styles, optional plan setback overlay, and optional height
            column. Top row in the text input matches the top row in the preview.
          </p>
        </header>

        <div className={styles.layout}>
          <section className={styles.panel}>
            <h2>Styles &amp; brush</h2>

            <div className={styles.brushRow}>
              <button
                type="button"
                className={brush === TRANSPARENT_CHAR ? styles.brushActive : styles.brush}
                onClick={() => setBrush(TRANSPARENT_CHAR)}
                title="Transparent eraser"
              >
                <span className={styles.brushSwatchEraser} />
                {TRANSPARENT_CHAR} eraser
              </button>
              {Object.entries(styleMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, style]) => (
                  <button
                    key={key}
                    type="button"
                    className={brush === key ? styles.brushActive : styles.brush}
                    onClick={() => setBrush(key)}
                    title={style.label}
                  >
                    <span
                      className={styles.brushSwatch}
                      style={{ background: style.fill, borderColor: style.stroke, opacity: style.opacity }}
                    />
                    {key}
                  </button>
                ))}
            </div>

            <div className={styles.styleList}>
              {Object.entries(styleMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, style]) => (
                  <div key={key} className={styles.styleCard}>
                    <div className={styles.styleCardHeader}>
                      <strong>{key}</strong>
                      <button type="button" className={styles.linkButton} onClick={() => removeStyle(key)}>
                        remove
                      </button>
                    </div>
                    <div className={styles.row2}>
                      <div className={styles.field}>
                        <label>Fill</label>
                        <input
                          type="color"
                          value={style.fill}
                          onChange={(e) => updateStyle(key, { fill: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Border</label>
                        <input
                          type="color"
                          value={style.stroke}
                          onChange={(e) => updateStyle(key, { stroke: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className={styles.field}>
                      <label>Opacity ({style.opacity})</label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={style.opacity}
                        onChange={(e) => updateStyle(key, { opacity: Number(e.target.value) })}
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Legend label</label>
                      <input
                        value={style.label}
                        onChange={(e) => updateStyle(key, { label: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
            </div>
            <button type="button" className={styles.buttonSecondary} onClick={addStyle}>
              + Add style
            </button>

            <h2 className={styles.sectionGap}>Grid</h2>
            <div className={styles.field}>
              <label htmlFor="title">Title</label>
              <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="subtitle">Subtitle (optional)</label>
              <input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
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

            <p className={styles.hint}>Paint with the brush — click or drag across cells.</p>
            <div
              className={styles.gridEditor}
              style={{ gridTemplateColumns: `repeat(${gridCols}, 30px)` }}
              onMouseLeave={() => {
                paintRef.current = false;
                setIsPainting(false);
              }}
            >
              {grid.map((row, r) =>
                row.map((char, c) => (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    className={styles.gridCellBtn}
                    style={cellStyle(char)}
                    onMouseDown={() => {
                      paintRef.current = true;
                      setIsPainting(true);
                      paintCell(r, c);
                    }}
                    onMouseEnter={() => {
                      if (paintRef.current || isPainting) {
                        paintCell(r, c);
                      }
                    }}
                    title={char === TRANSPARENT_CHAR ? "empty" : styleMap[char]?.label ?? char}
                  >
                    {char === TRANSPARENT_CHAR ? "" : char}
                  </button>
                )),
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="rows-text">Rows text (top line = top row)</label>
              <textarea
                id="rows-text"
                value={rowsText}
                onChange={(e) => setRowsText(e.target.value)}
                placeholder={"ababa\n-b-b-"}
              />
              <button type="button" className={styles.buttonSecondary} onClick={applyRowsText}>
                Apply rows text
              </button>
            </div>

            <h2 className={styles.sectionGap}>Features</h2>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={planEnabled}
                onChange={(e) => setPlanEnabled(e.target.checked)}
              />
              Plan overlay (setback &amp; buildable zone)
            </label>
            {planEnabled && (
              <div className={styles.featureBlock}>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label>Width</label>
                    <input type="number" min={1} value={width} onChange={(e) => setWidth(Number(e.target.value) || 1)} />
                  </div>
                  <div className={styles.field}>
                    <label>Depth</label>
                    <input type="number" min={1} value={depth} onChange={(e) => setDepth(Number(e.target.value) || 1)} />
                  </div>
                </div>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label>Setback</label>
                    <input type="number" min={0} value={setback} onChange={(e) => setSetback(Number(e.target.value) || 0)} />
                  </div>
                  <div className={styles.field}>
                    <label>Max height (label)</label>
                    <input type="number" min={1} value={maxheight} onChange={(e) => setMaxheight(Number(e.target.value) || 1)} />
                  </div>
                </div>
              </div>
            )}

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={elevationEnabled}
                onChange={(e) => setElevationEnabled(e.target.checked)}
              />
              Elevation column (height limit)
            </label>
            {elevationEnabled && (
              <div className={styles.featureBlock}>
                <div className={styles.row2}>
                  <div className={styles.field}>
                    <label>Max height</label>
                    <input type="number" min={1} value={maxheight} onChange={(e) => setMaxheight(Number(e.target.value) || 1)} />
                  </div>
                </div>
                <label className={styles.checkbox}>
                  <input type="checkbox" checked={showover} onChange={(e) => setShowover(e.target.checked)} />
                  Show over-limit block (red, 50% opacity)
                </label>
              </div>
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
                <img key={previewKey} src={`${previewUrl}&_=${previewKey}`} alt="Sketch preview" />
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
