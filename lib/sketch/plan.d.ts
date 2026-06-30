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
