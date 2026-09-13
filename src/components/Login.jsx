import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Logged in successfully!");
      navigate("/dashboard"); // Redirect to dashboard after login
    } catch (error) {
      console.log("Error code:", error.code); // Debugging line to log Firebase error codes
      switch (error.code) {
        case "auth/invalid-email":
          toast.error("Invalid email format.");
          break;
        case "auth/user-not-found":
          toast.error("No account found with this email.");
          break;
        case "auth/wrong-password":
          toast.error("Incorrect password. Please try again.");
          break;
        default:
          toast.error("Failed to log in. Please check your credentials.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-paper px-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="bg-canvas p-8 rounded-2xl border border-ash shadow-subtle w-full max-w-md">
        <h2 className="text-heading-sm font-medium text-center text-charcoal mb-2 tracking-tight">
          Welcome back
        </h2>
        <p className="text-center text-fog text-body mb-8">Sign in to continue</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-md border border-ink text-body focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-md border border-ink text-body focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
          <button
            type="submit"
            className="bg-ink text-white py-3 rounded-lg font-medium text-body-lg hover:bg-charcoal transition-colors shadow-subtle"
          >
            Sign In
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-fog text-body">
            Login to continue.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
