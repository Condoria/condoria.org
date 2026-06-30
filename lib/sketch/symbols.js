/** Material symbols for grid view (rails, slabs, etc.). */
const CELL_SYMBOLS = {
  x: { fill: "#a67c52", stroke: "#6b4f2a", label: "wooden slab" },
  o: { fill: "#4a5568", stroke: "#2d3748", label: "polished deepslate" },
  "-": { fill: "#faf8f5", stroke: "#888888", dashed: true, label: "rail gap" },
  ".": { fill: "#faf8f5", stroke: "#dddddd", label: "empty" },
};

function getCellSymbol(char) {
  const key = char in CELL_SYMBOLS ? char : ".";
  return CELL_SYMBOLS[key];
}

function legendForRows(rows) {
  const used = new Set(rows.flatMap((row) => [...row]));
  return [...used]
    .filter((char) => char !== "." && CELL_SYMBOLS[char])
    .map((char) => `${char} = ${CELL_SYMBOLS[char].label}`);
}

module.exports = { CELL_SYMBOLS, getCellSymbol, legendForRows };
