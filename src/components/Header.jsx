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

  const navLinkClass = ({ isActive }) =>
    `px-4 py-2 rounded-full text-body font-medium transition-colors ${
      isActive ? "text-ink bg-paper" : "text-slate hover:text-ink hover:bg-paper"
    }`;

  return (
    <nav className="bg-canvas border-b border-ash">
      <div className="max-w-[1200px] mx-auto flex justify-between items-center px-4 sm:px-6 py-3">
        <NavLink className="text-charcoal font-medium text-subheading tracking-tight" to="/dashboard">
          Inventory<span className="text-accent">.</span>
        </NavLink>
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-1">
          {user && (
            <>
              <NavLink className={navLinkClass} to="/customers">
                Customers
              </NavLink>
              <NavLink className={navLinkClass} to="/inventory">
                Inventory
              </NavLink>
              <NavLink className={navLinkClass} to="/orders">
                Orders
              </NavLink>
              <NavLink className={navLinkClass} to="/orderhistory">
                Order History
              </NavLink>
              <NavLink className={navLinkClass} to="/expense">
                Expense
              </NavLink>
              <button
                onClick={handleLogout}
                className="ml-2 px-4 py-2 rounded-lg text-body font-medium bg-canvas text-charcoal border border-ash hover:bg-paper transition-colors"
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden text-charcoal hover:text-accent focus:outline-none transition-colors duration-200"
        >
          {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-canvas border-t border-ash transition-all duration-300 ease-in-out">
          <div className="flex flex-col p-3 gap-1">
            {user && (
              <>
                <NavLink
                  className={navLinkClass}
                  to="/customers"
                  onClick={toggleMenu}
                >
                  Customers
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/inventory"
                  onClick={toggleMenu}
                >
                  Inventory
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/orders"
                  onClick={toggleMenu}
                >
                  Orders
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/orderhistory"
                  onClick={toggleMenu}
                >
                  Order History
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/expense"
                  onClick={toggleMenu}
                >
                  Expense
                </NavLink>
                <hr className="border-ash my-2" />
                <button
                  onClick={() => {
                    handleLogout();
                    toggleMenu();
                  }}
                  className="px-4 py-2 rounded-lg text-body font-medium bg-canvas text-charcoal border border-ash hover:bg-paper transition-colors text-left"
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
