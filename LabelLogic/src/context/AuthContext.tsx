import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AuthService from '../services/AuthService';
import { User } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authenticated = await AuthService.isAuthenticated();
      const currentUser = await AuthService.getCurrentUser();
      
      setIsAuthenticated(authenticated);
      setUser(currentUser);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await AuthService.login({ email, password });
      
      setIsAuthenticated(true);
      setUser(response.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AuthService.logout();
      
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      // Still update state even if server logout fails
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};