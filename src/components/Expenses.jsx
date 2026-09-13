import React, { useEffect, useState } from "react";
import { db, collection, addDoc, deleteDoc, updateDoc, getDocs, doc } from "../firebase";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa"; 
import { toast, ToastContainer } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css"; 
import * as XLSX from 'xlsx';
import Modal from 'react-modal'; // Import Modal component
import { formatINR, formatNumber, MONTH_NAMES } from "../lib/format";
import { PageContainer, PageHeading, SectionCard, StatTile, EmptyState } from "./ui";
import { DEMO_MODE, demoExpenses } from "../lib/demoData";

Modal.setAppElement('#root'); // Set app element for Modal

const Expenses = () => {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [expenseIdToDelete, setExpenseIdToDelete] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filteredExpenses, setFilteredExpenses] = useState([]); // State for filtered expenses
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchExpenses = async () => {
      if (DEMO_MODE) {
        setItems(demoExpenses);
        return;
      }
      const expensesCollection = collection(db, "expenses");
      const expensesSnapshot = await getDocs(expensesCollection);
      const expensesData = expensesSnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

      // Convert dates to ISO format
      const formattedExpensesData = expensesData.map((expense) => ({
        ...expense,
        date: new Date(expense.date).toISOString() // Convert to ISO format
      }));
      setItems(formattedExpensesData); 
    };

    fetchExpenses();
  }, []);

  useEffect(() => {
    const applyFilters = () => {
      setFilteredExpenses(filterExpenses()); // Update filteredExpenses state
    };

    applyFilters(); // Apply filters initially
  }, [items, filterMonth, filterYear, searchTerm]); // Re-apply filters on data or filter change

  const handleAddExpense = async () => {
    if (!itemName || !quantity || totalAmount === '' || paidAmount === '' || !supplier) {
      alert('Please fill in all fields');
      return;
    }

    const unpaidAmount = Math.max(0, totalAmount - paidAmount);
    let status = "Unpaid";

    if (unpaidAmount === 0) {
      status = "Paid";
    } else if (unpaidAmount > 0 && paidAmount > 0) {
      status = "Partially Paid";
    }

    const newExpense = {
      itemName,
      quantity: parseInt(quantity, 10),
      totalAmount: parseFloat(totalAmount),
      paidAmount: parseFloat(paidAmount),
      unpaidAmount,
      status,
      supplier,
      date: new Date().toISOString(), // Add date to newExpense
    };

    try {
      const docRef = await addDoc(collection(db, "expenses"), newExpense);
      setItems([...items, { ...newExpense, id: docRef.id }]);
      clearFields();
      toast.success("Expense added successfully!");
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Error adding expense!");
    }
  };

  const handleDeleteConfirm = (id) => {
    setExpenseIdToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteExpense = async () => {
    try {
      await deleteDoc(doc(db, "expenses", expenseIdToDelete));
      setItems(items.filter(item => item.id !== expenseIdToDelete));
      setShowDeleteConfirmation(false); // Close the modal
      toast.success("Expense deleted successfully!");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Error deleting expense!");
    }
  };

  const handleUpdateExpense = async (id, updatedPaidAmount) => {
    const total = items.find(item => item.id === id).totalAmount;
    const unpaidAmount = Math.max(0, total - updatedPaidAmount);
    let status = "Unpaid";

    if (unpaidAmount === 0) {
      status = "Paid";
    } else if (unpaidAmount > 0 && updatedPaidAmount > 0) {
      status = "Partially Paid";
    }

    const updatedExpense = {
      paidAmount: updatedPaidAmount,
      unpaidAmount,
      status
    };

    try {
      const expenseRef = doc(db, "expenses", id);
      await updateDoc(expenseRef, updatedExpense);
      setItems(items.map(item => (item.id === id ? { ...item, ...updatedExpense } : item)));
      toast.success("Expense updated successfully!");
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Error updating expense!");
    }
  };

  const clearFields = () => {
    setItemName('');
    setQuantity('');
    setTotalAmount(0);
    setPaidAmount(0);
    setSupplier('');
  };

  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(items);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
    XLSX.writeFile(workbook, "Expenses.xlsx");
  };

  const formatDate = (dateString) => {
    // If dateString is already in ISO format, use it directly
    if (dateString.includes('T')) {
      return new Date(dateString).toISOString().slice(0, 10); // Extract YYYY-MM-DD
    } 
    // If it's in DD/MM/YYYY format, convert it to ISO and extract YYYY-MM-DD
    const date = new Date(dateString);
    return date.toISOString().slice(0, 10); // Extract YYYY-MM-DD
  };

  const filterExpenses = () => {
    const filtered = items.filter((item) => {
      const expenseDate = new Date(item.date); // Already in ISO format
      const matchesSearchTerm = item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
      if (filterMonth && filterYear) {
        return matchesSearchTerm && expenseDate.getMonth() + 1 === parseInt(filterMonth, 10) && expenseDate.getFullYear() === parseInt(filterYear, 10);
      } else if (filterMonth) {
        return matchesSearchTerm && expenseDate.getMonth() + 1 === parseInt(filterMonth, 10);
      } else if (filterYear) {
        return matchesSearchTerm && expenseDate.getFullYear() === parseInt(filterYear, 10);
      }
      return matchesSearchTerm; // No filters applied, show all items
    });
    return filtered;
  };

  const totalSpend = filteredExpenses.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0);
  const totalSettled = filteredExpenses.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
  const totalOwed = filteredExpenses.reduce((sum, i) => sum + (Number(i.unpaidAmount) || 0), 0);

  return (
    <div className="bg-paper min-h-screen">
     <PageContainer>
      <PageHeading title="Expenses" subtitle={`${filteredExpenses.length} entries in view`} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatTile label="Total spend" value={formatINR(totalSpend)} />
        <StatTile label="Settled" value={formatINR(totalSettled)} />
        <StatTile label="Owed to suppliers" value={formatINR(totalOwed)} />
      </div>

      {/* Filter by month and year */}
      <div className="mb-4 flex flex-wrap items-center gap-4 bg-canvas border border-ash rounded-xl p-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filterMonth"
            className="text-body text-steel"
          >
            Month:
          </label>
          <select
            id="filterMonth"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-md border border-ink bg-canvas py-1.5 px-2 text-body focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value={null}>All</option>
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="filterYear"
            className="text-body text-steel"
          >
            Year:
          </label>
          <select
            id="filterYear"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-md border border-ink bg-canvas py-1.5 px-2 text-body focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {/* Populate year options dynamically - Last 2 years and next 3 years */}
            {Array.from(
              { length: 7 },
              (_, i) => new Date().getFullYear() + i - 2
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Search by item name or supplier */}
        <div className="flex items-center gap-2 flex-grow">
          <label
            htmlFor="searchTerm"
            className="text-body text-steel"
          >
            Search:
          </label>
          <input
            type="text"
            id="searchTerm"
            placeholder="Search by item name or supplier"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-md border border-ink bg-canvas py-1.5 px-2 text-body flex-grow focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="mb-6">
        <SectionCard title="Add expense">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <label htmlFor="itemName" className="block text-caption font-medium text-steel mb-1">
                Item name
              </label>
              <input
                type="text"
                id="itemName"
                placeholder="e.g. Mustard seed (raw)"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="block w-full rounded-md border border-ink bg-canvas py-2 px-3 text-body focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="supplier" className="block text-caption font-medium text-steel mb-1">
                Supplier
              </label>
              <input
                type="text"
                id="supplier"
                placeholder="Supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="block w-full rounded-md border border-ink bg-canvas py-2 px-3 text-body focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="quantity" className="block text-caption font-medium text-steel mb-1">
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="block w-full rounded-md border border-ink bg-canvas py-2 px-3 text-body focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="totalAmount" className="block text-caption font-medium text-steel mb-1">
                Total amount (₹)
              </label>
              <input
                type="number"
                id="totalAmount"
                placeholder="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="block w-full rounded-md border border-ink bg-canvas py-2 px-3 text-body focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label htmlFor="paidAmount" className="block text-caption font-medium text-steel mb-1">
                Paid amount (₹)
              </label>
              <input
                type="number"
                id="paidAmount"
                placeholder="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="block w-full rounded-md border border-ink bg-canvas py-2 px-3 text-body focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <button
            onClick={handleAddExpense}
            className="mt-4 bg-ink text-white px-4 py-2 rounded-lg font-medium hover:bg-charcoal transition-colors"
          >
            Add expense
          </button>
        </SectionCard>
      </div>

      <SectionCard title="Expense list" bodyClassName="">
        {filteredExpenses.length === 0 ? (
          <EmptyState title="No expenses in this period" hint="Add an expense above, or widen the month/year filter." />
        ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-body">
            <thead>
              <tr className="text-caption text-fog uppercase tracking-wide">
                <th className="border-b border-ash px-3 py-2 text-left font-medium">Item</th>
                <th className="border-b border-ash px-3 py-2 text-right font-medium">Qty</th>
                <th className="border-b border-ash px-3 py-2 text-right font-medium">Total</th>
                <th className="border-b border-ash px-3 py-2 text-right font-medium">Paid</th>
                <th className="border-b border-ash px-3 py-2 text-right font-medium">Unpaid</th>
                <th className="border-b border-ash px-3 py-2 text-left font-medium">Status</th>
                <th className="border-b border-ash px-3 py-2 text-left font-medium">Supplier</th>
                <th className="border-b border-ash px-3 py-2 text-left font-medium">Date</th>
                <th className="border-b border-ash px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(
                (
                  item // Render filteredExpenses
                ) => (
                  <tr key={item.id} className="hover:bg-paper transition-colors">
                    <td className="border-b border-ash px-3 py-2 text-charcoal font-medium">{item.itemName}</td>
                    <td className="border-b border-ash px-3 py-2 text-charcoal text-right tabular-nums">{formatNumber(item.quantity)}</td>
                    <td className="border-b border-ash px-3 py-2 text-charcoal text-right tabular-nums">
                      {formatINR(item.totalAmount)}
                    </td>
                    <td className="border-b border-ash px-3 py-2 text-right">
                      <input
                        type="number"
                        value={item.paidAmount}
                        onChange={(e) =>
                          handleUpdateExpense(
                            item.id,
                            parseFloat(e.target.value)
                          )
                        }
                        className="border border-ink p-1 rounded-md w-24 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </td>
                    <td className="border-b border-ash px-3 py-2 text-charcoal text-right tabular-nums">
                      {formatINR(item.unpaidAmount)}
                    </td>
                    <td className="border-b border-ash p-2">
                      {item.status === "Paid" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-mint text-mint-fg text-caption font-medium">
                          <FaCheckCircle size={10} /> Paid
                        </span>
                      ) : item.status === "Unpaid" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-caption font-medium">
                          <FaTimesCircle size={10} /> Unpaid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-tangerine/10 text-tangerine text-caption font-medium">Partially Paid</span>
                      )}
                    </td>
                    <td className="border-b border-ash p-2 text-steel">{item.supplier}</td>
                    <td className="border-b border-ash p-2 text-steel">{formatDate(item.date)}</td>
                    <td className="border-b border-ash p-2">
                      <button
                        onClick={() => handleDeleteConfirm(item.id)}
                        className="bg-canvas text-red-600 border border-ash px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        )}
      </SectionCard>
      <button
        onClick={downloadExcel}
        className="mt-4 bg-canvas text-charcoal border border-ash px-4 py-2 rounded-lg font-medium hover:bg-paper transition-colors"
      >
        Download Excel
      </button>
     </PageContainer>
      <ToastContainer />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirmation}
        onRequestClose={() => setShowDeleteConfirmation(false)}
        style={{
          content: {
            maxWidth: "300px",
            margin: "auto",
            height: "250px",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e5e5e5",
            boxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.1) 0px 4px 6px -4px",
          },
          overlay: {
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
        }}
      >
        <h2 className="text-body-lg font-semibold mb-3 text-charcoal">Delete Expense?</h2>
        <p className="mb-4 text-body text-steel">Are you sure you want to delete this expense?</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowDeleteConfirmation(false)}
            className="bg-canvas text-charcoal border border-ash px-3 py-1.5 rounded-lg text-body hover:bg-paper transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteExpense}
            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-body hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Expenses;