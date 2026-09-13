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
import Modal from "react-modal";
import { v4 as uuidv4 } from 'uuid';
import { formatINR } from "../lib/format";
import { COMPANY, buildInvoice, invoiceFileName, amountInWords, fmtDate } from "../lib/pdf";
import { PageHeading } from "./ui";
import { DEMO_MODE, demoCustomers } from "../lib/demoData";

Modal.setAppElement("#root");

const previewMoney = (value) =>
    "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        .format(Number(value) || 0);

const statusPill = (status) => {
    if (status === "Paid") return "bg-mint text-mint-fg";
    if (status === "Partially Paid") return "bg-tangerine/10 text-tangerine";
    return "bg-red-50 text-red-600";
};

/** On-screen preview — mirrors the generated PDF so what you see is what you send. */
const InvoicePreview = ({ order, customer, variant }) => {
    const invoiceNo = String(order.billNo ?? "").slice(0, 8).toUpperCase();
    const orderDate = order.date ? fmtDate(order.date) : "-";
    const detailed = variant === "detailed";
    const due = Number(order.amountUnpaid) || 0;

    return (
        <div className="border border-ash rounded-xl overflow-hidden">
            <div className="bg-ink text-white px-5 py-4 flex justify-between items-start gap-4">
                <div>
                    <p className="text-body-lg font-semibold">{COMPANY.name}</p>
                    <p className="text-caption text-silver mt-1">
                        {COMPANY.tagline} · {COMPANY.address}
                    </p>
                    <p className="text-caption text-silver">
                        {COMPANY.phone} · {COMPANY.email}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-subheading font-semibold tracking-tight">INVOICE</p>
                    <p className="text-caption text-silver">No. {invoiceNo}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                <div className="bg-paper border border-ash rounded-lg p-3">
                    <p className="text-caption font-semibold text-fog uppercase tracking-wide">Billed to</p>
                    <p className="text-body font-medium text-charcoal mt-1.5">
                        {order.customerName || customer?.name || "-"}
                    </p>
                    <p className="text-body text-steel">{customer?.phoneNumber || "-"}</p>
                    <p className="text-body text-steel">{customer?.address || "-"}</p>
                </div>
                <div className="bg-paper border border-ash rounded-lg p-3">
                    <p className="text-caption font-semibold text-fog uppercase tracking-wide">Invoice details</p>
                    <p className="text-body text-steel mt-1.5">Invoice no: <span className="text-charcoal font-medium">{invoiceNo}</span></p>
                    <p className="text-body text-steel">Date: <span className="text-charcoal font-medium">{orderDate}</span></p>
                    <p className="text-body text-steel">
                        Status:{" "}
                        <span className={`inline-block px-2 py-0.5 rounded-full text-caption font-medium ${statusPill(order.paymentStatus)}`}>
                            {order.paymentStatus}
                        </span>
                    </p>
                </div>
            </div>

            <div className="px-4 pb-4">
                <table className="w-full text-body border border-ash rounded-lg overflow-hidden">
                    <thead className="bg-ink text-white">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium w-10">#</th>
                            <th className="px-3 py-2 text-left font-medium">Description</th>
                            <th className="px-3 py-2 text-right font-medium">Qty</th>
                            {detailed && <th className="px-3 py-2 text-right font-medium">Rate</th>}
                            <th className="px-3 py-2 text-right font-medium">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(order.items ?? []).map((item, index) => (
                            <tr key={index} className="border-t border-ash">
                                <td className="px-3 py-2 text-steel tabular-nums">{index + 1}</td>
                                <td className="px-3 py-2 text-charcoal">{item.productName}</td>
                                <td className="px-3 py-2 text-charcoal text-right tabular-nums">{item.quantity}</td>
                                {detailed && (
                                    <td className="px-3 py-2 text-steel text-right tabular-nums">{previewMoney(item.price)}</td>
                                )}
                                <td className="px-3 py-2 text-charcoal text-right tabular-nums">
                                    {previewMoney((Number(item.price) || 0) * (Number(item.quantity) || 0))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mt-3">
                    <div className="w-full sm:w-72">
                        <div className="flex justify-between text-body py-1">
                            <span className="text-steel">Subtotal</span>
                            <span className="text-charcoal tabular-nums">{previewMoney(order.total)}</span>
                        </div>
                        <div className="flex justify-between text-body py-1 border-b border-ash">
                            <span className="text-steel">Amount paid</span>
                            <span className="text-charcoal tabular-nums">{previewMoney(order.amountPaid)}</span>
                        </div>
                        <div className={`flex justify-between mt-2 px-3 py-2 rounded-lg font-semibold ${due > 0 ? "bg-red-50 text-red-600" : "bg-mint text-mint-fg"}`}>
                            <span>{due > 0 ? "Balance due" : "Fully paid"}</span>
                            <span className="tabular-nums">{previewMoney(due)}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-ash">
                    <p className="text-caption font-semibold text-fog uppercase tracking-wide">Amount in words</p>
                    <p className="text-body text-charcoal mt-1">{amountInWords(order.total)}</p>
                </div>
            </div>
        </div>
    );
};

function BillModal({ isOpen, onClose, order, customer }) {
    const [sharing, setSharing] = useState(false);
    const [variant, setVariant] = useState("detailed");
    if (!isOpen || !order) return null;

    // Built natively with jsPDF — vector text, selectable and a fraction of the
    // size of the html2canvas screenshot this used to produce.
    const makePdf = () => buildInvoice(order, { variant, customer });

    const handleDownload = () => {
        try {
            makePdf().save(invoiceFileName(order));
            toast.success("Invoice downloaded");
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast.error("Could not generate the invoice");
        }
    };

    const handleShare = async () => {
        setSharing(true);
        try {
            const blob = makePdf().output("blob");
            const file = new File([blob], invoiceFileName(order), { type: "application/pdf" });

            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: "Invoice", text: "Your invoice" });
            } else {
                toast.info("Sharing isn't supported here — downloading instead");
                makePdf().save(invoiceFileName(order));
            }
        } catch (error) {
            if (error?.name !== "AbortError") {
                console.error("Error sharing PDF:", error);
                toast.error("Could not share the invoice");
            }
        } finally {
            setSharing(false);
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
                    maxWidth: '860px',
                    width: '92vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    margin: 'auto',
                    borderRadius: '12px',
                    border: '1px solid #e5e5e5',
                    padding: '20px',
                },
                overlay: {
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                },
            }}
        >
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h2 className="text-subheading font-medium text-charcoal">Invoice preview</h2>
                <div className="flex items-center gap-2">
                    <select
                        value={variant}
                        onChange={(e) => setVariant(e.target.value)}
                        className="border border-ink px-2 py-1.5 rounded-md text-body focus:outline-none focus:ring-2 focus:ring-accent"
                        aria-label="Invoice layout"
                    >
                        <option value="detailed">Detailed (with rates)</option>
                        <option value="compact">Compact</option>
                    </select>
                    <button
                        onClick={onClose}
                        className="text-fog hover:text-charcoal px-2 text-xl leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
            </div>

            <InvoicePreview order={order} customer={customer} variant={variant} />

            <div className="flex flex-wrap justify-end gap-2 mt-4">
                <button
                    onClick={handleShare}
                    disabled={sharing}
                    className="bg-canvas hover:bg-paper text-charcoal border border-ash px-4 py-2 rounded-lg text-body font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {sharing ? "Preparing…" : "Share"}
                </button>
                <button
                    onClick={handleDownload}
                    className="bg-ink hover:bg-charcoal text-white px-4 py-2 rounded-lg text-body font-medium"
                >
                    Download PDF
                </button>
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
    const [currentCustomer, setCurrentCustomer] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [totalOrderAmount, setTotalOrderAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));


    useEffect(() => {
        const fetchData = async () => {
            if (DEMO_MODE) {
                setCustomers(demoCustomers);
                setProducts([
                    { id: "d1", name: "Mustard Oil 1L", quantity: 240, price: 185 },
                    { id: "d2", name: "Mustard Oil 5L", quantity: 64, price: 880 },
                    { id: "d5", name: "Groundnut Oil 2L", quantity: 120, price: 420 },
                ]);
                return;
            }
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

                if (DEMO_MODE) {
                    const demoTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
                    setCurrentOrder({
                        billNo: uuidv4(),
                        customerName: customer.name,
                        items,
                        total: demoTotal,
                        date: new Date(orderDate).toISOString(),
                        paymentStatus,
                        amountPaid: paymentStatus === "Paid" ? demoTotal : amountPaid,
                        amountUnpaid: paymentStatus === "Paid" ? 0 : demoTotal - amountPaid,
                    });
                    setCurrentCustomer(customer);
                    setIsBillModalOpen(true);
                    return;
                }

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
                setCurrentCustomer(customer);
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


    return (
        <div className="bg-paper min-h-screen">
          <div className="max-w-[640px] mx-auto px-4 sm:px-6 py-6">
            <ToastContainer />
            <PageHeading title="Create order" subtitle="Select a customer and the products they're buying." />
            <div className="p-5 bg-canvas rounded-xl border border-ash">
            <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="mb-1">
                    <label className="block text-caption font-medium text-steel mb-1">
                      Order Date
                    </label>
                   <input
                       type="date"
                       value={orderDate}
                      onChange={(e) => setOrderDate(e.target.value)}
                      className="border border-ink p-2 rounded-md w-full text-body focus:outline-none focus:ring-2 focus:ring-accent"
                     />
              </div>
                <div className="mb-1">
                    <label className="block text-caption font-medium text-steel mb-1">
                        Search Customer
                    </label>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border border-ink p-2 rounded-md w-full text-body focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Enter name or phone number"
                    />
                </div>
                <div className="mb-1">
                    <label className="block text-caption font-medium text-steel mb-1">
                        Select Customer
                    </label>
                    <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="border border-ink p-2 rounded-md w-full text-body focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <option value="">Select Customer</option>
                        {filteredCustomers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                                {customer.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mb-1">
                    <label className="block text-caption font-medium text-steel mb-1">
                        Select Products
                    </label>
                    <div className="border border-ash rounded-xl divide-y divide-ash">
                        {products.map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-3">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        value={product.id}
                                        checked={selectedProducts.includes(product.id)}
                                        onChange={handleProductSelection}
                                        className="mr-2 accent-accent"
                                    />
                                    <label className="flex-1 text-body text-charcoal">{product.name}</label>
                                </div>
                                <div className="text-body text-steel ml-auto flex items-center gap-2">
                                    <span>Stock: {product.quantity}</span>
                                    <span className="tabular-nums">{formatINR(product.price)}</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={quantities[product.id] || ""}
                                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                        className="w-16 border border-ink p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-center"
                                        placeholder="Qty"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mb-1">
                    <label className="block text-caption font-medium text-steel mb-1">
                        Total Amount
                    </label>
                    <div className="border border-ash rounded-md p-2 w-full text-right font-semibold text-charcoal bg-paper tabular-nums">
                        {formatINR(totalOrderAmount)}
                    </div>
                </div>
                <div className="mb-1">
                    <label className="block text-caption font-medium text-steel mb-1">
                        Payment Status
                    </label>
                    <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                        className="border border-ink p-2 rounded-md w-full text-body focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <option value="Paid">Paid</option>
                         <option value="Unpaid">Unpaid</option>
                    </select>
                </div>
                {paymentStatus === "Unpaid" && (
                    <div className="mb-1">
                        <label className="block text-caption font-medium text-steel mb-1">
                            Amount Paid
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
                            className="border border-ink p-2 rounded-md w-full text-body focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder="Amount Paid"
                        />
                    </div>
                )}
                <button
                    type="submit"
                    className="w-full bg-ink hover:bg-charcoal text-white py-2.5 rounded-lg font-medium text-body-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            </div>
            <BillModal
                isOpen={isBillModalOpen}
                onClose={() => setIsBillModalOpen(false)}
                order={currentOrder}
                customer={currentCustomer}
            />
          </div>
        </div>
    );
}

export default Orders;