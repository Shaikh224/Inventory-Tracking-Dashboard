import { jsPDF } from "jspdf";
import autoTableModule from "jspdf-autotable";

// jspdf-autotable ships CJS: Vite's interop hands back the callable, Node hands
// back the namespace object. Normalise so both resolve to the same function.
const autoTable =
  typeof autoTableModule === "function" ? autoTableModule : autoTableModule.default;

export const COMPANY = {
  name: "STA Foods & Oils Co.",
  tagline: "Hindola Mustard Oil",
  address: "Sanjarpur, Azamgarh, Uttar Pradesh",
  phone: "+91 99534 10116",
  email: "stafoodsoils@gmail.com",
};

// jsPDF's built-in fonts are WinAnsi-encoded and have no glyph for U+20B9,
// so the rupee sign would render as a blank box. "Rs." is the standard fallback.
const money = (value) =>
  "Rs. " +
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

// "06 Sep 2026" — d/m/y vs m/d/y is ambiguous on a document that gets shared.
export const fmtDate = (value) => {
  const d = new Date(value);
  return isNaN(d) ? "-" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const INK = [23, 23, 23];
const STEEL = [82, 82, 82];
const FOG = [115, 115, 115];
const ASH = [229, 229, 229];
const PAPER = [245, 245, 245];
const GREEN = [22, 163, 74];
const RED = [220, 38, 38];
const ORANGE = [234, 88, 12];

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const twoDigits = (n) =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;

const threeDigits = (n) => {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return [
    hundred ? `${ONES[hundred]} Hundred` : "",
    rest ? twoDigits(rest) : "",
  ].filter(Boolean).join(" ");
};

// Indian numbering: crore / lakh / thousand / hundred.
export const amountInWords = (value) => {
  const rupees = Math.floor(Math.abs(Number(value) || 0));
  const paise = Math.round((Math.abs(Number(value) || 0) - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const parts = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));

  let words = parts.join(" ") + " Rupees";
  if (paise) words += ` and ${twoDigits(paise)} Paise`;
  return words + " Only";
};

const statusStyle = (status) => {
  if (status === "Paid") return { label: "PAID", color: GREEN };
  if (status === "Partially Paid") return { label: "PART PAID", color: ORANGE };
  return { label: "UNPAID", color: RED };
};

const drawHeader = (doc, { title, subtitle }) => {
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(COMPANY.name, 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 200);
  doc.text(`${COMPANY.tagline}  |  ${COMPANY.address}`, 14, 20);
  doc.text(`${COMPANY.phone}  |  ${COMPANY.email}`, 14, 25);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, W - 14, 16, { align: "right" });
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(200, 200, 200);
    doc.text(subtitle, W - 14, 22, { align: "right" });
  }
};

// Vector stamp — replaces the ~875KB PNG stamps that were embedded before.
const drawStamp = (doc, { label, color, x, y }) => {
  doc.saveGraphicsState();
  doc.setDrawColor(...color);
  doc.setTextColor(...color);
  doc.setLineWidth(1);
  doc.roundedRect(x, y, 42, 14, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(label, x + 21, y + 9.5, { align: "center" });
  doc.restoreGraphicsState();
};

const drawFooter = (doc, note) => {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();

  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...ASH);
    doc.setLineWidth(0.2);
    doc.line(14, H - 16, W - 14, H - 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...FOG);
    doc.text(note, 14, H - 11);
    doc.text(
      `Generated ${fmtDate(new Date())}  ·  Page ${i} of ${pages}`,
      W - 14,
      H - 11,
      { align: "right" }
    );
  }
};

// A long item list can push the totals past the footer — start a new page instead.
const ensureSpace = (doc, y, needed) => {
  const H = doc.internal.pageSize.getHeight();
  if (y + needed > H - 22) {
    doc.addPage();
    return 24;
  }
  return y;
};

const labelledBlock = (doc, { x, y, w, heading, lines }) => {
  doc.setFillColor(...PAPER);
  doc.setDrawColor(...ASH);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, 30, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...FOG);
  doc.text(heading.toUpperCase(), x + 4, y + 6);

  doc.setFontSize(9);
  let ly = y + 12;
  lines.forEach((line, i) => {
    doc.setFont("helvetica", i === 0 ? "bold" : "normal");
    doc.setTextColor(...(i === 0 ? INK : STEEL));
    doc.text(String(line ?? "-"), x + 4, ly);
    ly += 5;
  });
};

/**
 * Order invoice / receipt.
 * variant "detailed" shows the unit-rate column; "compact" omits it.
 */
export const buildInvoice = (order, { variant = "detailed", customer } = {}) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const invoiceNo = String(order.billNo ?? "").slice(0, 8).toUpperCase();
  const orderDate = order.date ? fmtDate(order.date) : "-";

  drawHeader(doc, { title: "INVOICE", subtitle: `No. ${invoiceNo}` });

  labelledBlock(doc, {
    x: 14, y: 38, w: (W - 28) / 2 - 3,
    heading: "Billed to",
    lines: [
      order.customerName || customer?.name,
      customer?.phoneNumber,
      customer?.address,
    ],
  });

  labelledBlock(doc, {
    x: W / 2 + 1.5, y: 38, w: (W - 28) / 2 - 3,
    heading: "Invoice details",
    lines: [
      `Invoice no: ${invoiceNo}`,
      `Date: ${orderDate}`,
      `Status: ${order.paymentStatus || "-"}`,
    ],
  });

  const items = order.items ?? [];
  const head = variant === "compact"
    ? [["#", "Description", "Qty", "Amount"]]
    : [["#", "Description", "Qty", "Rate", "Amount"]];

  const body = items.map((item, i) => {
    const amount = (Number(item.price) || 0) * (Number(item.quantity) || 0);
    return variant === "compact"
      ? [i + 1, item.productName, item.quantity, money(amount)]
      : [i + 1, item.productName, item.quantity, money(item.price), money(amount)];
  });

  const numericCols = variant === "compact"
    ? { 0: { halign: "center", cellWidth: 10 }, 2: { halign: "right" }, 3: { halign: "right" } }
    : { 0: { halign: "center", cellWidth: 10 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } };

  autoTable(doc, {
    startY: 74,
    head,
    body,
    theme: "grid",
    styles: {
      font: "helvetica", fontSize: 9, cellPadding: 3,
      lineColor: ASH, lineWidth: 0.2, textColor: INK,
    },
    headStyles: {
      fillColor: INK, textColor: [255, 255, 255],
      fontStyle: "bold", fontSize: 8.5, halign: "left",
    },
    columnStyles: numericCols,
    alternateRowStyles: { fillColor: [250, 250, 250] },
    margin: { left: 14, right: 14 },
  });

  let y = ensureSpace(doc, doc.lastAutoTable.finalY + 8, 78);

  // Totals block, right aligned
  const boxW = 78;
  const boxX = W - 14 - boxW;
  const subtotal = Number(order.total) || 0;
  const paid = Number(order.amountPaid) || 0;
  const due = Number(order.amountUnpaid) || 0;

  const rows = [
    ["Subtotal", money(subtotal)],
    ["Amount paid", money(paid)],
  ];

  doc.setFontSize(9);
  rows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...STEEL);
    doc.text(label, boxX, y);
    doc.setTextColor(...INK);
    doc.text(value, W - 14, y, { align: "right" });
    y += 6;
  });

  doc.setDrawColor(...ASH);
  doc.setLineWidth(0.2);
  doc.line(boxX, y - 2, W - 14, y - 2);
  y += 2;

  doc.setFillColor(...(due > 0 ? [254, 242, 242] : [240, 253, 244]));
  doc.roundedRect(boxX, y - 5, boxW, 11, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...(due > 0 ? RED : GREEN));
  doc.text(due > 0 ? "Balance due" : "Fully paid", boxX + 3, y + 2);
  doc.text(money(due), W - 14 - 3, y + 2, { align: "right" });

  const stamp = statusStyle(order.paymentStatus);
  drawStamp(doc, { ...stamp, x: 14, y: y - 6 });

  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...FOG);
  doc.text("AMOUNT IN WORDS", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(amountInWords(subtotal), W - 28), 14, y + 5);

  y += 22;
  doc.setDrawColor(...ASH);
  doc.line(14, y, W - 14, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...FOG);
  doc.text("TERMS", 14, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...STEEL);
  doc.text(
    doc.splitTextToSize(
      "Goods once sold will not be taken back. Please settle any balance due by the agreed date. This is a computer-generated invoice.",
      110
    ),
    14,
    y + 12
  );

  doc.setDrawColor(...ASH);
  doc.line(W - 70, y + 26, W - 14, y + 26);
  doc.setFontSize(8);
  doc.setTextColor(...FOG);
  doc.text(`For ${COMPANY.name}`, W - 14, y + 31, { align: "right" });

  drawFooter(doc, `Thank you for your business  ·  ${COMPANY.email}`);
  return doc;
};

/**
 * Customer account statement — orders and payments as a running ledger.
 */
export const buildStatement = ({ customer, entries, totals, period }) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  drawHeader(doc, { title: "STATEMENT", subtitle: period });

  labelledBlock(doc, {
    x: 14, y: 38, w: (W - 28) / 2 - 3,
    heading: "Account",
    lines: [customer?.name, customer?.phoneNumber, customer?.address],
  });

  labelledBlock(doc, {
    x: W / 2 + 1.5, y: 38, w: (W - 28) / 2 - 3,
    heading: "Summary",
    lines: [
      `Total billed: ${money(totals.billed)}`,
      `Total paid: ${money(totals.paid)}`,
      `Outstanding: ${money(totals.outstanding)}`,
    ],
  });

  const body = entries.map((entry) => {
    if (entry.type === "order") {
      const details = (entry.items ?? [])
        .map((i) => `${i.productName}  ${i.quantity} x ${money(i.price)}`)
        .join("\n");
      return [
        fmtDate(entry.date),
        "Order",
        details || "-",
        money(entry.total),
        "",
        entry.comment || "",
      ];
    }
    return [
      fmtDate(entry.paymentDate),
      "Payment",
      "Payment received",
      "",
      money(entry.totalPaid),
      "",
    ];
  });

  autoTable(doc, {
    startY: 74,
    head: [["Date", "Type", "Details", "Billed", "Paid", "Note"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica", fontSize: 8.5, cellPadding: 2.5,
      lineColor: ASH, lineWidth: 0.2, textColor: INK, valign: "middle",
    },
    headStyles: {
      fillColor: INK, textColor: [255, 255, 255],
      fontStyle: "bold", fontSize: 8, halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 18 },
      3: { halign: "right", cellWidth: 26 },
      4: { halign: "right", cellWidth: 26 },
      5: { cellWidth: 22 },
    },
    // Payments get a green wash so the ledger reads at a glance.
    didParseCell: (data) => {
      if (data.section === "body" && data.row.raw[1] === "Payment") {
        data.cell.styles.fillColor = [240, 253, 244];
        data.cell.styles.textColor = [21, 128, 61];
      }
    },
    margin: { left: 14, right: 14 },
  });

  let y = ensureSpace(doc, doc.lastAutoTable.finalY + 10, 40);
  const boxW = 78;
  const boxX = W - 14 - boxW;
  const outstanding = Number(totals.outstanding) || 0;

  doc.setFillColor(...(outstanding > 0 ? [254, 242, 242] : [240, 253, 244]));
  doc.roundedRect(boxX, y - 5, boxW, 11, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...(outstanding > 0 ? RED : GREEN));
  doc.text(outstanding > 0 ? "Outstanding" : "Settled in full", boxX + 3, y + 2);
  doc.text(money(outstanding), W - 14 - 3, y + 2, { align: "right" });

  drawStamp(doc, {
    label: outstanding > 0 ? "BALANCE DUE" : "SETTLED",
    color: outstanding > 0 ? RED : GREEN,
    x: 14,
    y: y - 6,
  });

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...FOG);
  doc.text("OUTSTANDING IN WORDS", 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(amountInWords(outstanding), W - 28), 14, y + 5);

  drawFooter(doc, `Statement for ${customer?.name ?? "customer"}  ·  ${COMPANY.phone}`);
  return doc;
};

export const invoiceFileName = (order) =>
  `Invoice-${String(order.billNo ?? "").slice(0, 8).toUpperCase()}-${(order.customerName || "customer").replace(/\s+/g, "-")}.pdf`;
