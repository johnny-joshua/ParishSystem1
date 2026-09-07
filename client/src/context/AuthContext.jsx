import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getMe,
  setUnauthorizedHandler,
} from '../services/api';
import { normalizeRole } from '../utils/roleRedirect';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'hf_parish_user';

function extractUser(res) {
  const payload = res?.data;
  return payload?.user ?? payload?.data?.user ?? null;
}


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkInFlight = useRef(null);

  const saveUser = (userData) => {
    setUser(userData);
    if (userData) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } else {
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const checkAuth = useCallback(() => {
    if (checkInFlight.current) return checkInFlight.current;

    const request = (async () => {
      try {
        const res = await getMe();
        saveUser(extractUser(res));
      } catch (err) {
        const httpStatus = err?.status ?? err?.response?.status;
        if (httpStatus === 401) {
          saveUser(null);
        }
      } finally {
        setLoading(false);
        checkInFlight.current = null;
      }
    })();

    checkInFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    const cached = sessionStorage.getItem(USER_STORAGE_KEY);
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        sessionStorage.removeItem(USER_STORAGE_KEY);
      }
    }
    checkAuth();
  }, [checkAuth]);

  const clearAuth = useCallback(() => {
    saveUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearAuth]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await apiLogin({ email, password });
      const userData = extractUser(res);
      saveUser(userData);
      return userData;
    } catch (err) {
      setAuthError(err.message || 'Login failed.');
      throw err;
    }
  };

  const register = async (formData) => {
    const res = await apiRegister({
      ...formData,
      confirm_password: formData.confirm_password ?? formData.confirm,
    });
    return extractUser(res);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      clearAuth();
    }
  };

  const role = normalizeRole(user?.role);

  return (
    <AuthContext.Provider
      value={{
        // Canonical shape.
        user,
        role,
        isAuthenticated: Boolean(user),
        isLoading: loading,
        authError,
        login,
        logout,
        checkAuth,
        refreshUser: checkAuth,
        clearAuth,
        register,
        // Back-compat aliases already used across the app.
        loading,
        loadUser: checkAuth,
        isAdmin: role === 'admin',
        isUser: role === 'user',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
