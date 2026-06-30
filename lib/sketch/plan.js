/**
 * Plan overlay dimensions are in Minecraft blocks (plot size).
 * On the sketch they are clipped to whatever grid is being drawn.
 */
function getEffectivePlanSize(planWidth, planDepth, gridCols, gridRows) {
  return {
    width: Math.min(planWidth, gridCols),
    depth: Math.min(planDepth, gridRows),
  };
}

function maxSetbackForPlot(plotWidth, plotDepth) {
  if (plotWidth < 1 || plotDepth < 1) {
    return 0;
  }
  const maxW = Math.floor(plotWidth / 2) - 1;
  const maxD = Math.floor(plotDepth / 2) - 1;
  return Math.max(0, Math.min(maxW, maxD));
}

function validatePlanSetback(setback, plotWidth, plotDepth) {
  if (setback * 2 >= plotWidth) {
    return `Setback (${setback} blocks) must be less than half the plot width on the grid (${plotWidth} blocks).`;
  }
  if (setback * 2 >= plotDepth) {
    return `Setback (${setback} blocks) must be less than half the plot depth on the grid (${plotDepth} blocks).`;
  }
  return null;
}

/** Setback band or outside the clipped plot area on the grid. */
function isPlotLimitedCell(row, col, plan, gridCols, gridRows) {
  if (!plan?.enabled) {
    return false;
  }
  const { width: plotW, depth: plotD } = getEffectivePlanSize(
    plan.width,
    plan.depth,
    gridCols,
    gridRows,
  );
  if (col >= plotW || row >= plotD) {
    return true;
  }
  const { setback } = plan;
  if (setback <= 0) {
    return false;
  }
  return (
    row < setback || row >= plotD - setback || col < setback || col >= plotW - setback
  );
}

module.exports = {
  getEffectivePlanSize,
  maxSetbackForPlot,
  validatePlanSetback,
  isPlotLimitedCell,
};
