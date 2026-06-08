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
       <div className="p-6 bg-gray-100 min-h-screen">
            {loading && <LoadingSpinner />}
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Dashboard</h1>
      {/* Year and Month Filters */}
      <div className="flex gap-4 mb-4">
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700">
            Year:
          </label>
          <select
            id="year"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
          <label htmlFor="month" className="block text-sm font-medium text-gray-700">
            Month:
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
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Total Sales</h3>
            <p className="text-2xl font-bold">{totalSales}</p>
          </div>
          <MdShoppingCart className="text-blue-500 text-4xl" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Total Revenue</h3>
            <p className="text-2xl text-green-600 font-bold">₹{totalRevenue.toFixed(2)}</p>
          </div>
          <MdAttachMoney className="text-green-500 text-4xl" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Total Customers</h3>
            <p className="text-2xl font-bold">{totalCustomers}</p>
          </div>
          <MdGroup className="text-yellow-500 text-4xl" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Total Inventory</h3>
            <p className="text-2xl font-bold">{totalInventory}</p>
          </div>
          <MdInventory className="text-red-500 text-4xl" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Total Inventory Price</h3>
            <p className="text-2xl text-green-600 font-bold">₹{totalInventoryPrice.toFixed(2)}</p>
          </div>
          <MdAttachMoney className="text-green-500 text-4xl" />
        </div>
           <div className="bg-white p-6 rounded-lg shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
          </div>
          <MdAttachMoney className="text-red-500 text-4xl" />
        </div>
      </div>

      {/* Total Paid and Unpaid Amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold">Total Paid Amount</h3>
          <p className="text-green-600 text-2xl font-bold">₹{totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold">Total Unpaid Amount</h3>
          <p className="text-red-600 text-2xl font-bold">₹{totalUnpaid.toFixed(2)}</p>
        </div>
      </div>

      {/* Sales Trend and Customer Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">Sales Trend</h2>
          {salesTrendData.labels ? (
            <Line data={salesTrendData} options={{ responsive: true }} />
          ) : (
            <p>Loading...</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">Customer Distribution by Area</h2>
          {customerDistributionData.labels ? (
            <Pie data={customerDistributionData} options={{ responsive: true }} />
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>

      {/* Display data for each month in the selected year */}
      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-xl font-bold mb-4">Monthly Sales Data</h2>
        {Object.entries(monthlySalesData).length > 0 ? (
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Month</th>
                <th scope="col" className="px-6 py-3">Sales</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(monthlySalesData).map(([month, sales]) => (
                <tr key={month} className="bg-white border-b">
                  <td className="px-6 py-4">{parseInt(month)}</td>
                  <td className="px-6 py-4">₹{(sales || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Loading monthly sales data...</p>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}

export default Dashboard;