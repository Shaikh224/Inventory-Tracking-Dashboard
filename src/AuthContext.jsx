import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === 'true';

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(SKIP_AUTH ? { uid: 'dev-user', email: 'dev@local' } : null);
  const [loading, setLoading] = useState(!SKIP_AUTH); // Add a loading state

  useEffect(() => {
    if (SKIP_AUTH) return; // Dev-only bypass: skip real Firebase auth entirely

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Stop loading once auth state is known
    });

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
