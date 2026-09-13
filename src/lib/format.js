const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrCompact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const plain = new Intl.NumberFormat("en-IN");

export const formatINR = (value) => inr.format(Number(value) || 0);

export const formatINRCompact = (value) => inrCompact.format(Number(value) || 0);

export const formatNumber = (value) => plain.format(Number(value) || 0);

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const monthName = (monthNumber) => MONTH_NAMES[Number(monthNumber) - 1] ?? "";
