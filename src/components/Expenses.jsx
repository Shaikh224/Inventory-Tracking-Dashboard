import React, { useEffect, useState } from "react";
import { db, collection, addDoc, deleteDoc, updateDoc, getDocs, doc } from "../firebase";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa"; 
import { toast, ToastContainer } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css"; 
import * as XLSX from 'xlsx';
import Modal from 'react-modal'; // Import Modal component

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

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Expenses</h1>

      {/* Filter by month and year */}
      <div className="mb-4 flex items-center">
        <label
          htmlFor="filterMonth"
          className="block text-sm font-medium text-gray-700 mr-2"
        >
          Filter by Month:
        </label>
        <select
          id="filterMonth"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value={null}>All</option>
          <option value="1">January</option>
          <option value="2">February</option>
          <option value="3">March</option>
          <option value="4">April</option>
          <option value="5">May</option>
          <option value="6">June</option>
          <option value="7">July</option>
          <option value="8">August</option>
          <option value="9">September</option>
          <option value="10">October</option>
          <option value="11">November</option>
          <option value="12">December</option>
        </select>

        <label
          htmlFor="filterYear"
          className="block text-sm font-medium text-gray-700 mr-2"
        >
          Filter by Year:
        </label>
        <select
          id="filterYear"
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
      <div className="mb-4 flex items-center">
        <label
          htmlFor="searchTerm"
          className="block text-sm font-medium text-gray-700 mr-2"
        >
          Search:
        </label>
        <input
          type="text"
          id="searchTerm"
          placeholder="Search by item name or supplier"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-bold mb-4">Add Expense</h2>
        <div className="mb-4">
          <label
            htmlFor="itemName"
            className="block text-sm font-medium text-gray-700"
          >
            Item Name:
          </label>
          <input
            type="text"
            id="itemName"
            placeholder="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-gray-700"
          >
            Quantity:
          </label>
          <input
            type="number"
            id="quantity"
            placeholder="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="totalAmount"
            className="block text-sm font-medium text-gray-700"
          >
            Total Amount:
          </label>
          <input
            type="number"
            id="totalAmount"
            placeholder="Total Amount"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="paidAmount"
            className="block text-sm font-medium text-gray-700"
          >
            Paid Amount:
          </label>
          <input
            type="number"
            id="paidAmount"
            placeholder="Paid Amount"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="mb-4">
          <label
            htmlFor="supplier"
            className="block text-sm font-medium text-gray-700"
          >
            Supplier:
          </label>
          <input
            type="text"
            id="supplier"
            placeholder="Supplier"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleAddExpense}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Add Expense
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Expense List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border table-auto">
            <thead>
              <tr>
                <th className="border p-2">Item Name</th>
                <th className="border p-2">Quantity</th>
                <th className="border p-2">Total Amount</th>
                <th className="border p-2">Paid Amount</th>
                <th className="border p-2">Unpaid Amount</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Supplier</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(
                (
                  item // Render filteredExpenses
                ) => (
                  <tr key={item.id}>
                    <td className="border p-2">{item.itemName}</td>
                    <td className="border p-2">{item.quantity}</td>
                    <td className="border p-2">
                      ₹{(item.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="border p-2">
                      <input
                        type="number"
                        value={item.paidAmount}
                        onChange={(e) =>
                          handleUpdateExpense(
                            item.id,
                            parseFloat(e.target.value)
                          )
                        }
                        className="border p-1 rounded w-24"
                      />
                    </td>
                    <td className="border p-2">
                      ₹{(item.unpaidAmount || 0).toFixed(2)}
                    </td>
                    <td className="border p-2 flex items-center">
                      {item.status === "Paid" ? (
                        <span className="text-green-500 flex items-center">
                          <FaCheckCircle /> Paid
                        </span>
                      ) : item.status === "Unpaid" ? (
                        <span className="text-red-500 flex items-center">
                          <FaTimesCircle /> Unpaid
                        </span>
                      ) : (
                        <span className="text-orange-500">Partially Paid</span>
                      )}
                    </td>
                    <td className="border p-2">{item.supplier}</td>
                    <td className="border p-2">{formatDate(item.date)}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => handleDeleteConfirm(item.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded"
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
      </div>
      <button
        onClick={downloadExcel}
        className="mt-4 bg-green-500 text-white p-2 rounded"
      >
        Download Excel
      </button>
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
            borderRadius: "8px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
          },
          overlay: {
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
        }}
      >
        <h2 className="text-lg font-semibold mb-4">Delete Expense?</h2>
        <p className="mb-4">Are you sure you want to delete this expense?</p>
        <div className="flex justify-end">
          <button
            onClick={() => setShowDeleteConfirmation(false)}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteExpense}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Expenses;