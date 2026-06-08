import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuth } from '../AuthContext';
import { toast } from 'react-toastify';

function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to log out");
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-gray-900 shadow-lg">
      <div className="container mx-auto flex justify-between items-center p-4">
        <NavLink className="text-white font-bold text-2xl" to="/dashboard">
          Dashboard
        </NavLink>
        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6">
          {user && (
            <>
              <NavLink className="text-gray-300 hover:text-white px-3 py-2 rounded" to="/customers">
                Customers
              </NavLink>
              <NavLink className="text-gray-300 hover:text-white px-3 py-2 rounded" to="/inventory">
                Inventory
              </NavLink>
              <NavLink className="text-gray-300 hover:text-white px-3 py-2 rounded" to="/orders">
                Orders
              </NavLink>
              <NavLink className="text-gray-300 hover:text-white px-3 py-2 rounded" to="/orderhistory">
                Order History
              </NavLink>
              <NavLink className="text-gray-300 hover:text-white px-3 py-2 rounded" to="/expense">
                Expense
              </NavLink>
              <button onClick={handleLogout} className="text-gray-300 hover:text-white px-3 py-2 rounded">
                Logout
              </button>
            </>
          )}
        </div>
        
        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden text-gray-300 hover:text-white focus:outline-none transition-colors duration-200"
        >
          {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-gray-800 transition-all duration-300 ease-in-out">
          <div className="flex flex-col p-4">
            {user && (
              <>
                <NavLink
                  className="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded mb-2"
                  to="/customers"
                  onClick={toggleMenu} // Close menu after navigation
                >
                  Customers
                </NavLink>
                <NavLink
                  className="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded mb-2"
                  to="/inventory"
                  onClick={toggleMenu}
                >
                  Inventory
                </NavLink>
                <NavLink
                  className="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded mb-2"
                  to="/orders"
                  onClick={toggleMenu}
                >
                  Orders
                </NavLink>
                <NavLink
                  className="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded mb-2"
                  to="/orderhistory"
                  onClick={toggleMenu}
                >
                  Order History
                </NavLink>
                <NavLink
                  className="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded mb-2"
                  to="/expense"
                  onClick={toggleMenu}
                >
                  Expense
                </NavLink>
                <hr className="border-gray-700 my-3" />
                <button
                  onClick={() => {
                    handleLogout();
                    toggleMenu(); // Close menu on logout
                  }}
                  className="text-gray-300 hover:text-white transition-colors duration-200 px-3 py-2 rounded"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default Header;
