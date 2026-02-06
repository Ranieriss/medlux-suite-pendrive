const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const svgLineChart = (points, options = {}) => {
  const safePoints = (points || [])
    .filter((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y));

  if (!safePoints.length) {
    return '<svg viewBox="0 0 100 40" role="img" aria-label="Sem dados"><text x="50" y="20" text-anchor="middle" font-size="10" fill="#666">Sem dados</text></svg>';
  }

  const maxX = Math.max(...safePoints.map((p) => p.x));
  const maxY = Math.max(...safePoints.map((p) => p.y));
  const minX = Math.min(...safePoints.map((p) => p.x));
  const minY = Math.min(...safePoints.map((p) => p.y));

  const width = options.width || 320;
  const height = options.height || 120;
  const padding = options.padding || 16;

  const scaleX = (value) => {
    if (maxX === minX) return padding;
    return padding + ((value - minX) / (maxX - minX)) * (width - padding * 2);
  };

  const scaleY = (value) => {
    if (maxY === minY) return height - padding;
    return height - padding - ((value - minY) / (maxY - minY)) * (height - padding * 2);
  };

  const path = safePoints
    .map((point, index) => {
      const x = scaleX(point.x);
      const y = scaleY(point.y);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const circles = safePoints
    .map((point) => {
      const cx = scaleX(point.x);
      const cy = scaleY(point.y);
      return `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="3" fill="#2c7be5" />`;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução">
      <path d="${path}" fill="none" stroke="#2c7be5" stroke-width="2" />
      ${circles}
    </svg>
  `;
};

window.$ = $;
window.$$ = $$;
window.svgLineChart = svgLineChart;
