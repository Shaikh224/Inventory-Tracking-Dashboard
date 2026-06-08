import React, { useEffect, useState } from "react";
import {
    db,
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where,
} from "../firebase";
import {
    FaUserPlus,
    FaEdit,
    FaTrash,
    FaSearch,
    FaEye,
    FaDownload,
    FaCheckCircle
} from "react-icons/fa";
import * as XLSX from "xlsx";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Modal from "react-modal";
import html2pdf from 'html2pdf.js';
import { useNavigate } from "react-router-dom";

Modal.setAppElement("#root");

function Customers() {
    const [customers, setCustomers] = useState([]);
    const [name, setName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [address, setAddress] = useState("");
    const [area, setArea] = useState("");
    const [customerType, setCustomerType] = useState("individual");
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [orders, setOrders] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [customerIdToDelete, setCustomerIdToDelete] = useState(null);
    const [showOrderDeleteConfirmation, setShowOrderDeleteConfirmation] = useState(false);
    const [orderIdToDelete, setOrderIdToDelete] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [orderStatuses, setOrderStatuses] = useState([]);

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
        const fetchCustomers = async () => {
            try {
                const customersCollection = collection(db, "customers");
                const customersSnapshot = await getDocs(customersCollection);
                let customersList = customersSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // Sort customers alphabetically by name
               customersList.sort((a, b) => a.name.localeCompare(b.name));
                setCustomers(customersList);
            } catch (error) {
                console.error("Error fetching customers:", error);
            }
        };

        fetchCustomers();
    }, []);

    const fetchOrders = async () => {
        try {
            const ordersCollection = collection(db, "orders");
            const ordersSnapshot = await getDocs(ordersCollection);
            const ordersList = ordersSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setOrders(ordersList);
            const statusSnapshot = await getDocs(collection(db, "order_status"));
            setOrderStatuses(statusSnapshot.docs.map(doc => ({ ...doc.data() })));
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleViewOrders = (customerId) => {
        navigate(`/customer/${customerId}`);
    };

    const handleOpenModal = () => {
        setModalIsOpen(true);
    };

    const handleCloseModal = () => {
        setModalIsOpen(false);
        resetForm();
    };

    const handleAddCustomer = async (e) => {
        e.preventDefault();
        if (!validatePhoneNumber(phoneNumber)) {
            alert("Please enter a valid phone number.");
            return;
        }

        const customerExists = customers.some((customer) => customer.name === name);
        if (customerExists) {
            alert("Customer already exists!");
            return;
        }

        try {
            const newCustomer = {
                name,
                phoneNumber,
                address,
                area,
                customerType,
            };
            const docRef = await addDoc(collection(db, "customers"), newCustomer);
            setCustomers([...customers, { id: docRef.id, ...newCustomer }]);
            resetForm();
            toast.success("Customer added successfully!");
            handleCloseModal();
        } catch (error) {
            console.error("Error adding customer:", error);
            toast.error("Error adding customer!");
        }
    };

    const resetForm = () => {
        setName("");
        setPhoneNumber("");
        setAddress("");
        setArea("");
        setCustomerType("individual");
        setEditingCustomer(null);
    };

    const handleEditCustomer = (customer) => {
        setName(customer.name);
        setPhoneNumber(customer.phoneNumber);
        setAddress(customer.address);
        setArea(customer.area);
        setCustomerType(customer.customerType || "individual");
        setEditingCustomer(customer.id);
        setModalIsOpen(true);
    };

    const handleUpdateCustomer = async (e) => {
        e.preventDefault();
        if (!validatePhoneNumber(phoneNumber)) {
            alert("Please enter a valid phone number.");
            return;
        }

        const updatedCustomer = {
            name,
            phoneNumber,
            address,
            area,
            customerType,
        };

        try {
            const customerDoc = doc(db, "customers", editingCustomer);
            await updateDoc(customerDoc, updatedCustomer);
            setCustomers(
                customers.map((cust) =>
                    cust.id === editingCustomer
                        ? { id: editingCustomer, ...updatedCustomer }
                        : cust
                )
            );
            resetForm();
            toast.success("Customer updated successfully!");
            handleCloseModal();
        } catch (error) {
            console.error("Error updating customer:", error);
            toast.error("Error updating customer!");
        }
    };

    const handleDeleteConfirm = (customer) => {
        setCustomerIdToDelete(customer.id);
        setShowDeleteConfirmation(true);
    };

    const handleDeleteCustomer = async () => {
        try {
            const customerId = customerIdToDelete;

            // Fetch all orders associated with this customer
            const ordersQuery = query(
                collection(db, "orders"),
                where("customer", "==", customerId)
            );

            const ordersSnapshot = await getDocs(ordersQuery);

            // Delete orders sequentially to ensure dependencies are met
            for (const doc of ordersSnapshot.docs) {
                await deleteDoc(doc.ref);
            }

            // Delete customer document after deleting related records
            await deleteDoc(doc(db, "customers", customerId));

            // Update local state (after successful delete operations)
            setCustomers(customers.filter((customer) => customer.id !== customerId));
            setOrders(orders.filter((order) => order.customer !== customerId));

            setShowDeleteConfirmation(false);
            toast.success("Customer and related records deleted successfully!");
        } catch (error) {
            console.error("Error deleting customer and orders:", error);
            toast.error("Error deleting customer and orders!");
        }
    };

    const handleDeleteOrderConfirm = (orderId) => {
        setOrderIdToDelete(orderId);
        setShowOrderDeleteConfirmation(true);
    };

    const handleDeleteOrder = async () => {
        try {
            await deleteDoc(doc(db, "orders", orderIdToDelete));
            setOrders(orders.filter(order => order.id !== orderIdToDelete));
            setShowOrderDeleteConfirmation(false);
            toast.success("Order deleted successfully!");
        } catch (error) {
            console.error("Error deleting order:", error);
            toast.error("Error deleting order!");
        }
    };


    const handleUpdatePaymentStatus = async (orderId, newStatus, updatedAmountPaid) => {
        try {
            const orderRef = doc(db, "orders", orderId);

            // Get the current order from the orders array
            const orderToUpdate = orders.find(o => o.id === orderId);

            if (!orderToUpdate) return;

            let newAmountPaid = 0;
            let newAmountUnpaid = 0;

            if (newStatus === "Paid") {
                newAmountPaid = orderToUpdate.total;
                newAmountUnpaid = 0;
            } else if (newStatus === "Partially Paid") {
                newAmountPaid = updatedAmountPaid;
                newAmountUnpaid = orderToUpdate.total - updatedAmountPaid;
            } else if (newStatus === "Unpaid") {
                newAmountPaid = 0;
                newAmountUnpaid = orderToUpdate.total;
            }

            await updateDoc(orderRef, {
                paymentStatus: newStatus,
                amountPaid: newAmountPaid,
                amountUnpaid: newAmountUnpaid
            });

            setOrders(orders.map(o => {
                if (o.id === orderId) {
                    return { ...o, paymentStatus: newStatus, amountPaid: newAmountPaid, amountUnpaid: newAmountUnpaid };
                }
                return o;
            }));

            toast.success(`Payment status updated to ${newStatus}!`);
        } catch (error) {
            console.error("Error updating payment status:", error);
            toast.error("Error updating payment status!");
        }
    };

    const downloadCustomerData = () => {
        const worksheet = XLSX.utils.json_to_sheet(customers, {
            header: ['name', 'phoneNumber', 'address', 'area', 'customerType'],
        });

        const columnWidths = [
            { wch: 20 },
            { wch: 15 },
            { wch: 30 },
            { wch: 15 },
            { wch: 15 }
        ];
        worksheet['!cols'] = columnWidths;
        const headerStyle = {
            font: { bold: true, sz: 12 },
            fill: { patternType: 'solid', fgColor: { rgb: 'FFD3D3D3' } },
            alignment: { horizontal: 'center' },
            border: {
                top: { style: 'thin' },
                right: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
            }
        };
        const headers = ['A1', 'B1', 'C1', 'D1', 'E1'];
        headers.forEach(headerCell => {
            if (worksheet[headerCell]) {
                worksheet[headerCell].s = headerStyle;
            }
        });

        const contentStyle = {
            border: {
                top: { style: 'thin' },
                right: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
            },
            alignment: { vertical: 'top', wrapText: true }
        };

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (worksheet[cellAddress]) {
                    worksheet[cellAddress].s = contentStyle;
                }
            }
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
        XLSX.writeFile(workbook, "customers.xlsx");
    };

    const downloadOrderPdf = (customerId) => {
        const customerOrders = orders.filter((order) => order.customer === customerId);
        const customerData = customers.find((customer) => customer.id === customerId);
        const orderHistoryHtml = `
          <div>
            <h2>Order History</h2>
            <p><strong>Customer:</strong> ${customerData.name}</p>
              <p><strong>Phone:</strong> ${customerData.phoneNumber}</p>
              <p><strong>Address:</strong> ${customerData.address}</p>
             <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Amount Paid</th>
                  <th>Amount Unpaid</th>
                   <th>Payment Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${customerOrders.map((order) => `
                  <tr>
                    <td>${order.product}</td>
                    <td>${order.quantity}</td>
                    <td>₹${order.total}</td>
                    <td>₹${order.amountPaid}</td>
                    <td>₹${order.amountUnpaid}</td>
                     <td>${order.paymentStatus}</td>
                    <td>${new Date(order.date).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        const element = document.createElement('div');
        element.innerHTML = orderHistoryHtml;
        element.style.cssText = 'padding: 20px';

        html2pdf()
            .from(element)
            .save(`customer_order_history_${customerId}.pdf`);
    };


    const validatePhoneNumber = (number) => {
        const regex = /^\d{10}$/;
        return regex.test(number);
    };

    const filteredCustomers = customers.filter(
        (customer) =>
            customer.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return (
        <div className="p-2 sm:p-4 md:p-6 bg-gray-100 rounded-lg shadow-md">
            {loading && <LoadingSpinner />}
            <ToastContainer />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-2 sm:mb-4 md:mb-6">
                Customers
            </h2>
            <div className="mb-2 sm:mb-4 flex flex-col sm:flex-row items-center">
                <input
                    type="text"
                    placeholder="Search by name or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border border-gray-300 rounded p-1 sm:p-2 w-full sm:flex-grow text-xs sm:text-sm"
                />
                <button className="mt-1 sm:mt-0 sm:ml-2 p-1 sm:p-2 bg-blue-500 text-white rounded hover:bg-blue-400 text-xs sm:text-sm">
                    <FaSearch />
                </button>
            </div>
            <button
                onClick={handleOpenModal}
                 className="mb-4 w-full sm:w-auto bg-blue-500 text-white p-1 sm:p-2 rounded hover:bg-blue-400 transition flex items-center justify-center text-xs sm:text-sm"
            >
                <FaUserPlus className="mr-1 sm:mr-2" /> Add Customer
            </button>
            <Modal
                isOpen={modalIsOpen}
                onRequestClose={handleCloseModal}
                style={{
                    content: {
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "95%",
                         maxWidth: "600px",
                        padding: "10px",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
                        overflowY: 'auto',
                         maxHeight: '90vh',
                    },
                    overlay: {
                        background: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "10px",
                    },
                }}
            >
                <h2 className="text-xl font-semibold mb-2">
                    {editingCustomer ? "Edit Customer" : "Add New Customer"}
                </h2>
                <form
                    onSubmit={editingCustomer ? handleUpdateCustomer : handleAddCustomer}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs">Name</label>
                            <input
                                type="text"
                                className="border border-gray-300 p-1 rounded text-xs"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs">Phone Number</label>
                            <input
                                type="tel"
                                className="border border-gray-300 p-1 rounded text-xs"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs">Address</label>
                            <input
                                type="text"
                                className="border border-gray-300 p-1 rounded text-xs"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs">Area</label>
                            <input
                                type="text"
                                className="border border-gray-300 p-1 rounded text-xs"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs">Customer Type</label>
                            <select
                                value={customerType}
                                onChange={(e) => setCustomerType(e.target.value)}
                                className="border border-gray-300 p-1 rounded text-xs"
                            >
                                <option value="individual">Individual</option>
                                <option value="business">Business</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-2 flex justify-end">
                        <button
                            type="button"
                             className="mr-1 px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-200 transition text-xs"
                            onClick={handleCloseModal}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 text-white p-1 rounded hover:bg-blue-400 transition flex items-center justify-center text-xs"
                        >
                            {editingCustomer ? <FaEdit className="mr-1" /> : <FaUserPlus className="mr-1" />}
                            {editingCustomer ? "Update" : "Add"}
                        </button>
                    </div>
                </form>
            </Modal>
            <h3 className="text-sm sm:text-lg font-semibold mb-2 sm:mb-4">
                Total Customers: {customers.length}
            </h3>
            <button
                onClick={downloadCustomerData}
                 className="mb-4 p-1 sm:p-2 bg-green-500 text-white rounded hover:bg-green-400 transition text-xs sm:text-sm"
            >
                <FaDownload className="mr-1 sm:mr-2" /> Download Customer Data
            </button>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300 text-xs sm:text-sm">
                    <thead>
                        <tr>
                             <th className="border px-1 sm:px-2 py-1">#</th>
                            <th className="border px-1 sm:px-2 py-1">Name</th>
                            <th className="border px-1 sm:px-2 py-1">Phone</th>
                            <th className="border px-1 sm:px-2 py-1">Address</th>
                            <th className="border px-1 sm:px-2 py-1">Area</th>
                            <th className="border px-1 sm:px-2 py-1">Type</th>
                            <th className="border px-1 sm:px-2 py-1">Orders</th>
                            <th className="border px-1 sm:px-2 py-1">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.map((customer, index) => (
                            <tr key={customer.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="border px-1 sm:px-2 py-1">{index+1}</td>
                                <td className="border px-1 sm:px-2 py-1">{customer.name}</td>
                                <td className="border px-1 sm:px-2 py-1">{customer.phoneNumber}</td>
                                <td className="border px-1 sm:px-2 py-1">{customer.address}</td>
                                <td className="border px-1 sm:px-2 py-1">{customer.area}</td>
                                <td
                                    className={`border px-1 sm:px-2 py-1 font-medium ${customer.customerType === 'business'
                                        ? 'text-blue-600'
                                        : 'text-green-600'
                                        }`}
                                > {customer.customerType === 'business' ? 'Business' : 'Individual'}
                                </td>
                                <td className="border px-1 sm:px-2 py-1">
                                    {
                                        orders.filter((order) => order.customer === customer.id)
                                            .length
                                    }
                                </td>
                                <td className="border px-1 sm:px-2 py-1 flex space-x-1">
                                    <button
                                        onClick={() => handleViewOrders(customer.id)}
                                        className="text-blue-500 hover:text-blue-400"
                                    >
                                        <FaEye size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleEditCustomer(customer)}
                                        className="text-yellow-500 hover:text-yellow-400"
                                    >
                                        <FaEdit size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteConfirm(customer)}
                                        className="text-red-500 hover:text-red-400"
                                    >
                                        <FaTrash size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirmation Modal for Customer */}
            <Modal
                isOpen={showDeleteConfirmation}
                onRequestClose={() => setShowDeleteConfirmation(false)}
                style={{
                    content: {
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                         width: "90%",
                        maxWidth: "400px",
                        padding: "10px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                    },
                    overlay: {
                         background: "rgba(0, 0, 0, 0.7)",
                        display: "flex",
                        justifyContent: "center",
                         alignItems: "center",
                        padding: "10px",
                    },
                }}
            >
                <h2 className="text-lg font-semibold mb-2 text-center">
                    Confirm Customer and Related Data Deletion?
                </h2>
                <p className="mb-4 text-center text-xs sm:text-sm">
                    Are you sure you want to delete this customer and <br /> all associated orders and payments?
                </p>
                <div className="flex justify-center space-x-2">
                    <button
                        onClick={() => setShowDeleteConfirmation(false)}
                         className="bg-gray-300 text-gray-700 px-2 py-1 rounded w-20 text-xs sm:text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDeleteCustomer}
                         className="bg-red-500 text-white px-2 py-1 rounded w-20 text-xs sm:text-sm"
                    >
                        Delete
                    </button>
                </div>
            </Modal>

            {/* Delete Confirmation Modal for Order */}
            <Modal
                isOpen={showOrderDeleteConfirmation}
                onRequestClose={() => setShowOrderDeleteConfirmation(false)}
                style={{
                    content: {
                        top: "50%",
                        left: "50%",
                         transform: "translate(-50%, -50%)",
                        width: "90%",
                        maxWidth: "400px",
                         padding: "10px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                    },
                    overlay: {
                        background: "rgba(0, 0, 0, 0.7)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "10px",
                    },
                }}
            >
                <h2 className="text-lg font-semibold mb-2 text-center">
                    Delete Order?
                </h2>
                <p className="mb-4 text-center text-xs sm:text-sm">
                    Are you sure you want to delete this order?
                </p>
                <div className="flex justify-center space-x-2">
                    <button
                        onClick={() => setShowOrderDeleteConfirmation(false)}
                        className="bg-gray-300 text-gray-700 px-2 py-1 rounded w-20 text-xs sm:text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDeleteOrder}
                        className="bg-red-500 text-white px-2 py-1 rounded w-20 text-xs sm:text-sm"
                    >
                        Delete
                    </button>
                </div>
            </Modal>
        </div>
    );
}
function CustomerDetails({ customerId }) {
    const [customer, setCustomer] = useState(null);
    const [orders, setOrders] = useState([]);
    const [orderStatuses, setOrderStatuses] = useState([]);
    const [showOrderDeleteConfirmation, setShowOrderDeleteConfirmation] = useState(false);
    const [orderIdToDelete, setOrderIdToDelete] = useState(null);
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
    const fetchCustomer = async () => {
        try {
            const customerDoc = doc(db, "customers", customerId);
            const customerSnapshot = await getDocs(customerDoc);

            if (!customerSnapshot.empty) {
                const customerData = customerSnapshot.docs[0].data();
                setCustomer({ id: customerSnapshot.docs[0].id, ...customerData });
            }
        } catch (error) {
            console.error("Error fetching customer:", error);
        }
    };

    const fetchOrders = async () => {
        try {
            const ordersCollection = collection(db, "orders");
            const ordersSnapshot = await getDocs(ordersCollection);
            const ordersList = ordersSnapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data() }))
                .filter((order) => order.customer === customerId);
            setOrders(ordersList);

            const statusSnapshot = await getDocs(collection(db, "order_status"));
            setOrderStatuses(statusSnapshot.docs.map(doc => ({ ...doc.data() })));
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
          setLoading(false);
        }
    };


    useEffect(() => {
        fetchCustomer();
        fetchOrders();
    }, [customerId]);


    const handleDeleteOrderConfirm = (orderId) => {
        setOrderIdToDelete(orderId);
        setShowOrderDeleteConfirmation(true);
    };

    const handleDeleteOrder = async () => {
        try {
            await deleteDoc(doc(db, "orders", orderIdToDelete));
            setOrders(orders.filter(order => order.id !== orderIdToDelete));
            setShowOrderDeleteConfirmation(false);
            toast.success("Order deleted successfully!");
        } catch (error) {
            console.error("Error deleting order:", error);
            toast.error("Error deleting order!");
        }
    };

    const handleUpdatePaymentStatus = async (orderId, newStatus, updatedAmountPaid) => {
        try {
            const orderRef = doc(db, "orders", orderId);

            const orderToUpdate = orders.find(o => o.id === orderId);

            if (!orderToUpdate) return;

            let newAmountPaid = 0;
            let newAmountUnpaid = 0;

            if (newStatus === "Paid") {
                newAmountPaid = orderToUpdate.total;
                newAmountUnpaid = 0;
            } else if (newStatus === "Partially Paid") {
                newAmountPaid = updatedAmountPaid;
                newAmountUnpaid = orderToUpdate.total - updatedAmountPaid;
            } else if (newStatus === "Unpaid") {
                newAmountPaid = 0;
                newAmountUnpaid = orderToUpdate.total;
            }

            await updateDoc(orderRef, {
                paymentStatus: newStatus,
                amountPaid: newAmountPaid,
                amountUnpaid: newAmountUnpaid
            });

            setOrders(orders.map(o => {
                if (o.id === orderId) {
                    return { ...o, paymentStatus: newStatus, amountPaid: newAmountPaid, amountUnpaid: newAmountUnpaid };
                }
                return o;
            }));

            toast.success(`Payment status updated to ${newStatus}!`);
        } catch (error) {
            console.error("Error updating payment status:", error);
            toast.error("Error updating payment status!");
        }
    };


    return (
        <div className="container mx-auto p-4 mt-8">
            {loading && <LoadingSpinner />}
            <ToastContainer />
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">
                Customer Details
            </h2>
            {customer && (
                <div className="bg-gray-100 p-2 sm:p-4 rounded-md mb-2 sm:mb-4 text-xs sm:text-sm">
                    <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">
                        Customer Details
                    </h3>
                    <p>
                        <strong>Name:</strong> {customer.name}
                    </p>
                    <p>
                        <strong>Phone:</strong> {customer.phoneNumber}
                    </p>
                    <p>
                        <strong>Address:</strong> {customer.address}
                    </p>
                </div>
            )}
            <div className="mb-4">
                <h3 className="text-sm sm:text-lg font-semibold mb-1 sm:mb-2">Order History</h3>
                <div className="overflow-x-auto">
                    {orders.length > 0 ? (
                        <table className="min-w-full bg-white border border-gray-300 text-xs sm:text-sm">
                            <thead>
                                <tr>
                                    <th className="border px-1 sm:px-2 py-1">Product</th>
                                    <th className="border px-1 sm:px-2 py-1">Qty</th>
                                    <th className="border px-1 sm:px-2 py-1">Total</th>
                                    <th className="border px-1 sm:px-2 py-1">Paid</th>
                                    <th className="border px-1 sm:px-2 py-1">Unpaid</th>
                                    <th className="border px-1 sm:px-2 py-1">Status</th>
                                    <th className="border px-1 sm:px-2 py-1">Date</th>
                                    <th className="border px-1 sm:px-2 py-1">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order, index) => (
                                    <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="border px-1 sm:px-2 py-1">
                                            {order.product}
                                        </td>
                                        <td className="border px-1 sm:px-2 py-1">
                                            {order.quantity}
                                        </td>
                                        <td className="border px-1 sm:px-2 py-1">₹{order.total}</td>
                                        <td className="border px-1 sm:px-2 py-1">
                                            ₹{order.amountPaid}
                                        </td>
                                        <td className="border px-1 sm:px-2 py-1">
                                            ₹{order.amountUnpaid}
                                        </td>
                                        <td className="border px-1 sm:px-2 py-1 flex items-center">
                                            {
                                                orderStatuses.find(status => status.name === order.paymentStatus)?.displayText ?
                                                    <span className={`text-${orderStatuses.find(status => status.name === order.paymentStatus)?.displayColor}-500 flex items-center`}>
                                                        <FaCheckCircle className="mr-1" size={12} />
                                                        {orderStatuses.find(status => status.name === order.paymentStatus)?.displayText}
                                                    </span>
                                                    : (
                                                        <span className="text-orange-500">Partially Paid</span>
                                                    )}
                                        </td>
                                        <td className="border px-1 sm:px-2 py-1">
                                            {new Date(order.date).toLocaleDateString()}
                                        </td>
                                        <td className="border px-1 sm:px-2 py-1">
                                            <button
                                                onClick={() => handleDeleteOrderConfirm(order.id)}
                                                className="text-red-500 hover:text-red-400"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                            {order.paymentStatus !== "Paid" && (
                                                <select
                                                    className="ml-1 border border-gray-300 p-0.5 rounded text-xs focus:outline-none"
                                                    value={order.paymentStatus}
                                                    onChange={(e) =>
                                                        handleUpdatePaymentStatus(
                                                            order.id,
                                                            e.target.value,
                                                            order.total
                                                        )
                                                    }
                                                >
                                                    {orderStatuses.map(status => (
                                                        <option key={status.name} value={status.name}>{status.displayText}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center mt-4">No orders found for this customer.</p>
                    )}
                </div>
            </div>
            <Modal
                isOpen={showOrderDeleteConfirmation}
                onRequestClose={() => setShowOrderDeleteConfirmation(false)}
                style={{
                    content: {
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "90%",
                        maxWidth: "400px",
                        padding: "10px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                    },
                    overlay: {
                        background: "rgba(0, 0, 0, 0.7)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "10px",
                    },
                }}
            >
                <h2 className="text-lg font-semibold mb-2 text-center">
                    Delete Order?
                </h2>
                <p className="mb-4 text-center">
                    Are you sure you want to delete this order?
                </p>
                <div className="flex justify-center space-x-2">
                    <button
                        onClick={() => setShowOrderDeleteConfirmation(false)}
                         className="bg-gray-300 text-gray-700 px-2 py-1 rounded w-20 text-xs sm:text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDeleteOrder}
                         className="bg-red-500 text-white px-2 py-1 rounded w-20 text-xs sm:text-sm"
                    >
                        Delete
                    </button>
                </div>
            </Modal>
        </div>
    );
}


export default Customers;

        