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
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import Modal from "react-modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

Modal.setAppElement("#root");

const loaderStyle = `
    .loader {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
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

   let logoImage = null;
    const loadLogoImage = () => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = "/logon-vect22.png";
             img.onload = () => {
                logoImage = img;
                resolve();
            };
             img.onerror = reject;
        });
    };
    const generatePDF = async () => {
      try {
      let logoImage = null; // Declare logoImage within the scope of the function
      const loadLogoImage = () => {
        return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = "/logon-vect22.png";
        img.onload = () => {
          logoImage = img;
          resolve();
        };
        img.onerror = reject;
        });
      };
    
      await loadLogoImage(); // Await the promise
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      if (logoImage) {
        doc.addImage(logoImage, "PNG", 15, 10, 20, 20);
      }
      doc.setFontSize(18);
      doc.setTextColor(22, 160, 133);
      doc.text("STA Foods & Oils .Co", doc.internal.pageSize.width / 2, 15, {
        align: "center",
      });
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Hindola Mustard Oil", doc.internal.pageSize.width / 2, 22, {
        align: "center",
      });
      doc.text("Phone: +91 99534 10116", doc.internal.pageSize.width / 2, 27, {
        align: "center",
      });
      doc.text(
        "Sanjarpur, Azamgarh, Uttar Pradesh",
        doc.internal.pageSize.width / 2,
        32,
        { align: "center" }
      );
      doc.text("stafoodsoils@gmail.com", doc.internal.pageSize.width / 2, 37, {
        align: "center",
      });
      doc.line(10, 42, 200, 42);
      doc.setFontSize(16);
      doc.setTextColor(22, 160, 133);
      doc.text("Customer Information", 10, 52);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(240, 240, 240);
      doc.rect(10, 55, 190, 34, "F");
      doc.text(`Name: ${customer?.name}`, 12, 60);
      doc.text(`Phone: ${customer?.phoneNumber}`, 12, 65);
      doc.text(`Address: ${customer?.address}`, 12, 70);
      doc.setTextColor(22, 160, 133);
      doc.text(`Total Order Amount: ${totalOrderAmount}`, 12, 75);
      doc.setTextColor(0, 128, 0);
      doc.text(`Total Paid: ${totalPaid}`, 12, 80);
      doc.setTextColor(255, 0, 0);
      doc.text(`Total Unpaid: ${totalUnpaid}`, 12, 85);
      doc.line(10, 90, 200, 90);
      const statusImage =
        totalUnpaid === 0 ? "/paidstamp.png" : "/paymentdue.png";
      const img = new Image();
      img.src = statusImage;
      await new Promise((resolve) => {
        img.onload = () => {
        doc.addImage(img, "PNG", 160, 57, 28, 28);
        resolve();
        };
      });
      doc.setTextColor(0, 0, 0);
      doc.text("Order and Payment History:", 10, 95);
      let yPosition = 100;
      const tableData = [];
      let currentMonthYear = "";
    
      ledgerEntries.forEach((entry) => {
        const entryDate = entry.type === "order" ? new Date(entry.date) : entry.paymentDate;
        const monthYear = `${entryDate.toLocaleString("default", { month: "long" })} ${entryDate.getFullYear()}`;
    
        if (monthYear !== currentMonthYear) {
        currentMonthYear = monthYear;
        tableData.push({
          Date: monthYear,
          "Product Details": "",
          Amount: "",
          Paid: "",
          Comment: "",
          isHeader: true,
        });
        }
    
        if (entry.type === "order") {
        tableData.push({
          Date: entryDate.toLocaleDateString(),
          "Product Details": entry.items
          .map(
            (item) =>
            `${item.productName} - qty: ${item.quantity} - price: ${item.price}`
          )
          .join("\n"),
          Amount: `${entry.total}`,
          Paid: "", // Hide the Paid column for orders
          Comment: entry.comment || "",
        });
        } else if (entry.type === "payment") {
        tableData.push({
          Date: entryDate.toLocaleDateString(),
          "Product Details": "Payment Received",
          Amount: "",
          Paid: `${entry.totalPaid}`,
          Comment: "",
          isPayment: true,
        });
        }
      });
    
      
    
      doc.autoTable({
      startY: yPosition,
      head: [
      ["Date", "Product Details", "Amount", "Paid", "Comment"],
      ],
      body: tableData.map((item) => [
      item.Date,
      item["Product Details"],
      item.Amount,
      item.Paid,
      item.Comment,
      ]),
      theme: "grid",
      styles: {
      cellPadding: 2,
      fontSize: 10,
      halign: "center",
      valign: "middle",
      lineColor: [44, 62, 80],
      lineWidth: 0.1,
      },
      headStyles: {
      fillColor: [22, 160, 133],
      textColor: 255,
      fontSize: 10,
      },
      columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 70 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 23 },
      },
      didParseCell: function (data) {
      if (tableData[data.row.index].isPayment) {
        data.cell.styles.fillColor = [217,223,198]; // Light green background for payment records
      }
      },
      margin: { top: 5 },
      });
      
      yPosition = doc.autoTable.previous.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      const footerText = `Generated on: ${new Date().toLocaleDateString()} | Thank you for your business! | Page ${doc.internal.getNumberOfPages()}`;
      doc.text(
        footerText,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
      doc.save(`Customer_Details_${customer?.name}.pdf`);
      } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error generating PDF!");
      }
    };
  return (
    <div className="container mx-auto p-2 mt-4  sm:mt-8">
      <style>{loaderStyle}</style>
      <ToastContainer />
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-2 text-center text-indigo-600 sm:text-2xl">
            Customer Details
          </h2>

          <div className="flex flex-col  sm:flex-row justify-between mb-2 sm:mb-4">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <select
                className="border border-gray-300 p-1 rounded bg-gray-50 hover:bg-gray-100 text-xs sm:text-sm"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="order">Orders</option>
                <option value="payment">Payments</option>
              </select>

              <select
                className="border border-gray-300 p-1 rounded bg-gray-50 hover:bg-gray-100 text-xs sm:text-sm"
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
                className="border border-gray-300 p-1 rounded bg-gray-50 hover:bg-gray-100 text-xs sm:text-sm"
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
            <div className="flex space-x-1 mt-2 sm:mt-0">
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className={`bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs sm:text-sm ${
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
                className={`bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs sm:text-sm ${
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
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs sm:text-sm"
              >
                <FaPrint className="mr-1" />
                Print
              </button>
            </div>
          </div>

          {customer && (
            <div className="bg-white shadow rounded p-2 mb-2 sm:p-4 sm:mb-4">
              <h3 className="text-sm font-semibold mb-1 text-gray-800 sm:text-lg">
                Customer Information
              </h3>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm">
                  <strong>Name:</strong> {customer.name}
                </p>
                <p className="text-xs sm:text-sm">
                  <strong>Phone Number:</strong> {customer.phoneNumber}
                </p>
                <p className="text-xs sm:text-sm">
                  <strong>Address:</strong> {customer.address}
                </p>
                <p className="text-xs sm:text-sm">
                  <strong>
                    Total Order Amount:{" "}
                    <span className="text-indigo-600">₹{totalOrderAmount}</span>
                  </strong>
                </p>
                <p className="text-xs sm:text-sm">
                  <strong>
                    Total Paid:{" "}
                    <span className="text-green-600">₹{totalPaid}</span>
                  </strong>
                </p>
                <p className="text-xs sm:text-sm">
                  <strong>
                    Total Unpaid:{" "}
                    <span className="text-red-600">₹{totalUnpaid}</span>
                  </strong>
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full bg-white shadow rounded table-auto">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-1 py-1 text-left text-xs sm:text-sm">
                    Date
                  </th>
                  <th className="px-1 py-1 text-left text-xs sm:text-sm">
                    Product Details
                  </th>
                  <th className="px-1 py-1 text-left text-xs sm:text-sm">
                    Amount
                  </th>
                  <th className="px-1 py-1 text-left text-xs sm:text-sm">
                    Paid
                  </th>
                  <th className="px-1 py-1 text-left text-xs sm:text-sm">
                    Unpaid
                  </th>
                  <th className="px-1 py-1 text-left text-xs sm:text-sm">
                    Payment Status
                  </th>
                  <th className="px-1 py-1 text-left text-xs sm:text-sm">
                    Comment
                  </th>
                  <th className="px-1 py-1 text-left text-xs sm:text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, index) => (
                  <tr
                    key={index}
                    className={`hover:bg-gray-50 ${
                      entry.type === "payment" ? "bg-green-50" : ""
                    }`}
                  >
                    <td className="border-t border-gray-200 px-1 py-1 align-top text-xs sm:text-sm">
                      {entry.type === "order"
                        ? new Date(entry.date).toLocaleDateString()
                        : entry.paymentDate.toLocaleDateString()}
                    </td>
                    <td className="border-t border-gray-200 px-1 py-1 text-xs sm:text-sm">
                      {entry.type === "order" ? (
                        <div>
                          {entry.items &&
                            entry.items.map((item, itemIndex) => (
                              <div
                                key={itemIndex}
                                className="my-0.5 text-xs sm:text-sm"
                              >
                                {item.productName}-Qty:{item.quantity}-
                                price:₹{item.price}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-700 sm:text-sm">
                          Payment Received
                        </span>
                      )}
                    </td>
                    <td className="border-t border-gray-200 px-1 py-1 text-xs sm:text-sm">
                      {entry.type === "order" ? `₹${entry.total}` : ""}
                    </td>
                    <td className="border-t border-gray-200 px-1 py-1 text-xs sm:text-sm">
                      {entry.type === "order"
                        ? `₹${entry.amountPaid}`
                        : `₹${entry.totalPaid}`}
                    </td>
                    <td className="border-t border-gray-200 px-1 py-1 text-xs sm:text-sm">
                      {entry.type === "order" ? `₹${entry.amountUnpaid}` : ""}
                    </td>
                    <td className="border-t border-gray-200 px-1 py-1 text-xs sm:text-sm">
                      {entry.type === "order" ? (
                        entry.paymentStatus === "Paid" ? (
                          <span className="flex items-center text-green-600">
                            <FaCheckCircle className="mr-1" /> Paid
                          </span>
                        ) : entry.paymentStatus === "Partially Paid" ? (
                          <span className="flex items-center text-yellow-600">
                            <FaExclamationCircle className="mr-1" /> Partially
                            Paid
                          </span>
                        ) : (
                          <span className="flex items-center text-red-600">
                            <FaTimesCircle className="mr-1" /> Unpaid
                          </span>
                        )
                      ) : (
                        ""
                      )}
                    </td>
                    <td className="border-t border-gray-200 px-1 py-1 text-xs sm:text-sm">
                      {entry.type === "order" ? entry.comment : ""}
                    </td>
                    <td className="border-t border-gray-200 px-1 py-1 text-xs sm:text-sm">
                      <div className="flex space-x-0.5">
                        {entry.type === "order" ? (
                          <>
                            <button
                              onClick={() => {
                                setCommentOrderId(entry.id);
                                setComment(entry.comment || "");
                              }}
                              className={`bg-blue-500 hover:bg-blue-600 text-white font-bold rounded p-0.5 text-xs sm:text-sm ${
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
                              className={`bg-blue-500 hover:bg-blue-600 text-white font-bold rounded p-0.5 text-xs sm:text-sm ${
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
                              className={`bg-red-500 hover:bg-red-600 text-white font-bold  rounded p-0.5 text-xs sm:text-sm ${
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
                             className={`bg-red-500 hover:bg-red-600 text-white font-bold rounded p-0.5 text-xs sm:text-sm ${
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
            <p className="mt-2 text-gray-600 text-center text-xs sm:text-sm">
              No records found for this customer.
            </p>
          )}
        </>
      )}
      <Modal
        isOpen={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
        className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50"
      >
        <div className="bg-white rounded-lg p-4 shadow-lg max-w-md w-full relative">
          <button
            onClick={() => setShowPaymentModal(false)}
            className="absolute top-1 right-1 p-1 text-gray-600 hover:text-gray-800"
          >
            <FaTimesCircle size={16} />
          </button>
          <h2 className="text-lg font-semibold mb-2">Add Payment</h2>
          <div className="mb-2">
            <label className="block text-gray-700 text-sm font-bold mb-1">
              Payment Amount:
            </label>
            <input
              type="number"
              placeholder="Enter Payment Amount"
              className="border border-gray-300 p-1 rounded w-full text-sm"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
            />
          </div>
          <div className="mb-2">
            <label className="block text-gray-700 text-sm font-bold mb-1">
              Payment Date:
            </label>
            <div className="relative">
              <DatePicker
                selected={paymentDate}
                onChange={(date) => setPaymentDate(date)}
                className="border border-gray-300 p-1 rounded w-full text-sm"
                dateFormat="dd/MM/yyyy"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleAddPayment}
              className={`bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs sm:text-sm ${
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
        className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50"
      >
        <div className="bg-white rounded-lg p-4 shadow-lg max-w-md w-full relative">
          <button
            onClick={() => setShowEditModal(false)}
            className="absolute top-1 right-1 p-1 text-gray-600 hover:text-gray-800"
          >
            <FaTimesCircle size={16} />
          </button>
          <h2 className="text-lg font-semibold mb-2">Edit Order</h2>
          {editedItems.map((item, index) => (
            <div key={index} className="mb-2">
              <div className="flex space-x-1 mb-1">
                <label className="block text-gray-700 text-xs font-bold w-1/3">
                  Product Name
                </label>
                <input
                  type="text"
                  className="border border-gray-300 p-1 rounded w-full text-xs"
                  defaultValue={item.productName}
                  onChange={(e) =>
                    handleItemChange(index, "productName", e.target.value)
                  }
                />
              </div>
              <div className="flex space-x-1 mb-1">
                <label className="block text-gray-700 text-xs font-bold w-1/3">
                  Quantity
                </label>
                <input
                  type="number"
                  className="border border-gray-300 p-1 rounded w-full text-xs"
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
              <div className="flex space-x-1 mb-1">
                <label className="block text-gray-700 text-xs font-bold w-1/3">
                  Price
                </label>
                <input
                  type="number"
                  className="border border-gray-300 p-1 rounded w-full text-xs"
                  defaultValue={item.price}
                  onChange={(e) =>
                    handleItemChange(index, "price", parseFloat(e.target.value))
                  }
                />
              </div>
              <button
                onClick={() => handleRemoveItem(index)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs"
              >
                <FaTrash className="mr-1" /> Remove
              </button>
            </div>
          ))}
          <button
            onClick={handleAddItem}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs"
          >
            <FaPlus className="mr-1" /> Add Item
          </button>
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={handleEditOrder}
              className={`bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs sm:text-sm ${
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
        className="fixed inset-0 flex items-center justify-center bg-gray-500 bg-opacity-75 z-50"
      >
        <div className="bg-white rounded-lg p-4 shadow-lg max-w-md w-full relative">
          <button
            onClick={() => setCommentOrderId(null)}
            className="absolute top-1 right-1 p-1 text-gray-600 hover:text-gray-800"
          >
            <FaTimesCircle size={16} />
          </button>
          <h2 className="text-lg font-semibold mb-2">Add Comment</h2>
          <div className="mb-2">
            <label className="block text-gray-700 text-xs font-bold mb-1">
              Comment:
            </label>
            <input
              type="text"
              placeholder="Enter Comment"
              className="border border-gray-300 p-1 rounded w-full text-xs"
              defaultValue={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleUpdateComment}
              className={`bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs sm:text-sm ${
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center">
          <div className="bg-white p-4 rounded shadow-lg">
            <h2 className="text-lg font-semibold mb-2">
              Delete Payment Record
            </h2>
            <p className="mb-2 text-xs sm:text-sm">
              Are you sure you want to delete this payment record?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setPaymentToDelete(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1 px-2 rounded text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePaymentRecord}
                className={`bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs sm:text-sm ${
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center">
          <div className="bg-white p-4 rounded shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Delete Order</h2>
            <p className="mb-2 text-xs sm:text-sm">
              Are you sure you want to delete this order?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1 px-2 rounded text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                className={`bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs sm:text-sm ${
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-center">
          <div className="bg-white p-4 rounded shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Delete All Records</h2>
            <p className="mb-2 text-xs sm:text-sm">
              Are you sure you want to delete all records for the selected month
              and year?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteAllModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-1 px-2 rounded text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllRecords}
                className={`bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded flex items-center text-xs sm:text-sm ${
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