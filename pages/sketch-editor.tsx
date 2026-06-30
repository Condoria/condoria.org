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
  const [editingBrush, setEditingBrush] = useState<string | null>(null);
  const paintRef = useRef(false);
  const paintModeRef = useRef<"paint" | "erase" | null>(null);
  const movedDuringPaintRef = useRef(false);
  const startCellRef = useRef<{ row: number; col: number } | null>(null);

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

  const setCell = useCallback(
    (row: number, col: number, value: CellChar) => {
      setGrid((prev) => {
        if (prev[row][col] === value) {
          return prev;
        }
        const next = prev.map((r) => [...r]);
        next[row][col] = value;
        syncRowsTextFromGrid(next);
        return next;
      });
    },
    [syncRowsTextFromGrid],
  );

  const clearCell = useCallback(
    (row: number, col: number) => {
      setCell(row, col, TRANSPARENT_CHAR);
    },
    [setCell],
  );

  const paintCellForce = useCallback(
    (row: number, col: number) => {
      setCell(row, col, brush);
    },
    [brush, setCell],
  );

  const toggleCell = useCallback(
    (row: number, col: number) => {
      setGrid((prev) => {
        const nextChar = prev[row][col] === brush ? TRANSPARENT_CHAR : brush;
        if (prev[row][col] === nextChar) {
          return prev;
        }
        const next = prev.map((r) => [...r]);
        next[row][col] = nextChar;
        syncRowsTextFromGrid(next);
        return next;
      });
    },
    [brush, syncRowsTextFromGrid],
  );

  const applyRowsText = useCallback(() => {
    const parsed = parseRowsText(rowsText);
    setGrid(parsed);
    setRowsText(gridToRowsText(parsed));
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
    setEditingBrush(key);
  }, [styleMap]);

  const closeBrushEditor = useCallback(() => {
    setEditingBrush(null);
  }, []);

  const removeStyle = useCallback((key: string) => {
    setStyleMap((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setBrush((current) => (current === key ? TRANSPARENT_CHAR : current));
    setEditingBrush((current) => (current === key ? null : current));
  }, []);

  const selectEraser = useCallback(() => {
    setBrush(TRANSPARENT_CHAR);
    setEditingBrush(null);
  }, []);

  const handleBrushClick = useCallback(
    (key: string) => {
      if (brush === key) {
        setEditingBrush((current) => (current === key ? null : key));
        return;
      }
      setBrush(key);
      setEditingBrush(null);
    },
    [brush],
  );

  useEffect(() => {
    if (!editingBrush) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeBrushEditor();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editingBrush, closeBrushEditor]);

  useEffect(() => {
    const stopPainting = () => {
      if (
        paintRef.current &&
        !movedDuringPaintRef.current &&
        paintModeRef.current === "paint" &&
        startCellRef.current
      ) {
        const { row, col } = startCellRef.current;
        toggleCell(row, col);
      }
      paintRef.current = false;
      paintModeRef.current = null;
      movedDuringPaintRef.current = false;
      startCellRef.current = null;
    };
    window.addEventListener("mouseup", stopPainting);
    return () => window.removeEventListener("mouseup", stopPainting);
  }, [toggleCell]);

  const handleGenerate = () => {
    setPreviewUrl(draftUrl);
    setPreviewKey((k) => k + 1);
    setCopied(false);
  };

  const handleCopy = async () => {
    const absolute = typeof window !== "undefined" ? `${window.location.origin}${draftUrl}` : draftUrl;
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
  };

  const beginPaint = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    setEditingBrush(null);

    if (e.button === 2) {
      paintModeRef.current = "erase";
      paintRef.current = true;
      movedDuringPaintRef.current = false;
      startCellRef.current = { row, col };
      clearCell(row, col);
      return;
    }

    if (e.button !== 0) {
      return;
    }

    paintModeRef.current = "paint";
    paintRef.current = true;
    movedDuringPaintRef.current = false;
    startCellRef.current = { row, col };
  };

  const continuePaint = (row: number, col: number) => {
    if (!paintRef.current || !paintModeRef.current) {
      return;
    }

    if (paintModeRef.current === "erase") {
      movedDuringPaintRef.current = true;
      clearCell(row, col);
      return;
    }

    if (!movedDuringPaintRef.current && startCellRef.current) {
      movedDuringPaintRef.current = true;
      const { row: startRow, col: startCol } = startCellRef.current;
      paintCellForce(startRow, startCol);
    }
    paintCellForce(row, col);
  };

  const cellStyle = (char: CellChar): React.CSSProperties => {
    if (char === TRANSPARENT_CHAR) {
      return {
        background: "transparent",
        boxShadow: "inset 0 0 0 1px #d8d0c4",
      };
    }
    const style = styleMap[char];
    if (!style) {
      return { background: "#fff", boxShadow: "inset 0 0 0 1px #ccc" };
    }
    return {
      background: style.fill,
      boxShadow: `inset 0 0 0 2px ${style.stroke}`,
      opacity: style.opacity,
    };
  };

  const activeBrushStyle = brush === TRANSPARENT_CHAR ? null : styleMap[brush] ?? null;

  return (
    <>
      <Head>
        <title>Sketch Editor · Condoria</title>
      </Head>
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>Zoning Sketch Editor</h1>
          <p>
            Select a brush to paint. Click a selected brush again to edit it. Right-click or drag on
            the canvas to erase.
          </p>
        </header>

        <div className={styles.workspace}>
          <div className={styles.row1}>
            <section className={`${styles.panel} ${styles.paintPanel}`} aria-label="Paint canvas">
              <div className={styles.paintToolbar}>
                <div className={styles.paintToolbarTitle}>
                  <h2>Canvas</h2>
                  <div className={styles.activeBrushChip} aria-label="Active brush">
                    {brush === TRANSPARENT_CHAR ? (
                      <>
                        <span className={styles.chipSwatchEraser} aria-hidden />
                        <span>Eraser</span>
                      </>
                    ) : activeBrushStyle ? (
                      <>
                        <span
                          className={styles.chipSwatch}
                          style={{
                            background: activeBrushStyle.fill,
                            borderColor: activeBrushStyle.stroke,
                            opacity: activeBrushStyle.opacity,
                          }}
                          aria-hidden
                        />
                        <span>
                          {brush} · {activeBrushStyle.label}
                        </span>
                      </>
                    ) : (
                      <span>{brush}</span>
                    )}
                  </div>
                </div>
                <div className={styles.row2}>
                  <div className={styles.fieldCompact}>
                    <label htmlFor="grid-rows">Rows</label>
                    <input
                      id="grid-rows"
                      type="number"
                      min={1}
                      value={gridRows}
                      onChange={(e) => resizeGrid(Number(e.target.value) || 1, gridCols)}
                    />
                  </div>
                  <div className={styles.fieldCompact}>
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
              </div>

              <div
                className={styles.paintCanvas}
                onMouseLeave={() => {
                  paintRef.current = false;
                  paintModeRef.current = null;
                }}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div
                  className={styles.gridEditor}
                  style={{ gridTemplateColumns: `repeat(${gridCols}, 32px)` }}
                  role="presentation"
                >
                  {grid.map((row, r) =>
                    row.map((char, c) => (
                      <div
                        key={`${r}-${c}`}
                        className={styles.gridCell}
                        style={cellStyle(char)}
                        onMouseDown={(e) => beginPaint(e, r, c)}
                        onMouseEnter={() => continuePaint(r, c)}
                        aria-label={
                          char === TRANSPARENT_CHAR
                            ? `empty cell ${r + 1},${c + 1}`
                            : `${styleMap[char]?.label ?? char} ${r + 1},${c + 1}`
                        }
                      />
                    )),
                  )}
                </div>
              </div>
            </section>

            <section className={`${styles.panel} ${styles.brushPanel}`} aria-label="Brush menu">
              <h2>Brushes</h2>
              <p className={styles.hint}>Click to select · click again to edit</p>

              <div className={styles.brushRow}>
                <button
                  type="button"
                  className={brush === TRANSPARENT_CHAR ? styles.brushActive : styles.brush}
                  onClick={selectEraser}
                  title="Eraser — left-click or drag to clear cells"
                >
                  <span className={styles.brushSwatchEraser} aria-hidden />
                  <span className={styles.brushKey}>{TRANSPARENT_CHAR}</span>
                  <span className={styles.brushLabel}>eraser</span>
                </button>
                {Object.entries(styleMap)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, style]) => {
                    const isSelected = brush === key;
                    const isEditing = editingBrush === key;
                    const brushClass = isEditing
                      ? styles.brushEditing
                      : isSelected
                        ? styles.brushActive
                        : styles.brush;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={brushClass}
                        onClick={() => handleBrushClick(key)}
                        title={
                          isSelected
                            ? `${style.label} — click again to ${isEditing ? "close" : "edit"}`
                            : style.label
                        }
                        aria-pressed={isSelected}
                        aria-expanded={isEditing}
                      >
                        <span
                          className={styles.brushSwatch}
                          style={{ background: style.fill, borderColor: style.stroke, opacity: style.opacity }}
                          aria-hidden
                        />
                        <span className={styles.brushKey}>{key}</span>
                        <span className={styles.brushLabel}>{style.label}</span>
                      </button>
                    );
                  })}
              </div>
              <button type="button" className={styles.buttonSecondary} onClick={addStyle}>
                + Add brush
              </button>
            </section>
          </div>

          <section className={`${styles.panel} ${styles.outputPanel}`}>
            <h2>Generate &amp; preview</h2>

            <div className={styles.row2}>
              <div className={styles.field}>
                <label htmlFor="title">Title</label>
                <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label htmlFor="subtitle">Subtitle (optional)</label>
                <input id="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </div>
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

            <div className={styles.featuresRow}>
              <div className={styles.featureGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={planEnabled}
                    onChange={(e) => setPlanEnabled(e.target.checked)}
                  />
                  Plan overlay
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
                        <label>Max height label</label>
                        <input type="number" min={1} value={maxheight} onChange={(e) => setMaxheight(Number(e.target.value) || 1)} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.featureGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={elevationEnabled}
                    onChange={(e) => setElevationEnabled(e.target.checked)}
                  />
                  Elevation column
                </label>
                {elevationEnabled && (
                  <div className={styles.featureBlock}>
                    <div className={styles.field}>
                      <label>Max height</label>
                      <input type="number" min={1} value={maxheight} onChange={(e) => setMaxheight(Number(e.target.value) || 1)} />
                    </div>
                    <label className={styles.checkbox}>
                      <input type="checkbox" checked={showover} onChange={(e) => setShowover(e.target.checked)} />
                      Over-limit block (red, 50%)
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.button} onClick={handleGenerate}>
                Generate
              </button>
              <button type="button" className={styles.buttonSecondary} onClick={handleCopy}>
                {copied ? "Copied!" : "Copy URL"}
              </button>
            </div>

            <div className={styles.urlBox}>{draftUrl}</div>
            <div className={styles.previewFrame}>
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={previewKey}
                  src={`${previewUrl}&_=${previewKey}`}
                  alt="Generated sketch"
                  draggable={false}
                />
              ) : (
                <span className={styles.placeholder}>Click Generate to render the API result</span>
              )}
            </div>
          </section>
        </div>

        {editingBrush && styleMap[editingBrush] && (
          <div
            className={styles.overlayBackdrop}
            onClick={closeBrushEditor}
            role="presentation"
          >
            <div
              className={styles.overlayPanel}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="brush-editor-title"
            >
              <div className={styles.overlayHeader}>
                <h3 id="brush-editor-title">Edit brush &ldquo;{editingBrush}&rdquo;</h3>
                <button
                  type="button"
                  className={styles.overlayClose}
                  onClick={closeBrushEditor}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className={styles.overlayHint}>Esc to close · changes apply immediately</p>

              <div className={styles.overlayPreview}>
                <span
                  className={styles.overlayPreviewSwatch}
                  style={{
                    background: styleMap[editingBrush].fill,
                    borderColor: styleMap[editingBrush].stroke,
                    opacity: styleMap[editingBrush].opacity,
                  }}
                />
                <span className={styles.overlayPreviewLabel}>{styleMap[editingBrush].label}</span>
              </div>

              <div className={styles.colorField}>
                <label htmlFor={`fill-${editingBrush}`}>Fill</label>
                <div className={styles.colorControl}>
                  <span
                    className={styles.colorPreview}
                    style={{ background: styleMap[editingBrush].fill }}
                    aria-hidden
                  />
                  <input
                    id={`fill-${editingBrush}`}
                    className={styles.colorInput}
                    type="color"
                    value={styleMap[editingBrush].fill}
                    onChange={(e) => updateStyle(editingBrush, { fill: e.target.value })}
                  />
                  <code className={styles.colorHex}>{styleMap[editingBrush].fill}</code>
                </div>
              </div>

              <div className={styles.colorField}>
                <label htmlFor={`stroke-${editingBrush}`}>Border</label>
                <div className={styles.colorControl}>
                  <span
                    className={styles.colorPreview}
                    style={{ background: styleMap[editingBrush].stroke }}
                    aria-hidden
                  />
                  <input
                    id={`stroke-${editingBrush}`}
                    className={styles.colorInput}
                    type="color"
                    value={styleMap[editingBrush].stroke}
                    onChange={(e) => updateStyle(editingBrush, { stroke: e.target.value })}
                  />
                  <code className={styles.colorHex}>{styleMap[editingBrush].stroke}</code>
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor={`opacity-${editingBrush}`}>
                  Opacity ({styleMap[editingBrush].opacity})
                </label>
                <input
                  id={`opacity-${editingBrush}`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={styleMap[editingBrush].opacity}
                  onChange={(e) => updateStyle(editingBrush, { opacity: Number(e.target.value) })}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor={`label-${editingBrush}`}>Legend label</label>
                <input
                  id={`label-${editingBrush}`}
                  value={styleMap[editingBrush].label}
                  onChange={(e) => updateStyle(editingBrush, { label: e.target.value })}
                />
              </div>

              <div className={styles.overlayActions}>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => removeStyle(editingBrush)}
                >
                  Remove brush
                </button>
                <button type="button" className={styles.button} onClick={closeBrushEditor}>
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
