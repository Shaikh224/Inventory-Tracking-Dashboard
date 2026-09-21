// Dev-only sample data so the UI can be reviewed without a live Firestore.
// Enabled with VITE_DEMO_DATA=true; never used when the flag is off.
// Everything here is invented — no real customer, supplier or location.
export const DEMO_MODE = import.meta.env.VITE_DEMO_DATA === "true";

const day = (d) => new Date(2026, 8, d).toISOString();
const paidOn = (d) => ({ toDate: () => new Date(2026, 8, d) });

export const demoOrders = [
  {
    id: "o1", customer: "c1", customerName: "Northside Traders", date: day(2),
    total: 88000, amountPaid: 88000, amountUnpaid: 0, paymentStatus: "Paid",
    items: [{ productName: "Mustard Oil 5L", quantity: 100, price: 880 }],
    paymentRecords: [{ paymentDate: paidOn(2), amountPaid: 88000 }],
  },
  {
    id: "o2", customer: "c2", customerName: "Riverside Kirana", date: day(6),
    total: 37000, amountPaid: 20000, amountUnpaid: 17000, paymentStatus: "Partially Paid",
    items: [{ productName: "Mustard Oil 1L", quantity: 200, price: 185 }],
    paymentRecords: [{ paymentDate: paidOn(8), amountPaid: 20000 }],
  },
  {
    id: "o3", customer: "c3", customerName: "Hillview Wholesale", date: day(11),
    total: 50400, amountPaid: 0, amountUnpaid: 50400, paymentStatus: "Unpaid",
    items: [{ productName: "Groundnut Oil 2L", quantity: 120, price: 420 }],
    paymentRecords: [],
  },
  {
    id: "o4", customer: "c4", customerName: "Eastgate Stores", date: day(19),
    total: 26400, amountPaid: 26400, amountUnpaid: 0, paymentStatus: "Paid",
    items: [
      { productName: "Refined Oil 1L", quantity: 90, price: 160 },
      { productName: "Sunflower Oil 1L", quantity: 69, price: 175 },
    ],
    paymentRecords: [{ paymentDate: paidOn(19), amountPaid: 26400 }],
  },
];

export const demoCustomers = [
  { id: "c1", name: "Northside Traders", phoneNumber: "0000000001", address: "12 First Street", area: "North Ward", customerType: "business" },
  { id: "c2", name: "Riverside Kirana", phoneNumber: "0000000002", address: "4 Second Street", area: "North Ward", customerType: "individual" },
  { id: "c3", name: "Hillview Wholesale", phoneNumber: "0000000003", address: "27 Third Street", area: "East Ward", customerType: "business" },
  { id: "c4", name: "Eastgate Stores", phoneNumber: "0000000004", address: "8 Fourth Street", area: "South Ward", customerType: "individual" },
];

export const demoExpenses = [
  { id: "e1", itemName: "Raw seed stock", quantity: 400, totalAmount: 320000, paidAmount: 320000, unpaidAmount: 0, status: "Paid", supplier: "Supplier One", date: day(3) },
  { id: "e2", itemName: "Packaging bottles", quantity: 5000, totalAmount: 68000, paidAmount: 40000, unpaidAmount: 28000, status: "Partially Paid", supplier: "Supplier Two", date: day(9) },
  { id: "e3", itemName: "Transport", quantity: 12, totalAmount: 42000, paidAmount: 0, unpaidAmount: 42000, status: "Unpaid", supplier: "Supplier Three", date: day(16) },
];

export const demoDashboard = {
  totalSales: 412,
  totalRevenue: 4875000,
  totalCustomers: 87,
  totalInventory: 1340,
  totalInventoryPrice: 1985000,
  totalPaid: 4120000,
  totalUnpaid: 755000,
  totalExpenses: 2910000,
  salesTrend: {
    labels: ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026"],
    values: [385000, 412000, 468000, 441000, 523000, 610000, 578000, 664000, 794000],
  },
  areaDistribution: {
    labels: ["North Ward", "East Ward", "South Ward", "West Ward", "Central", "Outer Ring"],
    values: [24, 19, 14, 11, 9, 6],
  },
  monthlySalesData: {
    1: 385000, 2: 412000, 3: 468000, 4: 441000, 5: 523000,
    6: 610000, 7: 578000, 8: 664000, 9: 794000,
  },
};
