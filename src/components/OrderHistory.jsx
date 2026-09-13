import React, { useEffect, useState } from "react";
import { db, collection, deleteDoc, updateDoc, getDocs, doc } from "../firebase";
import { query, where, Timestamp, addDoc } from "firebase/firestore";
import { FaCheckCircle, FaTimesCircle, FaPlusCircle } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const [showPaidOnly, setShowPaidOnly] = useState(false);
    const [showUnpaid, setShowUnpaid] = useState(false);
    const [showPartiallyPaid, setShowPartiallyPaid] = useState(false);
    const [monthFilter, setMonthFilter] = useState('');
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear()); // Default year to current year
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orderIdToDelete, setOrderIdToDelete] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentDate, setPaymentDate] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [loading, setLoading] = useState(true); // Added loading state

    useEffect(() => {
        const fetchOrders = async () => {
            const ordersCollection = collection(db, "orders");
            const ordersSnapshot = await getDocs(ordersCollection);
            const ordersData = ordersSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

            // Fetch payment records for each order and store them in a map
            const paymentRecordsMap = new Map();
            for (const order of ordersData) {
                const paymentRecords = await getPaymentRecordsForOrder(order.id);
                paymentRecordsMap.set(order.id, paymentRecords);
            }

            // Add the payment records to each order
            const ordersWithPayments = ordersData.map(order => ({
                ...order,
                paymentRecords: paymentRecordsMap.get(order.id)
            }));

            // Sort orders by date in descending order (latest first)
            ordersWithPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
            setOrders(ordersWithPayments);
             setLoading(false);
        };

        fetchOrders();
    }, []);
    useEffect(() => {
        const currentDate = new Date();
         setMonthFilter(String(currentDate.getMonth() + 1)); // set initial month value
        setYearFilter(String(currentDate.getFullYear()));
    }, []);

    const handleDeleteOrder = async () => {
        try {
            await deleteDoc(doc(db, "orders", orderIdToDelete));
            setOrders(orders.filter(order => order.id !== orderIdToDelete));
            toast.success("Order deleted successfully!");
            setShowDeleteModal(false);
        } catch (error) {
            console.error("Error deleting order:", error);
            toast.error("Error deleting order!");
        }
    };
     const handlePaymentRecord = async () => {
      try {
        const orderRef = doc(db, "orders", selectedOrder.id);
        const orderToUpdateIndex = orders.findIndex(o => o.id === selectedOrder.id);

        if (orderToUpdateIndex === -1) return;

        // Convert paymentDate to a Date object and format to ISO string
        const paymentDateISO = new Date(paymentDate).toISOString();

        // Add the payment record to the "paymentRecords" collection
        await addDoc(collection(db, "paymentRecords"), {
          orderId: selectedOrder.id,
          amountPaid: parseFloat(paymentAmount),
          paymentDate: Timestamp.fromDate(new Date(paymentDateISO)),
        });

        // Update the order in the "orders" collection
        let newAmountPaid = orders[orderToUpdateIndex].amountPaid + parseFloat(paymentAmount);
        let newAmountUnpaid = orders[orderToUpdateIndex].total - newAmountPaid;
        let paymentStatus = "Unpaid";

        if (newAmountPaid === orders[orderToUpdateIndex].total) {
          paymentStatus = "Paid";
        } else if (newAmountPaid > 0 && newAmountPaid < orders[orderToUpdateIndex].total) {
          paymentStatus = "Partially Paid";
        }

        await updateDoc(orderRef, {
          amountPaid: newAmountPaid,
          amountUnpaid: newAmountUnpaid,
          paymentStatus: paymentStatus,
        });

        // Update orders directly without using setOrders
        const updatedOrders = [...orders];
        updatedOrders[orderToUpdateIndex] = {
          ...orders[orderToUpdateIndex],
          amountPaid: newAmountPaid,
          amountUnpaid: newAmountUnpaid,
          paymentStatus: paymentStatus,
          paymentRecords: [
            ...(orders[orderToUpdateIndex].paymentRecords || []),
            {
              paymentDate: Timestamp.fromDate(new Date(paymentDateISO)),
              amountPaid: parseFloat(paymentAmount),
            },
          ],
        };

        // Update orders state (Important for re-rendering)
        setOrders(updatedOrders);

        // Update the payment records map in your `useEffect`
        const paymentRecordsMap = new Map();
        for (const order of updatedOrders) {
          const paymentRecords = await getPaymentRecordsForOrder(order.id);
          paymentRecordsMap.set(order.id, paymentRecords);
        }
        setOrders(updatedOrders.map(order => ({
          ...order,
          paymentRecords: paymentRecordsMap.get(order.id)
        })));

        // Close the payment modal
        setShowPaymentModal(false);
        toast.success("Payment record added successfully!");
      } catch (error) {
        console.error("Error adding payment record:", error);
        toast.error("Error adding payment record!");
      }
    };

    const filterOrders = () => {
        return orders.filter(order => {
            const matchesSearchQuery = searchQuery
                ? (order.customerName && order.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (order.phoneNum && order.phoneNum.includes(searchQuery))
                : true;

            // Convert order.date to a Date object
            const orderDate = new Date(order.date);

            // Check if the date is valid
            if (isNaN(orderDate)) {
                console.error(`Invalid date for order: ${order.date}`);
                return false;
            }

            // Apply the year filter
            const isInYear = orderDate.getFullYear() === parseInt(yearFilter);

            // Handle the month filter
            const isInMonth = monthFilter ? orderDate.getMonth() + 1 === parseInt(monthFilter) : true;

            // Handle the payment status filter
            const isPaid = showPaidOnly && order.paymentStatus === "Paid";
            const isUnpaid = showUnpaid && order.paymentStatus === "Unpaid";
            const isPartiallyPaid = showPartiallyPaid && order.paymentStatus === "Partially Paid";
            const statusSelected = showPaidOnly || showUnpaid || showPartiallyPaid;

            // Return filtered orders
            return isInYear && isInMonth && (!statusSelected || isPaid || isUnpaid || isPartiallyPaid) && matchesSearchQuery;
        });
    };

    const downloadExcel = () => {
          const data = filterOrders().map(order => {
              const itemsString = order.items.map(item =>
                  `${item.productName} - Qty: ${item.quantity} - Price: ₹${item.price}`
              ).join('\n');
            const paymentRecordsString = Array.isArray(order.paymentRecords) ? order.paymentRecords.map(record =>
                   `${record.paymentDate ? new Date(record.paymentDate.toDate()).toLocaleDateString() : ''} - ₹${record.amountPaid}`
              ).join('\n') : 'No payment records';
              return {
                  'Customer Name': order.customerName,
                  'Phone Number': order.phoneNum,
                  'Total': `₹${order.total.toFixed(2)}`,
                  'Amount Paid': `₹${order.amountPaid.toFixed(2)}`,
                  'Amount Unpaid': `₹${order.amountUnpaid.toFixed(2)}`,
                  'Payment Status': order.paymentStatus,
                  'Order Date': new Date(order.date).toISOString().slice(0, 10),
                  'Order Items': itemsString,
                  'Payment Records': paymentRecordsString
              };
        });


        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "OrderHistory");
        XLSX.writeFile(workbook, "OrderHistory.xlsx");
      };

    const handleDeleteConfirm = (orderId) => {
        setOrderIdToDelete(orderId);
        setShowDeleteModal(true);
    };
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
  const handleOpenPaymentModal = (order) => {
        // Do nothing.
     };
    const getPaymentRecordsForOrder = async (orderId) => {
        const q = query(collection(db, "paymentRecords"), where("orderId", "==", orderId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    return (
         <div className="p-4 sm:p-6 bg-paper min-h-screen">
            {loading && <LoadingSpinner />}
            <h1 className="text-heading-sm sm:text-heading font-medium mb-6 text-charcoal tracking-tight">Order History</h1>
             <div className="flex flex-wrap items-center gap-4 mb-6 bg-canvas border border-ash rounded-xl p-4">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search by name or phone number"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="p-2 border border-ink rounded-md text-body focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
                <label className="flex items-center gap-1.5 text-body text-steel">
                    <input
                        type="checkbox"
                        checked={showPaidOnly}
                        onChange={() => setShowPaidOnly(!showPaidOnly)}
                        className="accent-accent"
                    />
                    Show Paid Only
                </label>
                <label className="flex items-center gap-1.5 text-body text-steel">
                    <input
                        type="checkbox"
                        checked={showUnpaid}
                        onChange={() => setShowUnpaid(!showUnpaid)}
                        className="accent-accent"
                    />
                    Show Unpaid
                </label>
                <label className="flex items-center gap-1.5 text-body text-steel">
                    <input
                        type="checkbox"
                        checked={showPartiallyPaid}
                        onChange={() => setShowPartiallyPaid(!showPartiallyPaid)}
                        className="accent-accent"
                    />
                    Show Partially Paid
                </label>
                <div className="flex items-center gap-2">
                    <label className="text-body text-steel">Month:</label>
                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="text-body border border-ink rounded-md p-1.5 bg-canvas hover:bg-paper focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                         <option value="">All</option>
                        {[...Array(12).keys()].map((i) => (
                            <option key={i + 1} value={i + 1}>
                                {i + 1}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-body text-steel">Year:</label>
                    <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(parseInt(e.target.value))}
                        className="text-body border border-ink rounded-md p-1.5 bg-canvas hover:bg-paper focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        {[2022, 2023, 2024, 2025, 2026, 2027, 2028].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                 <button
                        onClick={downloadExcel}
                        className="bg-ink text-white px-3 py-2 rounded-lg text-body font-medium hover:bg-charcoal transition-colors"
                    >
                        Download Excel
                    </button>
            </div>

            <div className="overflow-x-auto border border-ash rounded-xl">
                <table className="min-w-full bg-canvas table-auto text-body">
                    <thead>
                        <tr className="text-caption text-fog uppercase tracking-wide">
                            <th className="border-b border-ash px-3 py-2 text-left">Customer Name</th>
                            <th className="border-b border-ash px-3 py-2 text-left">Total</th>
                            <th className="border-b border-ash px-3 py-2 text-left">Amount Paid</th>
                            <th className="border-b border-ash px-3 py-2 text-left">Amount Unpaid</th>
                            <th className="border-b border-ash px-3 py-2 text-left">Payment Status</th>
                            <th className="border-b border-ash px-3 py-2 text-left">Order Date</th>
                            <th className="border-b border-ash px-3 py-2 text-left">Order Items</th>
                            <th className="border-b border-ash px-3 py-2 text-left">Payment Records</th>
                            <th className="border-b border-ash px-3 py-2 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filterOrders().map((order) => (
                            <tr key={order.id} className="hover:bg-paper transition-colors">
                                <td className="border-b border-ash px-3 py-2 text-charcoal">{order.customerName}</td>
                                <td className="border-b border-ash px-3 py-2 text-mint-fg font-medium">
                                    ₹{order.total.toFixed(2)}
                                </td>
                                <td className="border-b border-ash px-3 py-2 text-charcoal">
                                    {`₹${order.amountPaid.toFixed(2)}`}
                                </td>
                                <td className="border-b border-ash px-3 py-2 text-red-600">
                                    ₹{order.amountUnpaid.toFixed(2)}
                                </td>
                                 <td className="border-b border-ash px-3 py-2">
                                  {order.paymentStatus === "Paid" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-mint text-mint-fg text-caption font-medium">
                      <FaCheckCircle size={10} /> Paid
                    </span>
                                  ) : order.paymentStatus === "Unpaid" ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-caption font-medium">
                      <FaTimesCircle size={10} /> Unpaid
                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-tangerine/10 text-tangerine text-caption font-medium">Partially Paid</span>
                                  )}
                                </td>
                                <td className="border-b border-ash px-3 py-2 text-steel">
                                    {new Date(order.date).toISOString().slice(0, 10)}
                                </td>
                                <td className="border-b border-ash px-3 py-2 text-steel">
                                    {order.items.map((item, index) => (
                                        <div key={index}>
                                            <p>
                                                {item.productName} - Quantity: {item.quantity} - Price: ₹{item.price}
                                            </p>
                                        </div>
                                    ))}
                                </td>
                                   <td className="border-b border-ash px-3 py-2 text-steel">
                                       {Array.isArray(order.paymentRecords) ? (
                                            order.paymentRecords.map((record, index) => (
                                              <div key={index}>
                                                <p>
                                                  {record.paymentDate ? new Date(record.paymentDate.toDate()).toLocaleDateString() : ''} - ₹{record.amountPaid}
                                                </p>
                                              </div>
                                            ))
                                          ) : (
                                            <p>No payment records</p>
                                          )}
                                        <Link
                                          to={`/customer/${order.customer}`}
                                          className="bg-canvas text-accent border border-ash px-2 py-1 rounded-lg mt-1 inline-block hover:bg-paper transition-colors"
                                        >
                                          <FaPlusCircle />
                                        </Link>
                                    </td>
                                    <td className="border-b border-ash px-3 py-2">
                                        <button
                                            onClick={() => handleDeleteConfirm(order.id)}
                                            className="bg-canvas text-red-600 border border-ash px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="bg-canvas rounded-xl border border-ash shadow-card p-6 w-96">
                        <h2 className="text-body-lg font-semibold mb-3 text-charcoal">
                            Confirm Delete
                        </h2>
                        <p className="mb-4 text-body text-steel">
                            Are you sure you want to delete this order?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="bg-canvas text-charcoal border border-ash px-3 py-1.5 rounded-lg text-body hover:bg-paper transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteOrder}
                                className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-body hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

             <ToastContainer />
         </div>
    );
}

export default OrderHistory;