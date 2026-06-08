import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Login from "./components/Login";
import Inventory from "./components/Inventory";
import Orders from "./components/Orders";
import Customers from "./components/Customers";
import Dashboard from "./components/Dashboard";
import Header from "./components/Header";
import OrderHistory from "./components/OrderHistory";
import Expenses from "./components/Expenses";
import CustomerDetails from "./components/CustomerDetails";
import PrivateRoute from "./PrivateRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


function App() {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>; // Show loading until auth state is known

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      {user && <Header />} {/* Show Header only if user is logged in */}
      <div className="container mx-auto mt-4">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
          <Route path="/customer/:customerId" element={<PrivateRoute><CustomerDetails /></PrivateRoute>} />
          <Route path="/orderhistory" element={<PrivateRoute><OrderHistory /></PrivateRoute>} />
          <Route path="/expense" element={<PrivateRoute><Expenses /></PrivateRoute>} />
          
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </>
  );
}

export default App;





