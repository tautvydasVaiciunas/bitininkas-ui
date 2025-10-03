import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/lib/types';
import { mockUsers } from '@/lib/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for saved user in localStorage
    const savedUser = localStorage.getItem('bitininkas_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // TODO: call POST /auth/login
    
    // Mock login - check against demo users
    const foundUser = mockUsers.find((u) => u.email === email);
    
    if (!foundUser) {
      return { success: false, error: 'Neteisingas el. paštas arba slaptažodis' };
    }

    // In real app, verify password hash
    if (password !== 'password') {
      return { success: false, error: 'Neteisingas el. paštas arba slaptažodis' };
    }

    setUser(foundUser);
    setIsAuthenticated(true);
    localStorage.setItem('bitininkas_user', JSON.stringify(foundUser));

    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('bitininkas_user');
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    // TODO: call POST /auth/register
    
    // Mock registration
    const existingUser = mockUsers.find((u) => u.email === email);
    
    if (existingUser) {
      return { success: false, error: 'Vartotojas su tokiu el. paštu jau egzistuoja' };
    }

    const newUser: User = {
      id: `${mockUsers.length + 1}`,
      name: name || 'Naujas vartotojas',
      email,
      role: 'user',
      groupId: '1',
      createdAt: new Date().toISOString(),
    };

    setUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('bitininkas_user', JSON.stringify(newUser));

    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
