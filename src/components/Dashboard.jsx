import React, { useEffect, useState } from "react";
import { db, collection, getDocs } from "../firebase";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { Line, Pie } from "react-chartjs-2";
import 'chart.js/auto';
import { MdAttachMoney, MdGroup, MdInventory, MdShoppingCart } from "react-icons/md";

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
  const [salesTrendData, setSalesTrendData] = useState({});
  const [customerDistributionData, setCustomerDistributionData] = useState({});
  const [expensesData, setExpensesData] = useState([]);
  const [monthlySalesData, setMonthlySalesData] = useState({});
    const [loading, setLoading] = useState(true);


    const LoadingSpinner = () => (
        <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-50 z-50">
            <svg
                className="animate-spin h-10 w-10 text-white"
                viewBox="0 0 24 24"
            >
                <path
                    fill="currentColor"
                    d="M12 4V1a1 1 0 011-1h1a1 1 0 011 1v3a1 1 0 01-1 1h-1a1 1 0 01-1-1zM18.767 6.156l-1.732-1 1.732-1a1 1 0 011.414 0l1.732 1-1.732 1a1 1 0 01-1.414 0zM21.303 11h3a1 1 0 011 1v1a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a1 1 0 011-1zM18.767 17.844l-1.732 1 1.732 1a1 1 0 011.414 0l1.732-1-1.732-1a1 1 0 01-1.414 0zM12 20v3a1 1 0 01-1 1h-1a1 1 0 01-1-1v-3a1 1 0 011-1h1a1 1 0 011 1zM5.233 17.844l1.732 1-1.732 1a1 1 0 01-1.414 0l-1.732-1 1.732-1a1 1 0 011.414 0zM2.697 13h-3a1 1 0 01-1-1v-1a1 1 0 011-1h3a1 1 0 011 1v1a1 1 0 01-1 1zM5.233 6.156l1.732-1-1.732-1a1 1 0 01-1.414 0l-1.732 1 1.732 1a1 1 0 011.414 0zM12 8a4 4 0 100 8 4 4 0 000-8z"
                />
            </svg>
        </div>
    );
  useEffect(() => {
    const fetchData = async () => {
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

        // Calculate sales trend (either whole year or specific month)
        const salesTrendData = {
          labels: [],
          datasets: [
            {
              label: "Sales Trend",
              data: [],
              backgroundColor: "rgba(75, 192, 192, 0.2)",
              borderColor: "rgba(75, 192, 192, 1)",
              fill: true,
            },
          ],
        };

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

        // Add labels and data to the chart in ascending order
        Object.keys(monthlySales).sort().forEach((month) => {
          salesTrendData.labels.push(month);
          salesTrendData.datasets[0].data.push(monthlySales[month]);
        });

        setSalesTrendData(salesTrendData);

        // Calculate Customer Distribution - Assuming you have "area" field in customers data
        const areaDistribution = {};
        customersData.forEach((customer) => {
          areaDistribution[customer.area] = (areaDistribution[customer.area] || 0) + 1;
        });
        setCustomerDistributionData({
          labels: Object.keys(areaDistribution),
          datasets: [
            {
              label: "Customer Distribution by Area",
              data: Object.values(areaDistribution),
              backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"],
            },
          ],
        });

        // Store monthly sales data
        const monthlySalesData = {};
        filteredOrders.forEach((order) => {
          // Convert the date string to a Date object
          const orderDate = new Date(order.date);
          const month = orderDate.getMonth() + 1;

          if (selectedYear === orderDate.getFullYear()) {
            if (selectedMonth !== null && month === selectedMonth) {
              monthlySalesData[month] = (monthlySalesData[month] || 0) + order.total;
            } else {
              monthlySalesData[month] = (monthlySalesData[month] || 0) + order.total;
            }
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

  return (
       <div className="p-4 sm:p-6 bg-paper min-h-screen">
            {loading && <LoadingSpinner />}
            <h1 className="text-heading-sm sm:text-heading font-medium mb-6 text-charcoal tracking-tight">Dashboard</h1>
      {/* Year and Month Filters */}
      <div className="flex gap-4 mb-6">
        <div>
          <label htmlFor="year" className="block text-caption font-medium text-steel mb-1">
            Year
          </label>
          <select
            id="year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="rounded-md border border-ink bg-canvas py-2 px-3 text-body focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {/* Generate year options from 2020 to the current year */}
            {Array.from({ length: 10 }, (_, i) => i + 2020).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="month" className="block text-caption font-medium text-steel mb-1">
            Month
          </label>
          <select
            id="month"
            value={selectedMonth}
            onChange={(e) => {
              const month = parseInt(e.target.value);
              if (!isNaN(month)) {
                setSelectedMonth(month);
              } else {
                setSelectedMonth(null);
              }
            }}
            className="rounded-md border border-ink bg-canvas py-2 px-3 text-body focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value={null}>All Months</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-canvas p-5 rounded-xl border border-ash flex items-center justify-between">
          <div>
            <h3 className="text-caption font-medium text-fog uppercase tracking-wide">Total Sales</h3>
            <p className="text-heading-sm font-medium text-charcoal">{totalSales}</p>
          </div>
          <MdShoppingCart className="text-accent text-3xl" />
        </div>
        <div className="bg-canvas p-5 rounded-xl border border-ash flex items-center justify-between">
          <div>
            <h3 className="text-caption font-medium text-fog uppercase tracking-wide">Total Revenue</h3>
            <p className="text-heading-sm text-mint-fg font-medium">₹{totalRevenue.toFixed(2)}</p>
          </div>
          <MdAttachMoney className="text-mint-fg text-3xl" />
        </div>
        <div className="bg-canvas p-5 rounded-xl border border-ash flex items-center justify-between">
          <div>
            <h3 className="text-caption font-medium text-fog uppercase tracking-wide">Total Customers</h3>
            <p className="text-heading-sm font-medium text-charcoal">{totalCustomers}</p>
          </div>
          <MdGroup className="text-tangerine text-3xl" />
        </div>
        <div className="bg-canvas p-5 rounded-xl border border-ash flex items-center justify-between">
          <div>
            <h3 className="text-caption font-medium text-fog uppercase tracking-wide">Total Inventory</h3>
            <p className="text-heading-sm font-medium text-charcoal">{totalInventory}</p>
          </div>
          <MdInventory className="text-lavender text-3xl" />
        </div>
        <div className="bg-canvas p-5 rounded-xl border border-ash flex items-center justify-between">
          <div>
            <h3 className="text-caption font-medium text-fog uppercase tracking-wide">Total Inventory Price</h3>
            <p className="text-heading-sm text-mint-fg font-medium">₹{totalInventoryPrice.toFixed(2)}</p>
          </div>
          <MdAttachMoney className="text-mint-fg text-3xl" />
        </div>
           <div className="bg-canvas p-5 rounded-xl border border-ash flex items-center justify-between">
          <div>
            <h3 className="text-caption font-medium text-fog uppercase tracking-wide">Total Expenses</h3>
            <p className="text-heading-sm font-medium text-red-600">₹{totalExpenses.toFixed(2)}</p>
          </div>
          <MdAttachMoney className="text-red-500 text-3xl" />
        </div>
      </div>

      {/* Total Paid and Unpaid Amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-canvas p-5 rounded-xl border border-ash">
          <h3 className="text-caption font-medium text-fog uppercase tracking-wide">Total Paid Amount</h3>
          <p className="text-mint-fg text-heading-sm font-medium">₹{totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-canvas p-5 rounded-xl border border-ash">
          <h3 className="text-caption font-medium text-fog uppercase tracking-wide">Total Unpaid Amount</h3>
          <p className="text-red-600 text-heading-sm font-medium">₹{totalUnpaid.toFixed(2)}</p>
        </div>
      </div>

      {/* Sales Trend and Customer Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-canvas p-5 rounded-xl border border-ash">
          <h2 className="text-subheading font-medium mb-4 text-charcoal">Sales Trend</h2>
          {salesTrendData.labels ? (
            <Line data={salesTrendData} options={{ responsive: true }} />
          ) : (
            <p className="text-fog text-body">Loading...</p>
          )}
        </div>
        <div className="bg-canvas p-5 rounded-xl border border-ash">
          <h2 className="text-subheading font-medium mb-4 text-charcoal">Customer Distribution by Area</h2>
          {customerDistributionData.labels ? (
            <Pie data={customerDistributionData} options={{ responsive: true }} />
          ) : (
            <p className="text-fog text-body">Loading...</p>
          )}
        </div>
      </div>

      {/* Display data for each month in the selected year */}
      <div className="bg-canvas p-5 rounded-xl border border-ash mb-6">
        <h2 className="text-subheading font-medium mb-4 text-charcoal">Monthly Sales Data</h2>
        {Object.entries(monthlySalesData).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-body text-left">
              <thead className="text-caption text-fog uppercase tracking-wide">
                <tr>
                  <th scope="col" className="px-4 py-2 border-b border-ash">Month</th>
                  <th scope="col" className="px-4 py-2 border-b border-ash">Sales</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(monthlySalesData).map(([month, sales]) => (
                  <tr key={month} className="border-b border-ash last:border-b-0">
                    <td className="px-4 py-3 text-charcoal">{parseInt(month)}</td>
                    <td className="px-4 py-3 text-charcoal">₹{(sales || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-fog text-body">Loading monthly sales data...</p>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}

export default Dashboard;