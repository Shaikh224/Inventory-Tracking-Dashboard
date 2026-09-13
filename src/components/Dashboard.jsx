import React, { useEffect, useState } from "react";
import { db, collection, getDocs } from "../firebase";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Line, Bar } from "react-chartjs-2";
import 'chart.js/auto';
import { MdAttachMoney, MdGroup, MdInventory, MdShoppingCart, MdReceiptLong, MdSavings } from "react-icons/md";

import { formatINR, formatNumber, monthName, MONTH_NAMES } from "../lib/format";
import {
  lineChartOptions,
  horizontalBarOptions,
  barDataset,
  chartColors,
  crosshairPlugin,
  lineEndLabel,
  barValueLabels,
} from "../lib/chartTheme";
import { PageContainer, PageHeading, Card, SectionCard, StatTile, ChartFrame, EmptyState } from "./ui";
import { DEMO_MODE, demoDashboard } from "../lib/demoData";

function Dashboard() {
  const [totalSales, setTotalSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalInventory, setTotalInventory] = useState(0);
  const [totalInventoryPrice, setTotalInventoryPrice] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [salesTrend, setSalesTrend] = useState({ labels: [], values: [] });
  const [areaDistribution, setAreaDistribution] = useState({ labels: [], values: [] });
  const [monthlySalesData, setMonthlySalesData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      if (DEMO_MODE) {
        setTotalSales(demoDashboard.totalSales);
        setTotalRevenue(demoDashboard.totalRevenue);
        setTotalCustomers(demoDashboard.totalCustomers);
        setTotalInventory(demoDashboard.totalInventory);
        setTotalInventoryPrice(demoDashboard.totalInventoryPrice);
        setTotalPaid(demoDashboard.totalPaid);
        setTotalUnpaid(demoDashboard.totalUnpaid);
        setTotalExpenses(demoDashboard.totalExpenses);
        setSalesTrend(demoDashboard.salesTrend);
        setAreaDistribution(demoDashboard.areaDistribution);
        setMonthlySalesData(demoDashboard.monthlySalesData);
        setLoading(false);
        return;
      }

      try {
        // Fetch Orders
        const ordersCollection = collection(db, "orders"); // Replace "orders" with your actual collection name
        const ordersSnapshot = await getDocs(ordersCollection);
        const ordersData = ordersSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

        // Fetch Customers
        const customersCollection = collection(db, "customers"); // Replace "customers" with your actual collection name
        const customersSnapshot = await getDocs(customersCollection);
        const customersData = customersSnapshot.docs.map((doc) => doc.data());

        // Fetch Inventory
        const inventoryCollection = collection(db, "inventory"); // Replace "inventory" with your actual collection name
        const inventorySnapshot = await getDocs(inventoryCollection);
        const inventoryItems = inventorySnapshot.docs.map((doc) => doc.data());

        // Fetch Expenses
        const expensesCollection = collection(db, "expenses"); // Replace "expenses" with your actual collection name
        const expensesSnapshot = await getDocs(expensesCollection);
        const expensesData = expensesSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

        // Calculate filtered totals based on selected year and month
        const filteredOrders = ordersData.filter((order) => {
          const orderDate = new Date(order.date);
          return orderDate.getFullYear() === selectedYear &&
                 (selectedMonth === null || orderDate.getMonth() + 1 === selectedMonth);
        });

        const filteredExpenses = expensesData.filter((expense) => {
          const expenseDate = new Date(expense.date);
          return expenseDate.getFullYear() === selectedYear &&
                 (selectedMonth === null || expenseDate.getMonth() + 1 === selectedMonth);
        });

        setTotalSales(filteredOrders.length);
        setTotalRevenue(filteredOrders.reduce((acc, order) => acc + (order.total || 0), 0));
        setTotalPaid(filteredOrders.reduce((acc, order) => acc + (order.amountPaid || 0), 0));
        setTotalUnpaid(filteredOrders.reduce((acc, order) => acc + (order.amountUnpaid || 0), 0));
        setTotalCustomers(customersData.length);
        setTotalInventory(inventoryItems.reduce((acc, item) => acc + parseInt(item.quantity, 10) || 0, 0));
        setTotalInventoryPrice(inventoryItems.reduce((acc, item) => acc + (item.quantity * item.price), 0));
        setTotalExpenses(filteredExpenses.reduce((acc, expense) => acc + (expense.totalAmount || 0), 0));

        // Sort the filtered orders by date in ascending order
        filteredOrders.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Create a map to store sales data for each month
        const monthlySales = {};
        filteredOrders.forEach((order) => {
          const orderDate = new Date(order.date);
          const month = orderDate.getMonth() + 1;
          const year = orderDate.getFullYear();
          const formattedDate = `${year}-${month.toString().padStart(2, '0')}`;

          // Add or update the sales for the current month
          monthlySales[formattedDate] = (monthlySales[formattedDate] || 0) + order.total;
        });

        const sortedKeys = Object.keys(monthlySales).sort();
        setSalesTrend({
          labels: sortedKeys.map((key) => {
            const [year, month] = key.split("-");
            return `${monthName(month).slice(0, 3)} ${year}`;
          }),
          values: sortedKeys.map((key) => monthlySales[key]),
        });

        // Customer distribution by area, ranked high -> low
        const areaCounts = {};
        customersData.forEach((customer) => {
          const area = customer.area || "Unspecified";
          areaCounts[area] = (areaCounts[area] || 0) + 1;
        });
        const rankedAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
        setAreaDistribution({
          labels: rankedAreas.map(([area]) => area),
          values: rankedAreas.map(([, count]) => count),
        });

        // Store monthly sales data
        const monthlySalesData = {};
        filteredOrders.forEach((order) => {
          // Convert the date string to a Date object
          const orderDate = new Date(order.date);
          const month = orderDate.getMonth() + 1;

          if (selectedYear === orderDate.getFullYear()) {
            monthlySalesData[month] = (monthlySalesData[month] || 0) + order.total;
          }
        });
        setMonthlySalesData(monthlySalesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, selectedMonth]); // Dependencies for month filter

  const netPosition = totalRevenue - totalExpenses;
  const monthlyRows = Object.entries(monthlySalesData).sort((a, b) => a[0] - b[0]);

  const selectClass =
    "rounded-md border border-ink bg-canvas py-1.5 px-2.5 text-body text-charcoal focus:outline-none focus:ring-2 focus:ring-accent";

  return (
    <div className="bg-paper min-h-screen">
      <PageContainer>
        <PageHeading
          title="Dashboard"
          subtitle={
            selectedMonth
              ? `${monthName(selectedMonth)} ${selectedYear}`
              : `Full year ${selectedYear}`
          }
        />

        {/* One filter row, scoping everything below it */}
        <Card className="p-3 mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="year" className="text-body text-steel">Year</label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className={selectClass}
            >
              {Array.from({ length: 10 }, (_, i) => i + 2020).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="month" className="text-body text-steel">Month</label>
            <select
              id="month"
              value={selectedMonth ?? ""}
              onChange={(e) => {
                const month = parseInt(e.target.value);
                setSelectedMonth(isNaN(month) ? null : month);
              }}
              className={selectClass}
            >
              <option value="">All months</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
        </Card>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <StatTile label="Revenue" value={formatINR(totalRevenue)} icon={MdAttachMoney} loading={loading} />
          <StatTile label="Expenses" value={formatINR(totalExpenses)} icon={MdReceiptLong} loading={loading} />
          <StatTile label="Net position" value={formatINR(netPosition)} icon={MdSavings} loading={loading} />
          <StatTile label="Orders" value={formatNumber(totalSales)} icon={MdShoppingCart} loading={loading} />
          <StatTile label="Customers" value={formatNumber(totalCustomers)} icon={MdGroup} loading={loading} />
          <StatTile label="Units in stock" value={formatNumber(totalInventory)} icon={MdInventory} loading={loading} />
        </div>

        {/* Payment position */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatTile label="Collected" value={formatINR(totalPaid)} loading={loading} />
          <StatTile label="Outstanding" value={formatINR(totalUnpaid)} loading={loading} />
          <StatTile label="Stock value" value={formatINR(totalInventoryPrice)} loading={loading} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SectionCard title="Revenue trend">
            <ChartFrame
              loading={loading}
              hasData={salesTrend.values.length > 1}
              emptyTitle="Not enough data to plot a trend"
              emptyHint="At least two months of orders are needed."
            >
              <Line
                data={{
                  labels: salesTrend.labels,
                  datasets: [{
                    label: "Revenue",
                    data: salesTrend.values,
                    fill: true,
                    backgroundColor: chartColors.seriesWash,
                  }],
                }}
                options={lineChartOptions}
                plugins={[crosshairPlugin, lineEndLabel]}
              />
            </ChartFrame>
          </SectionCard>

          <SectionCard title="Customers by area">
            <ChartFrame
              loading={loading}
              hasData={areaDistribution.values.length > 0}
              emptyTitle="No customers yet"
              emptyHint="Areas appear here once customers are added."
            >
              <Bar
                data={{
                  labels: areaDistribution.labels,
                  datasets: [barDataset(areaDistribution.values)],
                }}
                options={horizontalBarOptions}
                plugins={[barValueLabels]}
              />
            </ChartFrame>
          </SectionCard>
        </div>

        {/* Table view — the WCAG-clean twin of the revenue trend */}
        <SectionCard title="Monthly revenue" bodyClassName="">
          {loading ? (
            <div className="p-4 space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-8 bg-ash rounded animate-pulse" />)}
            </div>
          ) : monthlyRows.length === 0 ? (
            <EmptyState title="No revenue recorded" hint="Orders in this period will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body text-left">
                <thead className="text-caption text-fog uppercase tracking-wide">
                  <tr>
                    <th scope="col" className="px-4 py-2 border-b border-ash font-medium">Month</th>
                    <th scope="col" className="px-4 py-2 border-b border-ash font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map(([month, sales]) => (
                    <tr key={month} className="border-b border-ash last:border-b-0 hover:bg-paper transition-colors">
                      <td className="px-4 py-3 text-charcoal">{monthName(month)}</td>
                      <td className="px-4 py-3 text-charcoal text-right tabular-nums">{formatINR(sales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </PageContainer>

      <ToastContainer />
    </div>
  );
}

export default Dashboard;
