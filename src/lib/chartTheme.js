import { formatINR, formatINRCompact, formatNumber } from "./format";

export const chartColors = {
  surface: "#ffffff",
  series: "#2563eb",
  seriesWash: "rgba(37, 99, 235, 0.10)",
  grid: "#e5e5e5",
  axis: "#d4d4d4",
  muted: "#737373",
  secondary: "#525252",
  primary: "#171717",
};

const FONT = "'Inter', ui-sans-serif, system-ui, sans-serif";

const tooltip = (formatValue) => ({
  backgroundColor: chartColors.surface,
  titleColor: chartColors.primary,
  bodyColor: chartColors.secondary,
  borderColor: chartColors.grid,
  borderWidth: 1,
  cornerRadius: 8,
  padding: 12,
  displayColors: false,
  titleFont: { family: FONT, size: 12, weight: "600" },
  bodyFont: { family: FONT, size: 12 },
  callbacks: {
    label: (ctx) => formatValue(ctx.parsed.y ?? ctx.parsed.x),
  },
});

const tickFont = { family: FONT, size: 11 };

// Vertical hairline under the hovered point — the crosshair Chart.js has no built-in for.
export const crosshairPlugin = {
  id: "crosshair",
  beforeDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (!active.length) return;
    const { ctx, chartArea } = chart;
    const x = active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = chartColors.axis;
    ctx.stroke();
    ctx.restore();
  },
};

// Selective direct labels: the value at each bar's tip.
export const barValueLabels = {
  id: "barValueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;
    ctx.save();
    ctx.font = `500 11px ${FONT}`;
    ctx.fillStyle = chartColors.secondary;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    meta.data.forEach((bar, i) => {
      const value = chart.data.datasets[0].data[i];
      ctx.fillText(formatNumber(value), bar.x + 8, bar.y);
    });
    ctx.restore();
  },
};

// Selective direct label: the value at the end of the line.
export const lineEndLabel = {
  id: "lineEndLabel",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const points = meta?.data ?? [];
    if (points.length < 2) return;
    const last = points[points.length - 1];
    const value = chart.data.datasets[0].data[points.length - 1];
    ctx.save();
    ctx.font = `600 11px ${FONT}`;
    ctx.fillStyle = chartColors.primary;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(formatINRCompact(value), last.x, last.y - 10);
    ctx.restore();
  },
};

export const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  // Off by design: a filter change should repaint instantly, not replay a grow-in.
  animation: false,
  layout: { padding: { top: 24, right: 8 } },
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: tooltip(formatINR),
  },
  elements: {
    line: { borderWidth: 2, borderColor: chartColors.series, tension: 0.3 },
    point: {
      radius: 4,
      hoverRadius: 5,
      backgroundColor: chartColors.series,
      borderColor: chartColors.surface,
      borderWidth: 2,
      hitRadius: 12,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { color: chartColors.axis },
      ticks: { color: chartColors.muted, font: tickFont, maxRotation: 0, autoSkipPadding: 16 },
    },
    y: {
      beginAtZero: true,
      grid: { color: chartColors.grid, drawTicks: false },
      border: { display: false },
      ticks: {
        color: chartColors.muted,
        font: tickFont,
        padding: 8,
        callback: (value) => formatINRCompact(value),
      },
    },
  },
};

export const horizontalBarOptions = {
  indexAxis: "y",
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  layout: { padding: { right: 48 } },
  plugins: {
    legend: { display: false },
    tooltip: tooltip(formatNumber),
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: chartColors.grid, drawTicks: false },
      border: { display: false },
      ticks: { color: chartColors.muted, font: tickFont, padding: 8, precision: 0 },
    },
    y: {
      grid: { display: false },
      border: { color: chartColors.axis },
      ticks: { color: chartColors.secondary, font: tickFont, padding: 8 },
    },
  },
};

export const barDataset = (data) => ({
  data,
  backgroundColor: chartColors.series,
  maxBarThickness: 24,
  borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
  borderSkipped: false,
});
