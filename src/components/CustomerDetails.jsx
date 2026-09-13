import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  FaTrash,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaPlus,
  FaPrint,
  FaComment,
  FaEdit,
} from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatINR } from "../lib/format";
import { buildStatement } from "../lib/pdf";
import { PageContainer, PageHeading, StatTile, Card } from "./ui";
import { DEMO_MODE, demoCustomers, demoOrders } from "../lib/demoData";

Modal.setAppElement("#root");

const loaderStyle = `
    .loader {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #2563eb;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        animation: spin 2s linear infinite;
    }
    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`;

function CustomerDetails() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [totalOrderAmount, setTotalOrderAmount] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [monthFilter, setMonthFilter] = useState(""); // Initialize monthFilter as empty string
  const [yearFilter, setYearFilter] = useState("all"); // Initialize yearFilter with 'all'
  const [typeFilter, setTypeFilter] = useState("all");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [paymentRecords, setPaymentRecords] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [editedItems, setEditedItems] = useState([]);
  const [comment, setComment] = useState("");
  const [commentOrderId, setCommentOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [updatingComment, setUpdatingComment] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);

  const fetchCustomer = async () => {
    setLoading(true);
    if (DEMO_MODE) {
      setCustomer(demoCustomers.find((c) => c.id === customerId) ?? null);
      setLoading(false);
      return;
    }
    try {
      const customerDocRef = doc(db, "customers", customerId);
      const customerSnapshot = await getDoc(customerDocRef);

      if (customerSnapshot.exists()) {
        setCustomer({ id: customerSnapshot.id, ...customerSnapshot.data() });
      } else {
        console.log("No such document!");
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
    } finally {
      setLoading(false);
    }
  };

    const fetchOrders = async () => {
        setLoading(true);
        if (DEMO_MODE) {
            const mine = demoOrders
                .filter((o) => o.customer === customerId)
                .map((o) => ({ ...o, type: "order" }));
            setTotalOrderAmount(mine.reduce((s, o) => s + o.total, 0));
            setTotalPaid(mine.reduce((s, o) => s + (o.amountPaid || 0), 0));
            setTotalUnpaid(mine.reduce((s, o) => s + (o.amountUnpaid || 0), 0));
            const payments = mine.flatMap((o) =>
                (o.paymentRecords || []).map((r) => ({
                    type: "payment",
                    paymentDate: r.paymentDate.toDate(),
                    totalPaid: r.amountPaid,
                }))
            );
            const entries = [...mine, ...payments].sort((a, b) => {
                const da = a.type === "order" ? new Date(a.date) : a.paymentDate;
                const dbb = b.type === "order" ? new Date(b.date) : b.paymentDate;
                return dbb - da;
            });
            setLedgerEntries(typeFilter === "all" ? entries : entries.filter((e) => e.type === typeFilter));
            setLoading(false);
            return;
        }
        try {
            const ordersCollection = collection(db, "orders");
            const ordersSnapshot = await getDocs(ordersCollection);
            const ordersList = ordersSnapshot.docs
                .map((doc) => ({ id: doc.id, ...doc.data(), type: "order" }))
                .filter((order) => order.customer === customerId);

            const filteredOrders = ordersList.filter((order) => {
                const orderDate = new Date(order.date);

                if (isNaN(orderDate)) {
                    console.error(`Invalid date: ${order.date}`);
                    return false;
                }

                const monthMatches = monthFilter
                    ? orderDate.getMonth() + 1 === parseInt(monthFilter)
                    : true;
                 const yearMatches = yearFilter === 'all' ? true : (yearFilter ? orderDate.getFullYear() === parseInt(yearFilter) : true)


                return monthMatches && yearMatches;
            });

            const sortedOrders = filteredOrders.sort(
                (a, b) => new Date(b.date) - new Date(a.date)
            );

            const totalOrder = sortedOrders.reduce(
                (sum, order) => sum + order.total,
                0
            );
            setTotalOrderAmount(totalOrder);
            const totalPaidAmount = sortedOrders.reduce(
                (sum, order) => sum + (order.amountPaid || 0),
                0
            );
            const totalUnpaidAmount = sortedOrders.reduce(
                (sum, order) => sum + order.amountUnpaid,
                0
            );

            setTotalPaid(totalPaidAmount);
            setTotalUnpaid(totalUnpaidAmount);
            const paymentRecordsData = {};

            const paymentsQuery = query(
                collection(db, "CustomerPayments"),
                where("customerId", "==", customerId)
            );
            const paymentsSnapshot = await getDocs(paymentsQuery);

            const paymentsList = paymentsSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
                type: "payment",
                paymentDate: doc.data().paymentDate?.toDate(),
                payments: doc.data().payments || [],
            }));

            const groupedPayments = {};
            paymentsList.forEach((payment) => {
                const dateKey = payment.paymentDate.toLocaleDateString();
                if (!groupedPayments[dateKey]) {
                    groupedPayments[dateKey] = {
                        paymentDate: payment.paymentDate,
                        payments: [],
                        type: "payment",
                    };
                }
                groupedPayments[dateKey].payments.push(
                    ...payment.payments.map((p) => ({ ...p }))
                );
            });

            for (const order of sortedOrders) {
                const orderPayments = Object.values(groupedPayments)
                    .filter((payment) => {
                        if (!payment.payments) return false;
                        return payment.payments.some((p) => p.orderId === order.id);
                    })
                    .flatMap((payment) =>
                        payment.payments.map((p) => ({
                            ...p,
                            paymentDate: payment.paymentDate,
                            type: "payment",
                        }))
                    )
                    .filter((p) => p.orderId === order.id);
                paymentRecordsData[order.id] = orderPayments;
            }

            const allEntries = [];
            sortedOrders.forEach((order) => {
                allEntries.push(order);
            });
            Object.values(groupedPayments).forEach((payment) => {
                const totalPaymentAmount = payment.payments.reduce(
                    (sum, p) => sum + p.amountPaid,
                    0
                );
                allEntries.push({
                    paymentDate: payment.paymentDate,
                    type: "payment",
                    totalPaid: totalPaymentAmount,
                });
            });

           const filteredEntries = allEntries.filter((entry) => {
            if (entry.type === "order") {
              const orderDate = new Date(entry.date);
              const monthMatches = monthFilter
                ? orderDate.getMonth() + 1 === parseInt(monthFilter)
                : true;
               const yearMatches = yearFilter === 'all' ? true : (yearFilter ? orderDate.getFullYear() === parseInt(yearFilter) : true)

              return monthMatches && yearMatches;
            } else if (entry.type === "payment") {
              const paymentDate = entry.paymentDate;
              const monthMatches = monthFilter
                ? paymentDate.getMonth() + 1 === parseInt(monthFilter)
                : true;
                const yearMatches = yearFilter === 'all' ? true : (yearFilter ? paymentDate.getFullYear() === parseInt(yearFilter) : true)


              return monthMatches && yearMatches;
            }
            return true;
          });

          let typeFilteredEntries = filteredEntries;
          if (typeFilter !== "all") {
            typeFilteredEntries = filteredEntries.filter(
              (entry) => entry.type === typeFilter
            );
          }

          typeFilteredEntries.sort((a, b) => {
            const dateA = a.type === "order" ? new Date(a.date) : a.paymentDate;
            const dateB = b.type === "order" ? new Date(b.date) : b.paymentDate;
            return dateB - dateA;
          });

           setLedgerEntries(typeFilteredEntries);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };


  useEffect(() => {
    fetchCustomer();
    fetchOrders();
  }, [customerId, monthFilter, yearFilter, typeFilter]);

  const handleDeleteAllRecords = async () => {
    setDeletingAll(true);
    try {
        const batch = writeBatch(db);

        //Delete all orders for that customer
        const ordersQuery = query(
            collection(db, "orders"),
            where("customer", "==", customerId)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        ordersSnapshot.docs.forEach((orderDoc) => {
            const orderDate = new Date(orderDoc.data().date);
            const monthMatches = monthFilter
                ? orderDate.getMonth() + 1 === parseInt(monthFilter)
                : true;
            const yearMatches = yearFilter === 'all' ? true : (yearFilter ? orderDate.getFullYear() === parseInt(yearFilter) : true);
            if (monthMatches && yearMatches) {
                const orderRef = doc(db, "orders", orderDoc.id);
                  batch.delete(orderRef);
            }
        });

        // Delete all payments for that customer
        const paymentsQuery = query(
            collection(db, "CustomerPayments"),
            where("customerId", "==", customerId)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);

        for (const paymentDoc of paymentsSnapshot.docs) {
            const paymentDate = paymentDoc.data().paymentDate.toDate();
             const monthMatches = monthFilter
                ? paymentDate.getMonth() + 1 === parseInt(monthFilter)
                : true;
           const yearMatches = yearFilter === 'all' ? true : (yearFilter ? paymentDate.getFullYear() === parseInt(yearFilter) : true);


           if (monthMatches && yearMatches) {
                  const paymentRef = doc(db, "CustomerPayments", paymentDoc.id);
                 batch.delete(paymentRef)
           }
          }

        await batch.commit();
        toast.success("All records deleted successfully!");
        fetchOrders();
    } catch (error) {
        console.error("Error deleting all records:", error);
        toast.error("Error deleting all records!");
    } finally {
        setDeletingAll(false);
        setShowDeleteAllModal(false);
    }
};

  const handleDeleteOrder = async () => {
    setDeletingOrder(true);
    try {
      await deleteDoc(doc(db, "orders", orderToDelete));
      const updatedOrders = ledgerEntries.filter(
        (entry) => entry.id !== orderToDelete
      );
      setLedgerEntries(updatedOrders);
      const totalOrder = updatedOrders.reduce(
        (sum, order) => (order.type === "order" ? sum + order.total : sum),
        0
      );
      setTotalOrderAmount(totalOrder);
      const newTotalPaid = updatedOrders.reduce(
        (sum, order) =>
          order.type === "order" ? sum + (order.amountPaid || 0) : sum,
        0
      );
      const newTotalUnpaid = updatedOrders.reduce(
        (sum, order) =>
          order.type === "order" ? sum + order.amountUnpaid : sum,
        0
      );
      setTotalPaid(newTotalPaid);
      setTotalUnpaid(newTotalUnpaid);
      toast.success("Order deleted successfully!");
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Error deleting order!");
    } finally {
      setDeletingOrder(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeletePaymentRecord = async () => {
    setDeletingPayment(true);
    try {
      const paymentsQuery = query(
        collection(db, "CustomerPayments"),
        where("customerId", "==", customerId),
        where(
          "paymentDate",
          "==",
          Timestamp.fromDate(paymentToDelete.paymentDate)
        )
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);

      if (paymentsSnapshot.empty) {
        console.log("No matching payment records found for deletion.");
        toast.error("No matching payment records found!");
        return;
      }

      const paymentDoc = paymentsSnapshot.docs[0];
      const paymentId = paymentDoc.id;
      const paymentData = paymentDoc.data();

      if (
        !paymentData ||
        !paymentData.payments ||
        paymentData.payments.length === 0
      ) {
        console.error(
          "Error: Payment data is not valid or does not contain payments array."
        );
        toast.error(
          "Error: Payment data is not valid or does not contain payments array."
        );
        return;
      }

      for (const payment of paymentData.payments) {
        const orderRef = doc(db, "orders", payment.orderId);
        const orderDoc = await getDoc(orderRef);
        if (orderDoc.exists()) {
          const orderData = orderDoc.data();
          let newAmountPaid = orderData.amountPaid || 0;
          let newAmountUnpaid = orderData.amountUnpaid || 0;
          let updatedPaymentStatus = orderData.paymentStatus;
          newAmountPaid -= payment.amountPaid;
          newAmountUnpaid += payment.amountPaid;

          if (newAmountPaid >= orderData.total) {
            updatedPaymentStatus = "Paid";
            newAmountUnpaid = 0;
          } else if (newAmountPaid > 0) {
            updatedPaymentStatus = "Partially Paid";
          } else {
            updatedPaymentStatus = "Unpaid";
          }
          await updateDoc(orderRef, {
            amountPaid: newAmountPaid,
            amountUnpaid: newAmountUnpaid,
            paymentStatus: updatedPaymentStatus,
          });
        }
      }
      await deleteDoc(doc(db, "CustomerPayments", paymentId));

      setPaymentToDelete(null);

      fetchOrders();
      toast.success("Payment record deleted successfully!");
    } catch (error) {
      console.error("Error deleting payment record:", error);
      toast.error("Error deleting payment record!");
    } finally {
      setDeletingPayment(false);
    }
  };

  const handleAddPayment = async () => {
    setSavingPayment(true);
    if (
      !paymentAmount ||
      isNaN(paymentAmount) ||
      parseFloat(paymentAmount) <= 0
    ) {
      toast.error("Please enter a valid payment amount.");
      setSavingPayment(false);
      return;
    }
    if (parseFloat(paymentAmount) > totalUnpaid) {
      toast.error("Payment amount cannot be more than total unpaid amount.");
      setSavingPayment(false);
      return;
    }

    try {
      let remainingPayment = parseFloat(paymentAmount);
      const updatedOrders = [...ledgerEntries].filter(
        (entry) => entry.type === "order"
      );
      const formattedPaymentDate = paymentDate
        ? Timestamp.fromDate(paymentDate)
        : serverTimestamp();
      let paymentData = {
        customerId: customerId,
        paymentDate: formattedPaymentDate,
        payments: [],
      };

      const paymentsQuery = query(
        collection(db, "CustomerPayments"),
        where("customerId", "==", customerId),
        where("paymentDate", "==", formattedPaymentDate)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);

      if (!paymentsSnapshot.empty) {
        const existingPaymentDoc = paymentsSnapshot.docs[0];
        paymentData = existingPaymentDoc.data();
        paymentData.payments = paymentData.payments || [];
      }

      for (const order of updatedOrders) {
        if (remainingPayment <= 0) break;
        const orderRef = doc(db, "orders", order.id);
        let newAmountPaid = order.amountPaid || 0;
        let newAmountUnpaid = order.amountUnpaid;
        let updatedPaymentStatus = order.paymentStatus;

        const amountToApply = Math.min(remainingPayment, order.amountUnpaid);
        if (amountToApply > 0) {
          newAmountPaid += amountToApply;
          newAmountUnpaid -= amountToApply;

          if (newAmountPaid >= order.total) {
            updatedPaymentStatus = "Paid";
            newAmountUnpaid = 0;
          } else if (newAmountPaid > 0) {
            updatedPaymentStatus = "Partially Paid";
          }

          await updateDoc(orderRef, {
            amountPaid: newAmountPaid,
            amountUnpaid: newAmountUnpaid,
            paymentStatus: updatedPaymentStatus,
          });
          paymentData.payments.push({
            orderId: order.id,
            amountPaid: amountToApply,
          });
          remainingPayment -= amountToApply;
        }
        order.amountPaid = newAmountPaid;
        order.amountUnpaid = newAmountUnpaid;
        order.paymentStatus = updatedPaymentStatus;
      }
      if (paymentsSnapshot.empty && paymentData.payments.length > 0) {
        await addDoc(collection(db, "CustomerPayments"), paymentData);
      } else if (!paymentsSnapshot.empty && paymentData.payments.length > 0) {
        const existingPaymentDoc = paymentsSnapshot.docs[0];
        await updateDoc(
          doc(db, "CustomerPayments", existingPaymentDoc.id),
          paymentData
        );
      }

      fetchOrders();

      toast.success("Payment added successfully!");
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("Error adding payment!");
    } finally {
      setSavingPayment(false);
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentDate(new Date());
    }
  };

  const handleUpdateComment = async () => {
    setUpdatingComment(true);
    try {
      const orderRef = doc(db, "orders", commentOrderId);
      await updateDoc(orderRef, {
        comment: comment,
      });
      const updatedOrders = ledgerEntries.map((entry) => {
        if (entry.type === "order" && entry.id === commentOrderId) {
          return { ...entry, comment: comment };
        }
        return entry;
      });
      setLedgerEntries(updatedOrders);
      toast.success("Comment added successfully!");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Error adding comment!");
    } finally {
      setUpdatingComment(false);
      setCommentOrderId(null);
    }
  };

  const handleEditOrder = async () => {
    setUpdatingOrder(true);
    try {
        const orderRef = doc(db, "orders", orderToEdit.id);
         const orderSnapshot = await getDoc(orderRef)
             if(!orderSnapshot.exists()){
                toast.error("Order not found!");
                return
            }

          const orderData = orderSnapshot.data()

       let newItems =  [...editedItems]
            .map(item=>({
                productName: item.productName,
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price)
            }))


        const total = newItems.reduce(
           (sum, item) => sum + item.price * item.quantity,
            0
        );


      let newAmountUnpaid =
        total - (orderData?.amountPaid || 0);

       let updatedPaymentStatus = orderData?.paymentStatus;

      if (newAmountUnpaid === 0) {
        updatedPaymentStatus = "Paid";
      } else if (
           (orderData?.amountPaid || 0) > 0
      ) {
        updatedPaymentStatus = "Partially Paid";
      }
            await updateDoc(orderRef, {
             items: newItems,
                total: total,
              amountUnpaid: newAmountUnpaid,
             paymentStatus: updatedPaymentStatus,
          });


      const updatedLedgerEntries = ledgerEntries.map((entry) => {
        if (entry.type === "order" && entry.id === orderToEdit.id) {
          return { ...entry, items: newItems,total:total, amountUnpaid: newAmountUnpaid, paymentStatus: updatedPaymentStatus };
        }
        return entry;
      });

      setLedgerEntries(updatedLedgerEntries);
        const newTotal = updatedLedgerEntries.reduce(
            (sum, order) => (order.type === "order" ? sum + order.total : sum),
            0
        );
         setTotalOrderAmount(newTotal);

         const totalPaidAmount = updatedLedgerEntries.reduce(
          (sum, order) =>
           order.type === "order" ? sum + (order.amountPaid || 0) : sum,
          0
         );
       const totalUnpaidAmount = updatedLedgerEntries.reduce(
          (sum, order) =>
            order.type === "order" ? sum + order.amountUnpaid : sum,
          0
        );

           setTotalPaid(totalPaidAmount);
         setTotalUnpaid(totalUnpaidAmount);


         toast.success("Order updated successfully!");
    } catch (error) {
      console.error("Error editing order:", error);
      toast.error("Error editing order!");
    } finally {
      setUpdatingOrder(false);
      setShowEditModal(false);
      setEditedItems([]);
      setOrderToEdit(null);
    }
  };
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...editedItems];
    updatedItems[index][field] = value;
    setEditedItems(updatedItems);
  };

  const handleAddItem = () => {
    setEditedItems([
      ...editedItems,
      { productName: "", quantity: 1, price: 0 },
    ]);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = [...editedItems];
    updatedItems.splice(index, 1);
    setEditedItems(updatedItems);
  };

  const generatePDF = () => {
    try {
      const period = [
        monthFilter
          ? new Date(0, parseInt(monthFilter) - 1).toLocaleString("default", { month: "long" })
          : "All months",
        yearFilter === "all" ? "All years" : yearFilter,
      ].join("  ·  ");

      const doc = buildStatement({
        customer,
        entries: ledgerEntries,
        totals: {
          billed: totalOrderAmount,
          paid: totalPaid,
          outstanding: totalUnpaid,
        },
        period,
      });
      doc.save(`Statement-${(customer?.name || "customer").replace(/\s+/g, "-")}.pdf`);
      toast.success("Statement downloaded");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Could not generate the statement");
    }
  };
  return (
    <div className="bg-paper min-h-screen">
     <PageContainer>
      <style>{loaderStyle}</style>
      <ToastContainer />
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
        </div>
      ) : (
        <>
          <PageHeading
            title={customer?.name || "Customer"}
            subtitle={customer ? `${customer.phoneNumber} · ${customer.address}` : undefined}
          />

          <div className="flex flex-col sm:flex-row justify-between mb-4 gap-2">
            <div className="flex items-center gap-2">
              <select
                className="border border-ink p-1.5 rounded-md bg-canvas hover:bg-paper text-body focus:outline-none focus:ring-2 focus:ring-accent"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="order">Orders</option>
                <option value="payment">Payments</option>
              </select>

              <select
                className="border border-ink p-1.5 rounded-md bg-canvas hover:bg-paper text-body focus:outline-none focus:ring-2 focus:ring-accent"
                value={monthFilter}
                onChange={(e) =>
                  setMonthFilter(e.target.value === "all" ? "" : e.target.value)
                }
              >
                 <option value="">All Months</option>
                {[...Array(12).keys()].map((i) => (
                  <option key={i} value={i + 1}>
                    {new Date(0, i).toLocaleString("default", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>

             <select
                className="border border-ink p-1.5 rounded-md bg-canvas hover:bg-paper text-body focus:outline-none focus:ring-2 focus:ring-accent"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                  <option value="all">All Years</option>
                {Array.from({ length: 2027 - 2023 + 1 }, (_, i) => 2023 + i)
                  .sort((a, b) => b - a)
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                                </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className={`bg-canvas text-red-600 border border-ash font-medium py-1.5 px-3 rounded-lg flex items-center text-body hover:bg-red-50 transition-colors ${
                  deletingAll ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={deletingAll}
              >
                {deletingAll ? (
                  <div className="loader mr-2"></div>
                ) : (
                  "Delete All"
                )}
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className={`bg-ink hover:bg-charcoal text-white font-medium py-1.5 px-3 rounded-lg flex items-center text-body transition-colors ${
                  savingPayment ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={savingPayment}
              >
                {savingPayment ? (
                  <div className="loader mr-1"></div>
                ) : (
                  <>
                    {" "}
                    <FaPlus className="mr-1" /> Add Payment{" "}
                  </>
                )}
              </button>
              <button
                onClick={generatePDF}
                className="bg-canvas text-charcoal border border-ash font-medium py-1.5 px-3 rounded-lg flex items-center text-body hover:bg-paper transition-colors"
              >
                <FaPrint className="mr-1" />
                Print
              </button>
            </div>
          </div>

          {customer && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatTile label="Billed" value={formatINR(totalOrderAmount)} />
              <StatTile label="Paid" value={formatINR(totalPaid)} />
              <StatTile label="Outstanding" value={formatINR(totalUnpaid)} />
            </div>
          )}

          <div className="overflow-x-auto border border-ash rounded-xl">
            <table className="min-w-full bg-canvas table-auto text-body">
              <thead className="bg-paper">
                <tr className="text-caption text-fog uppercase tracking-wide">
                  <th className="px-2 py-2 text-left">
                    Date
                  </th>
                  <th className="px-2 py-2 text-left">
                    Product Details
                  </th>
                  <th className="px-2 py-2 text-right">
                    Amount
                  </th>
                  <th className="px-2 py-2 text-right">
                    Paid
                  </th>
                  <th className="px-2 py-2 text-right">
                    Unpaid
                  </th>
                  <th className="px-2 py-2 text-left">
                    Payment Status
                  </th>
                  <th className="px-2 py-2 text-left">
                    Comment
                  </th>
                  <th className="px-2 py-2 text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, index) => (
                  <tr
                    key={index}
                    className={`hover:bg-paper transition-colors ${
                      entry.type === "payment" ? "bg-mint/40" : ""
                    }`}
                  >
                    <td className="border-t border-ash px-2 py-2 align-top text-body text-charcoal">
                      {entry.type === "order"
                        ? new Date(entry.date).toLocaleDateString()
                        : entry.paymentDate.toLocaleDateString()}
                    </td>
                    <td className="border-t border-ash px-2 py-2 text-body">
                      {entry.type === "order" ? (
                        <div>
                          {entry.items &&
                            entry.items.map((item, itemIndex) => (
                              <div
                                key={itemIndex}
                                className="my-0.5 text-body text-charcoal"
                              >
                                {item.productName} · {item.quantity} × {formatINR(item.price)}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <span className="text-body text-steel">
                          Payment Received
                        </span>
                      )}
                    </td>
                    <td className="border-t border-ash px-2 py-2 text-body text-charcoal text-right tabular-nums">
                      {entry.type === "order" ? formatINR(entry.total) : ""}
                    </td>
                    <td className="border-t border-ash px-2 py-2 text-body text-charcoal text-right tabular-nums">
                      {entry.type === "order"
                        ? formatINR(entry.amountPaid)
                        : formatINR(entry.totalPaid)}
                    </td>
                    <td className="border-t border-ash px-2 py-2 text-body text-charcoal text-right tabular-nums">
                      {entry.type === "order" ? formatINR(entry.amountUnpaid) : ""}
                    </td>
                    <td className="border-t border-ash px-2 py-2 text-body">
                      {entry.type === "order" ? (
                        entry.paymentStatus === "Paid" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-mint text-mint-fg text-caption font-medium">
                            <FaCheckCircle size={10} /> Paid
                          </span>
                        ) : entry.paymentStatus === "Partially Paid" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tangerine/10 text-tangerine text-caption font-medium">
                            <FaExclamationCircle size={10} /> Partially
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-caption font-medium">
                            <FaTimesCircle size={10} /> Unpaid
                          </span>
                        )
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="border-t border-ash px-2 py-2 text-body text-steel">
                      {entry.type === "order" ? entry.comment : ""}
                    </td>
                    <td className="border-t border-ash px-2 py-2 text-body">
                      <div className="flex gap-1">
                        {entry.type === "order" ? (
                          <>
                            <button
                              onClick={() => {
                                setCommentOrderId(entry.id);
                                setComment(entry.comment || "");
                              }}
                              className={`bg-canvas hover:bg-paper text-charcoal border border-ash rounded-md p-1 ${
                                updatingComment
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={updatingComment}
                            >
                              {updatingComment ? (
                                <div className="loader"></div>
                              ) : (
                                <FaComment size={12} />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setShowEditModal(true);
                                setOrderToEdit(entry);
                                setEditedItems(entry.items || []);
                              }}
                              className={`bg-canvas hover:bg-paper text-charcoal border border-ash rounded-md p-1 ${
                                updatingOrder
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={updatingOrder}
                            >
                              {updatingOrder ? (
                                <div className="loader"></div>
                              ) : (
                                <FaEdit size={12} />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setShowDeleteModal(true);
                                setOrderToDelete(entry.id);
                              }}
                              className={`bg-canvas hover:bg-red-50 text-red-600 border border-ash rounded-md p-1 ${
                                deletingOrder
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                              }`}
                              disabled={deletingOrder}
                            >
                              {deletingOrder ? (
                                <div className="loader"></div>
                              ) : (
                                <FaTrash size={12} />
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setPaymentToDelete(entry);
                            }}
                             className={`bg-canvas hover:bg-red-50 text-red-600 border border-ash rounded-md p-1 ${
                               deletingPayment
                                  ? "opacity-50 cursor-not-allowed"
                                  : ""
                             }`}
                            disabled={deletingPayment}
                          >
                            {deletingPayment ? (
                              <div className="loader"></div>
                            ) : (
                              <FaTrash size={12} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ledgerEntries.length === 0 && (
            <p className="mt-3 text-steel text-center text-body">
              No records found for this customer.
            </p>
          )}
        </>
      )}
     </PageContainer>
      <Modal
        isOpen={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      >
        <div className="bg-canvas rounded-xl border border-ash p-4 shadow-card max-w-md w-full relative">
          <button
            onClick={() => setShowPaymentModal(false)}
            className="absolute top-2 right-2 p-1 text-fog hover:text-charcoal"
          >
            <FaTimesCircle size={16} />
          </button>
          <h2 className="text-body-lg font-semibold mb-3 text-charcoal">Add Payment</h2>
          <div className="mb-3">
            <label className="block text-caption font-medium text-steel mb-1">
              Payment Amount:
            </label>
            <input
              type="number"
              placeholder="Enter Payment Amount"
              className="border border-ink p-1.5 rounded-md w-full text-body focus:outline-none focus:ring-2 focus:ring-accent"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="block text-caption font-medium text-steel mb-1">
              Payment Date:
            </label>
            <div className="relative">
              <DatePicker
                selected={paymentDate}
                onChange={(date) => setPaymentDate(date)}
                className="border border-ink p-1.5 rounded-md w-full text-body focus:outline-none focus:ring-2 focus:ring-accent"
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddPayment}
              className={`bg-ink hover:bg-charcoal text-white font-medium py-1.5 px-3 rounded-lg flex items-center text-body transition-colors ${
                savingPayment ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={savingPayment}
            >
              {savingPayment ? (
                <div className="loader mr-2"></div>
              ) : (
                "Add Payment"
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      >
        <div className="bg-canvas rounded-xl border border-ash p-4 shadow-card max-w-md w-full relative">
          <button
            onClick={() => setShowEditModal(false)}
            className="absolute top-2 right-2 p-1 text-fog hover:text-charcoal"
          >
            <FaTimesCircle size={16} />
          </button>
          <h2 className="text-body-lg font-semibold mb-3 text-charcoal">Edit Order</h2>
          {editedItems.map((item, index) => (
            <div key={index} className="mb-3 pb-3 border-b border-ash last:border-b-0">
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-caption font-medium text-steel w-1/3">
                  Product Name
                </label>
                <input
                  type="text"
                  className="border border-ink p-1 rounded-md w-full text-caption focus:outline-none focus:ring-2 focus:ring-accent"
                  defaultValue={item.productName}
                  onChange={(e) =>
                    handleItemChange(index, "productName", e.target.value)
                  }
                />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <label className="block text-caption font-medium text-steel w-1/3">
                  Quantity
                </label>
                <input
                  type="number"
                  className="border border-ink p-1 rounded-md w-full text-caption focus:outline-none focus:ring-2 focus:ring-accent"
                  defaultValue={item.quantity}
                  onChange={(e) =>
                    handleItemChange(
                      index,
                      "quantity",
                      parseInt(e.target.value)
                    )
                  }
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-caption font-medium text-steel w-1/3">
                  Price
                </label>
                <input
                  type="number"
                  className="border border-ink p-1 rounded-md w-full text-caption focus:outline-none focus:ring-2 focus:ring-accent"
                  defaultValue={item.price}
                  onChange={(e) =>
                    handleItemChange(index, "price", parseFloat(e.target.value))
                  }
                />
              </div>
              <button
                onClick={() => handleRemoveItem(index)}
                className="bg-canvas hover:bg-red-50 text-red-600 border border-ash font-medium py-1 px-2 rounded-lg flex items-center text-caption"
              >
                <FaTrash className="mr-1" /> Remove
              </button>
            </div>
          ))}
          <button
            onClick={handleAddItem}
            className="bg-canvas hover:bg-paper text-charcoal border border-ash font-medium py-1 px-2 rounded-lg flex items-center text-caption"
          >
            <FaPlus className="mr-1" /> Add Item
          </button>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleEditOrder}
              className={`bg-ink hover:bg-charcoal text-white font-medium py-1.5 px-3 rounded-lg flex items-center text-body transition-colors ${
                updatingOrder ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={updatingOrder}
            >
              {updatingOrder ? <div className="loader mr-2"></div> : "Update"}
            </button>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={commentOrderId !== null}
        onRequestClose={() => setCommentOrderId(null)}
        className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      >
        <div className="bg-canvas rounded-xl border border-ash p-4 shadow-card max-w-md w-full relative">
          <button
            onClick={() => setCommentOrderId(null)}
            className="absolute top-2 right-2 p-1 text-fog hover:text-charcoal"
          >
            <FaTimesCircle size={16} />
          </button>
          <h2 className="text-body-lg font-semibold mb-3 text-charcoal">Add Comment</h2>
          <div className="mb-3">
            <label className="block text-caption font-medium text-steel mb-1">
              Comment:
            </label>
            <input
              type="text"
              placeholder="Enter Comment"
              className="border border-ink p-1.5 rounded-md w-full text-body focus:outline-none focus:ring-2 focus:ring-accent"
              defaultValue={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleUpdateComment}
              className={`bg-ink hover:bg-charcoal text-white font-medium py-1.5 px-3 rounded-lg flex items-center text-body transition-colors ${
                updatingComment ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={updatingComment}
            >
              {updatingComment ? <div className="loader mr-2"></div> : "Update"}
            </button>
          </div>
        </div>
      </Modal>
      {paymentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-canvas p-4 rounded-xl border border-ash shadow-card">
            <h2 className="text-body-lg font-semibold mb-2 text-charcoal">
              Delete Payment Record
            </h2>
            <p className="mb-3 text-body text-steel">
              Are you sure you want to delete this payment record?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPaymentToDelete(null)}
                className="bg-canvas hover:bg-paper text-charcoal border border-ash font-medium py-1.5 px-3 rounded-lg text-body"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePaymentRecord}
                className={`bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-lg flex items-center text-body ${
                  deletingPayment ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={deletingPayment}
              >
                {deletingPayment ? (
                  <div className="loader mr-2"></div>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-canvas p-4 rounded-xl border border-ash shadow-card">
            <h2 className="text-body-lg font-semibold mb-2 text-charcoal">Delete Order</h2>
            <p className="mb-3 text-body text-steel">
              Are you sure you want to delete this order?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="bg-canvas hover:bg-paper text-charcoal border border-ash font-medium py-1.5 px-3 rounded-lg text-body"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                className={`bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-lg flex items-center text-body ${
                  deletingOrder ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={deletingOrder}
              >
                {deletingOrder ? <div className="loader mr-2"></div> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-canvas p-4 rounded-xl border border-ash shadow-card">
            <h2 className="text-body-lg font-semibold mb-2 text-charcoal">Delete All Records</h2>
            <p className="mb-3 text-body text-steel">
              Are you sure you want to delete all records for the selected month
              and year?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="bg-canvas hover:bg-paper text-charcoal border border-ash font-medium py-1.5 px-3 rounded-lg text-body"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllRecords}
                className={`bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-lg flex items-center text-body ${
                  deletingAll ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={deletingAll}
              >
                {deletingAll ? <div className="loader mr-2"></div> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDetails;