import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    where,
    Timestamp,
    query
} from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import Modal from "react-modal";
import { v4 as uuidv4 } from 'uuid';

Modal.setAppElement("#root");

const BillTemplate1 = ({ order, id }) => (
    <div className="space-y-4" id={id}>
        <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-blue-500">
                STA Foods & Oils .Co
            </h3>
            <p className="text-gray-600 text-lg font-medium">
                Sanjarpur,Azamgarh,Uttar Pradesh
            </p>
            <p className="text-gray-600 text-lg font-medium">
                Phone: +91 99534 10116 | Email: stafoodsoils@gmail.com
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <p className="text-gray-700 font-semibold">
                    Customer: {order.customerName}
                </p>
                <p className="text-gray-700">Order Date: {order.date}</p>
                <p className="text-gray-700">
                    Payment Status: <span className="font-semibold">{order.paymentStatus}</span>
                </p>
            </div>
            <div>
                <p className="text-gray-700">
                    Bill No: <span className="font-semibold">#{order.billNo}</span>
                </p>
                <p className="text-gray-700">
                    Total: <span className="font-semibold text-green-600">₹{order.total}</span>
                </p>
                <p className="text-gray-700">
                    Amount Paid: <span className="text-green-600">₹{order.amountPaid}</span>
                </p>
                <p className="text-gray-700">
                    Amount Unpaid: <span className="text-red-600">₹{order.amountUnpaid}</span>
                </p>
            </div>
        </div>
        <div className="my-6">
            <table
                className="min-w-full border rounded-lg shadow-sm table-auto"
                id="billTable"
            >
                <thead className="bg-blue-500 text-white">
                    <tr>
                        <th className="p-3 font-semibold text-left">Product</th>
                        <th className="p-3 font-semibold text-right">Quantity</th>
                        <th className="p-3 font-semibold text-right">Price</th>
                        <th className="p-3 font-semibold text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, index) => (
                        <tr
                            key={index}
                            className={`bg-gray-50 border-b border-gray-200 ${index % 2 === 0 ? "bg-gray-100" : ""
                                }`}
                        >
                            <td className="p-3">{item.productName}</td>
                            <td className="p-3 text-right">{item.quantity}</td>
                            <td className="p-3 text-right">₹{item.price}</td>
                            <td className="p-3 text-right font-semibold">
                                ₹{item.price * item.quantity}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-100">
                    <tr>
                        <td colSpan="3" className="p-3 font-semibold text-right">
                            Grand Total:
                        </td>
                        <td className="p-3 text-right text-green-600 font-bold">
                            ₹{order.total}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div className="text-center text-sm text-gray-500">
            <p className="mb-1">Thank you for your business!</p>
            <p>Please make payment by the due date if applicable.</p>
        </div>
    </div>
);

const BillTemplate2 = ({ order, id }) => (
    <div className="space-y-4" id={id}>
        <div className="text-center mb-4">
            <h3 className="text-2xl font-bold text-green-500">
                STA Foods & Oils .Co
            </h3>
            <p className="text-gray-600 text-lg font-medium">
                Sanjarpur,Azamgarh,Uttar Pradesh
            </p>
            <p className="text-gray-600 text-lg font-medium">
                Phone: +91 99534 10116 | Email: stafoodsoils@gmail.com
            </p>
        </div>
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-gray-700 font-semibold">
                    Customer: {order.customerName}
                </p>
                <p className="text-gray-700">Order Date: {order.date}</p>
            </div>
            <div>
                <p className="text-gray-700">
                    Bill No: <span className="font-semibold">#{order.billNo}</span>
                </p>
                <p className="text-gray-700">
                    Payment Status: <span className="font-semibold">{order.paymentStatus}</span>
                </p>
            </div>
        </div>
        <div className="flex justify-between items-start mb-4">
            <p className="text-gray-700">
                Amount Paid: <span className="text-green-600">₹{order.amountPaid}</span>
            </p>
            <p className="text-gray-700">
                Amount Unpaid: <span className="text-red-600">₹{order.amountUnpaid}</span>
            </p>
        </div>
        <div className="my-6">
            <table
                className="min-w-full border rounded-lg shadow-sm table-auto"
                id="billTable"
            >
                <thead className="bg-green-500 text-white">
                    <tr>
                        <th className="p-3 font-semibold text-left">Product</th>
                        <th className="p-3 font-semibold text-right">Quantity</th>
                        <th className="p-3 font-semibold text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, index) => (
                        <tr
                            key={index}
                            className={`bg-gray-50 border-b border-gray-200 ${index % 2 === 0 ? "bg-gray-100" : ""
                                }`}
                        >
                            <td className="p-3">{item.productName}</td>
                            <td className="p-3 text-right">{item.quantity}</td>
                            <td className="p-3 text-right font-semibold">
                                ₹{item.price * item.quantity}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-100">
                    <tr>
                        <td colSpan="2" className="p-3 font-semibold text-right">
                            Grand Total:
                        </td>
                        <td className="p-3 text-right text-green-600 font-bold">
                            ₹{order.total}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div className="text-center text-sm text-gray-500">
            <p className="mb-1">Thank you for your business!</p>
            <p>Please make payment by the due date if applicable.</p>
        </div>
    </div>
);

function BillModal({ isOpen, onClose, order }) {
    const [sharing, setSharing] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState("template1");
    if (!isOpen) return null;

    const handleDownloadPDF = async () => {
        const billElement = document.getElementById(`bill-container-${selectedTemplate}`);
        try {
            const canvas = await html2canvas(billElement, {
                scale: 1.5,
            });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            const pdfBlob = pdf.output('blob');
            return pdfBlob;
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Error generating PDF!");
            return null;
        }
    };

    const handleShare = async (type) => {
        setSharing(true);
        try {
            const pdfBlob = await handleDownloadPDF();
            if (pdfBlob) {
                const pdfFile = new File([pdfBlob], "order_bill.pdf", {
                    type: "application/pdf",
                });
                if (type === 'whatsapp' && navigator.share) {
                    navigator.share({
                        files: [pdfFile],
                        title: 'Order Bill',
                        text: 'Check out this order bill!',
                    })
                        .then(() => console.log('Shared via Web Share API'))
                        .catch((error) => {
                            console.error('Error sharing via Web Share API:', error);
                            toast.info("Sharing is not supported on this browser. Kindly share via PDF");
                        });
                } else {
                    const pdfUrl = URL.createObjectURL(pdfFile);
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = "order_bill.pdf";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(pdfUrl);
                    toast.success('PDF Download Initiated');
                }
            }
        } finally {
            setSharing(false);
        }
    };

    const renderTemplate = () => {
        const templateId = `bill-container-${selectedTemplate}`;
        switch (selectedTemplate) {
            case "template1":
                return <BillTemplate1 order={order} id={templateId} />;
            case "template2":
                return <BillTemplate2 order={order} id={templateId} />;
            default:
                return <BillTemplate1 order={order} id={templateId} />;
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            className="modal"
            overlayClassName="modal-overlay"
            style={{
                content: {
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    margin: 'auto',
                },
            }}
        >
            <div className="modal-content p-4 rounded-lg shadow-md bg-white relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-800">Order Bill</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-red-600 font-bold text-xl"
                    >
                        ×
                    </button>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Template
                    </label>
                    <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="template1">Template 1</option>
                        <option value="template2">Template 2</option>
                    </select>
                </div>
                {renderTemplate()}
                <div className="flex justify-center mt-4">
                    <button
                        onClick={() => handleShare('pdf')}
                        disabled={sharing}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sharing ? (
                            <span className="flex items-center justify-center">
                                Generating PDF...
                            </span>
                        ) : (
                            "Download PDF"
                        )}
                    </button>
                    <button
                        onClick={() => handleShare('whatsapp')}
                        disabled={sharing}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sharing ? (
                            <span className="flex items-center justify-center">
                                Sharing...
                            </span>
                        ) : (
                            "Share via WhatsApp"
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

function Orders() {
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [quantities, setQuantities] = useState({});
    const [paymentStatus, setPaymentStatus] = useState("Paid");
    const [amountPaid, setAmountPaid] = useState(0);
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [currentOrder, setCurrentOrder] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [totalOrderAmount, setTotalOrderAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));


    useEffect(() => {
        const fetchData = async () => {
            const customersSnapshot = await getDocs(collection(db, "customers"));
            const productsSnapshot = await getDocs(collection(db, "inventory"));
            setCustomers(
                customersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            );
            setProducts(
                productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            );
        };
        fetchData();
    }, []);

    const filteredCustomers = searchQuery
        ? customers.filter(
            (customer) =>
                customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                customer.phoneNumber.includes(searchQuery)
        )
        : customers;

    const handleQuantityChange = (productId, quantity) => {
           setQuantities((prevQuantities) => ({
               ...prevQuantities,
                [productId]: quantity,
            }));
    };

    const handleProductSelection = (e) => {
        const productId = e.target.value;
        const isChecked = e.target.checked;

         if (isChecked) {
               setSelectedProducts([...selectedProducts, productId]);
           } else {
             setSelectedProducts(selectedProducts.filter((id) => id !== productId));
               setQuantities((prevQuantities) => {
                     const { [productId]: removed, ...rest } = prevQuantities;
                   return rest;
              });
        }
    };

    useEffect(() => {
        const total = selectedProducts.reduce((sum, productId) => {
            const product = products.find((p) => p.id === productId);
            const quantity = quantities[productId] || 1;
            return sum + product.price * quantity;
        }, 0);
        setTotalOrderAmount(total);

        if (paymentStatus === "Paid") {
            setAmountPaid(total);
        } else {
            setAmountPaid(0);
        }
    }, [selectedProducts, quantities, products, paymentStatus]);

   const handleCreateOrder = async (e) => {
        e.preventDefault();
         setLoading(true);
        try {
            if (selectedCustomer && selectedProducts.length > 0) {
                const customer = customers.find((c) => c.id === selectedCustomer);

                if (!customer) {
                    toast.error("Invalid customer selected.");
                    return;
                }

                const items = selectedProducts
                    .map((productId) => {
                        const product = products.find((p) => p.id === productId);
                        const quantity = quantities[productId] || 1;
                         if (product.quantity < quantity) {
                            toast.error(`Insufficient stock for ${product.name}.`);
                            return null;
                        }
                        return {
                            productId,
                            productName: product.name,
                            quantity,
                            price: product.price,
                        };
                    })
                    .filter((item) => item !== null);

                if (items.length === 0) {
                    return;
                }

                const total = items.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );
                  let amountUnpaid = total;

                for (const item of items) {
                    const product = products.find((p) => p.id === item.productId);
                    await updateDoc(doc(db, "inventory", item.productId), {
                        quantity: product.quantity - item.quantity,
                    });
                }

                if (paymentStatus === "Paid") {
                    amountUnpaid = 0;
                } 
                 

                const formatDateForFirestore = (date) => {
                  try {
                   const dateObject = new Date(date);
                    if (isNaN(dateObject.getTime())) {
                        return null;
                    }
                      return dateObject.toISOString();
                    } catch (error) {
                        console.error("Error formatting date:", error);
                       return null;
                    }
                };

                const formattedDate = formatDateForFirestore(orderDate);
                 if (!formattedDate) {
                     toast.error("Invalid Date. Please select a valid date.");
                        return;
                    }

                const billNo = uuidv4();

                const order = {
                    billNo: billNo,
                    customer: selectedCustomer,
                    customerName: customer.name,
                    items,
                    total,
                    date: formattedDate,
                    paymentStatus,
                    amountPaid,
                    amountUnpaid,
                };
                const newOrderRef = await addDoc(collection(db, "orders"), order);
                toast.success("Order created successfully!");
               
                if (paymentStatus === "Paid" || (paymentStatus === "Unpaid" && amountPaid > 0)) {
                   await handlePaymentRecord(
                       selectedCustomer,
                       newOrderRef.id,
                       paymentStatus === "Paid" ? total : amountPaid
                     );
                }
              
                setCurrentOrder(order);
                setIsBillModalOpen(true);
                resetForm();
            } else {
                toast.error("Please fill in all fields correctly.");
            }
        } catch (error) {
            console.error("Error creating order:", error);
            toast.error("Error creating order. Please try again.");
        } finally {
            setLoading(false);
        }
    };

  const handlePaymentRecord = async (customerId, orderId, amount) => {
    try {
        const customerPaymentRef = collection(db, "CustomerPayments");
        const customerPaymentQuery = query(customerPaymentRef, where("customerId", "==", customerId));
        const querySnapshot = await getDocs(customerPaymentQuery);

        if (!querySnapshot.empty) {
            // Customer payment record exists. Update it.
            const customerPaymentDoc = querySnapshot.docs[0];
            const existingPayments = customerPaymentDoc.data().payments || [];
             const updatedPayments = [...existingPayments, { orderId, amountPaid: amount}];
            await updateDoc(customerPaymentDoc.ref, {
                payments: updatedPayments,
                paymentDate: Timestamp.fromDate(new Date()),
            });
              toast.success("Payment record updated successfully.");
        } else {
            // No existing payment record. Create a new one.
             await addDoc(customerPaymentRef, {
                customerId,
                payments: [{orderId, amountPaid: amount}],
                paymentDate: Timestamp.fromDate(new Date()),
            });
             toast.success("New Payment record created successfully.");
        }
    } catch (error) {
        console.error("Error handling payment record:", error);
         toast.error("Failed to handle payment record.");
    }
};


    const resetForm = () => {
        setSelectedCustomer("");
        setSelectedProducts([]);
        setQuantities({});
        setPaymentStatus("Paid");
        setAmountPaid(0);
        setSearchQuery("");
        setOrderDate(new Date().toISOString().slice(0, 10));
    };

    const modalStyles = {
        content: {
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            margin: 'auto',
        },
        overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
    };


    return (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-lg mx-auto">
            <ToastContainer />
            <h2 className="text-3xl font-semibold mb-6 text-center">Create Order</h2>
            <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Order Date
                    </label>
                   <input
                       type="date"
                       value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                     />
              </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Customer
                    </label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter name or phone number"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Customer
                    </label>
                    <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select Customer</option>
                        {filteredCustomers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                                {customer.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Products
                    </label>
                    <div className="space-y-3">
                        {products.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-2 border-b border-gray-200 last:border-b-0">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        value={product.id}
                                        checked={selectedProducts.includes(product.id)}
                                        onChange={handleProductSelection}
                                        className="mr-2"
                                    />
                                    <label className="flex-1">{product.name}</label>
                                </div>
                                <div className="text-sm text-gray-600 ml-auto flex space-x-2">
                                    <span>Stock: {product.quantity}</span>
                                    <span>₹{product.price}</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantities[product.id] || ""}
                                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                        className="w-16 ml-2 border border-gray-300 p-1 rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                        placeholder="Qty"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Amount
                    </label>
                    <div className="border border-gray-300 p-2 rounded-lg w-full text-right font-semibold text-green-600">
                        ₹{totalOrderAmount}
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Status
                    </label>
                    <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                        className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="Paid">Paid</option>
                         <option value="Unpaid">Unpaid</option>
                    </select>
                </div>
                {paymentStatus === "Unpaid" && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount Paid
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
                            className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Amount Paid"
                        />
                    </div>
                )}
                <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                >
                     {loading ? (
                        <span className="flex items-center justify-center">
                            Creating Order...
                        </span>
                    ) : (
                        "Create Order"
                    )}
                </button>
            </form>
            <BillModal
                isOpen={isBillModalOpen}
                onClose={() => setIsBillModalOpen(false)}
                order={currentOrder}
                style={modalStyles}
            />
        </div>
    );
}

export default Orders;