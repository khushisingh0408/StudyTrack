import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("studytrack_token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("studytrack_token");
      const storedUser = localStorage.getItem("studytrack_user");

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {}
      }

      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
            localStorage.setItem("studytrack_user", JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn("Could not sync profile from server, using local session:", err.message);
          // Keep the stored user session active instead of logging out!
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth-unauthorized", handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    if (res.success && res.token) {
      localStorage.setItem("studytrack_token", res.token);
      localStorage.setItem("studytrack_user", JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || "Login failed");
  };

  const demoLogin = async () => {
    const res = await api.demoLogin();
    if (res.success && res.token) {
      localStorage.setItem("studytrack_token", res.token);
      localStorage.setItem("studytrack_user", JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || "Demo login failed");
  };

  const register = async (userData) => {
    const res = await api.register(userData);
    if (res.success && res.token) {
      localStorage.setItem("studytrack_token", res.token);
      localStorage.setItem("studytrack_user", JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || "Registration failed");
  };

  const resetPassword = async (email, newPassword) => {
    return await api.resetPassword({ email, newPassword });
  };

  const logout = () => {
    localStorage.removeItem("studytrack_token");
    localStorage.removeItem("studytrack_user");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    const res = await api.updateProfile(data);
    if (res.success && res.user) {
      setUser((prev) => ({ ...prev, ...res.user }));
      localStorage.setItem("studytrack_user", JSON.stringify(res.user));
    }
    return res;
  };

  const refreshUserStats = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUser(res.user);
      }
    } catch (e) {
      console.warn("Could not refresh user", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        demoLogin,
        register,
        resetPassword,
        logout,
        updateProfile,
        refreshUserStats,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
