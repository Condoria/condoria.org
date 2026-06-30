import Head from "next/head";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_STYLES,
  TRANSPARENT_CHAR,
  serializeStylesParam,
  type CellStyleMap,
} from "@/lib/sketch/editor-types";
import {
  getEffectivePlanSize,
  maxSetbackForPlot,
  validatePlanSetback,
} from "@/lib/sketch/plan";
import { useSketchPreview } from "@/lib/sketch/use-sketch-preview";
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

function planCellZone(
  row: number,
  col: number,
  rows: number,
  cols: number,
  setback: number,
): "setback" | null {
  if (setback <= 0) {
    return null;
  }
  const onEdge =
    row < setback || row >= rows - setback || col < setback || col >= cols - setback;
  return onEdge ? "setback" : null;
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
  const [setback, setSetback] = useState(1);
  const [maxheight, setMaxheight] = useState(25);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingBrush, setEditingBrush] = useState<string | null>(null);
  const paintRef = useRef(false);
  const paintModeRef = useRef<"paint" | "erase" | null>(null);
  const movedDuringPaintRef = useRef(false);
  const startCellRef = useRef<{ row: number; col: number } | null>(null);

  const gridRows = grid.length;
  const gridCols = grid[0]?.length ?? 1;
  const plotWidth = gridCols;
  const plotDepth = gridRows;
  const maxSetback = maxSetbackForPlot(plotWidth, plotDepth);

  const effectivePlan = useMemo(
    () => getEffectivePlanSize(plotWidth, plotDepth, gridCols, gridRows),
    [plotWidth, plotDepth, gridCols, gridRows],
  );

  const planError = useMemo(() => {
    if (!planEnabled) {
      return null;
    }
    return validatePlanSetback(setback, effectivePlan.width, effectivePlan.depth);
  }, [planEnabled, setback, effectivePlan.width, effectivePlan.depth]);

  useEffect(() => {
    if (!planEnabled) {
      return;
    }
    setSetback((current) => Math.min(current, maxSetbackForPlot(gridCols, gridRows)));
  }, [planEnabled, gridCols, gridRows]);

  const draftUrl = useMemo(
    () =>
      buildSketchUrl({
        title,
        subtitle,
        grid,
        styleMap,
        planEnabled,
        width: plotWidth,
        depth: plotDepth,
        setback,
        maxheight,
        elevationEnabled,
        showover: true,
      }),
    [
      title,
      subtitle,
      grid,
      styleMap,
      planEnabled,
      plotWidth,
      plotDepth,
      setback,
      maxheight,
      elevationEnabled,
    ],
  );

  const previewEnabled = !planError;
  const preview = useSketchPreview(draftUrl, previewEnabled);
  const elevationDisplayRows = elevationEnabled ? maxheight + 1 : 0;

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

  const handleCopy = async () => {
    if (preview.status !== "ready") {
      return;
    }
    const absolute = typeof window !== "undefined" ? `${window.location.origin}${draftUrl}` : draftUrl;
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
  };

  const handleSetbackChange = (next: number) => {
    setSetback(Math.max(0, Math.min(maxSetback, next)));
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

  const cellStyle = (char: CellChar, zone: "setback" | null): React.CSSProperties => {
    let base: React.CSSProperties;
    if (char === TRANSPARENT_CHAR) {
      base = {
        background: "transparent",
        boxShadow: "inset 0 0 0 1px #d8d0c4",
      };
    } else {
      const style = styleMap[char];
      if (!style) {
        base = { background: "#fff", boxShadow: "inset 0 0 0 1px #ccc" };
      } else {
        base = {
          background: style.fill,
          boxShadow: `inset 0 0 0 2px ${style.stroke}`,
          opacity: style.opacity,
        };
      }
    }

    if (zone === "setback") {
      return {
        ...base,
        background: `linear-gradient(rgba(253, 236, 234, 0.72), rgba(253, 236, 234, 0.72)), ${base.background ?? "transparent"}`,
        boxShadow: `${base.boxShadow ?? ""}, inset 0 0 0 1px #e8b4b0`,
      };
    }
    return base;
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
                    <label htmlFor="grid-rows">Rows (blocks)</label>
                    <input
                      id="grid-rows"
                      type="number"
                      min={1}
                      value={gridRows}
                      onChange={(e) => resizeGrid(Number(e.target.value) || 1, gridCols)}
                    />
                  </div>
                  <div className={styles.fieldCompact}>
                    <label htmlFor="grid-cols">Columns (blocks)</label>
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

              <div className={styles.regulationBar}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={planEnabled}
                    onChange={(e) => setPlanEnabled(e.target.checked)}
                  />
                  Plot limits
                </label>
                {planEnabled && (
                  <div className={styles.setbackControl}>
                    <label htmlFor="setback-slider">
                      Setback <span className={styles.setbackValue}>{setback} blk</span>
                    </label>
                    <input
                      id="setback-slider"
                      type="range"
                      min={0}
                      max={maxSetback}
                      value={Math.min(setback, maxSetback)}
                      onChange={(e) => handleSetbackChange(Number(e.target.value))}
                      disabled={maxSetback === 0}
                    />
                  </div>
                )}
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={elevationEnabled}
                    onChange={(e) => setElevationEnabled(e.target.checked)}
                  />
                  Height ruler
                </label>
                {(planEnabled || elevationEnabled) && (
                  <div className={styles.fieldCompact}>
                    <label htmlFor="max-height">Max height</label>
                    <input
                      id="max-height"
                      type="number"
                      min={1}
                      max={64}
                      value={maxheight}
                      onChange={(e) => setMaxheight(Number(e.target.value) || 1)}
                    />
                  </div>
                )}
              </div>
              {planEnabled && (
                <p className={styles.regulationSummary}>
                  {plotWidth}×{plotDepth} plot
                  {setback > 0
                    ? ` · ${Math.max(0, plotWidth - setback * 2)}×${Math.max(0, plotDepth - setback * 2)} buildable`
                    : ""}
                  {elevationEnabled ? ` · height ${maxheight}` : ""}
                </p>
              )}

              <div
                className={styles.paintCanvas}
                onMouseLeave={() => {
                  paintRef.current = false;
                  paintModeRef.current = null;
                }}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className={styles.sketchViewport}>
                  <div
                    className={styles.gridEditor}
                    style={{ gridTemplateColumns: `repeat(${gridCols}, 32px)` }}
                    role="presentation"
                  >
                    {grid.map((row, r) =>
                      row.map((char, c) => {
                        const zone = planEnabled
                          ? planCellZone(r, c, gridRows, gridCols, setback)
                          : null;
                        return (
                          <div
                            key={`${r}-${c}`}
                            className={styles.gridCell}
                            style={cellStyle(char, zone)}
                            onMouseDown={(e) => beginPaint(e, r, c)}
                            onMouseEnter={() => continuePaint(r, c)}
                            aria-label={
                              char === TRANSPARENT_CHAR
                                ? `empty cell ${r + 1},${c + 1}`
                                : `${styleMap[char]?.label ?? char} ${r + 1},${c + 1}`
                            }
                          />
                        );
                      }),
                    )}
                  </div>
                  {elevationEnabled && (
                    <div className={styles.elevationRail} aria-label={`Height ruler, max ${maxheight} blocks`}>
                      <span className={styles.elevationLabel}>height</span>
                      <div
                        className={styles.elevationStack}
                        style={{ gridTemplateRows: `repeat(${elevationDisplayRows}, 10px)` }}
                      >
                        <div className={styles.elevationCellOver} title="Not allowed above max height" />
                        {Array.from({ length: maxheight }, (_, i) => (
                          <div
                            key={maxheight - i}
                            className={styles.elevationCell}
                            title={`Block ${maxheight - i}`}
                          />
                        ))}
                      </div>
                      <span className={styles.elevationMaxLabel}>max {maxheight}</span>
                    </div>
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
            <h2>Export preview</h2>
            <p className={styles.fieldHint}>
              Preview updates automatically. One canvas cell equals one Minecraft block.
            </p>

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

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={handleCopy}
                disabled={preview.status !== "ready"}
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
              <span className={styles.previewStatus} data-status={preview.status}>
                {preview.status === "loading" && "Updating preview…"}
                {preview.status === "ready" && "Preview ready"}
                {preview.status === "error" && "Preview failed"}
                {preview.status === "idle" && "Waiting for valid settings"}
              </span>
            </div>

            <div className={styles.urlBox}>{draftUrl}</div>

            <div className={styles.previewFrame}>
              {planError ? (
                <div className={styles.previewErrorCard} role="alert">
                  <strong>Cannot render</strong>
                  <p>{planError}</p>
                </div>
              ) : preview.status === "error" ? (
                <div className={styles.previewErrorCard} role="alert">
                  <strong>Render failed</strong>
                  <p>{preview.error}</p>
                </div>
              ) : preview.status === "loading" && preview.blobUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.blobUrl}
                    alt=""
                    className={styles.previewDimmed}
                    draggable={false}
                    aria-hidden
                  />
                  <span className={styles.previewLoading}>Updating…</span>
                </>
              ) : preview.status === "loading" ? (
                <span className={styles.placeholder}>Rendering preview…</span>
              ) : preview.blobUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.blobUrl} alt="Generated sketch" draggable={false} />
              ) : (
                <span className={styles.placeholder}>Preview appears here</span>
              )}
            </div>

            <button
              type="button"
              className={styles.advancedToggle}
              onClick={() => setShowAdvanced((open) => !open)}
              aria-expanded={showAdvanced}
            >
              {showAdvanced ? "Hide" : "Show"} advanced · rows text import
            </button>
            {showAdvanced && (
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
            )}
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
