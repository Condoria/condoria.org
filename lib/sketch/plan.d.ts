export function getEffectivePlanSize(
  planWidth: number,
  planDepth: number,
  gridCols: number,
  gridRows: number,
): { width: number; depth: number };

export function maxSetbackForPlot(plotWidth: number, plotDepth: number): number;

export function validatePlanSetback(
  setback: number,
  plotWidth: number,
  plotDepth: number,
): string | null;

export function isPlotLimitedCell(
  row: number,
  col: number,
  plan: { enabled: boolean; width: number; depth: number; setback: number },
  gridCols: number,
  gridRows: number,
): boolean;
