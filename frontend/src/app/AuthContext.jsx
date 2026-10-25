import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  checkSetupStatus,
  setAuthToken,
  getAuthToken,
  getCompanyProfile,
} from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [company, setCompany] = useState(null);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const initAuth = async () => {
    try {
      // 1. Check if first run setup is needed
      const setupRes = await checkSetupStatus();
      if (setupRes.isFirstRun) {
        setIsFirstRun(true);
        setIsLoading(false);
        return;
      }

      setIsFirstRun(false);

      if (!getAuthToken()) return;

      const meRes = await getMe();
      if (meRes.success && meRes.user) {
        setUser(meRes.user);
        setEmployee(meRes.employee);

        const compRes = await getCompanyProfile();
        if (compRes?.company) {
          setCompany(compRes.company);
        }
      }
    } catch {
      setUser(null);
      setEmployee(null);
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin(email, password);
    if (res.success && res.data) {
      setAuthToken(res.data.tokens.accessToken);
      setUser(res.data.user);
      setEmployee(res.data.employee);
      setCompany(res.data.company);
      setIsFirstRun(false);
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // continue cleanup
    }
    setAuthToken(null);
    setUser(null);
    setEmployee(null);
  };

  const refreshUser = async () => {
    try {
      const meRes = await getMe();
      if (meRes.success && meRes.user) {
        setUser(meRes.user);
        setEmployee(meRes.employee);
      }
      const compRes = await getCompanyProfile();
      if (compRes?.company) {
        setCompany(compRes.company);
      }
    } catch (e) {
      console.warn('Could not refresh user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        company,
        isFirstRun,
        setIsFirstRun,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
