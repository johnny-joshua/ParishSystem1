import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getMe } from '../services/api';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'hf_parish_user';

function extractUser(res) {
  const payload = res?.data;
  return payload?.user ?? payload?.data?.user ?? null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveUser = (userData) => {
    setUser(userData);
    if (userData) {
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    } else {
      sessionStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const loadUser = useCallback(async () => {
    try {
      const res = await getMe();
      saveUser(extractUser(res));
    } catch {
      saveUser(null);
    } finally {
      setLoading(false);
    }
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
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    const userData = extractUser(res);
    saveUser(userData);
    return userData;
  };

  const register = async (formData) => {
    const res = await apiRegister({
      ...formData,
      confirm_password: formData.confirm_password ?? formData.confirm,
    });
    // Registration only creates the account; do not auto-authenticate the user.
    return extractUser(res);
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      saveUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAdmin: user?.role === 'admin',
        isUser: user?.role === 'user',
        loadUser,
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
