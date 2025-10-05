import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { HttpError, clearCredentials, setToken } from '@/lib/api';
import type { AuthenticatedUser, UserRole } from '@/lib/types';
import { mapUserFromApi } from '@/lib/types';

export type User = AuthenticatedUser & {
  phone?: string | null;
  address?: string | null;
  createdAt?: string | null;
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: Partial<User>) => void;
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

  const normalizeUser = useCallback((data: Partial<AuthenticatedUser> | Partial<User> | null | undefined): User | null => {
    if (!data || !data.id || !data.email) {
      return null;
    }

    const fallbackCreatedAt = new Date().toISOString();

    return {
      id: data.id,
      email: data.email,
      name: data.name && data.name.trim().length > 0 ? data.name : data.email,
      role: (data.role as UserRole) ?? 'user',
      phone: 'phone' in data ? data.phone ?? null : undefined,
      address: 'address' in data ? data.address ?? null : undefined,
      createdAt: 'createdAt' in data && data.createdAt ? data.createdAt : fallbackCreatedAt,
    };
  }, []);

  const persistUser = useCallback((value: User | null) => {
    if (typeof window === 'undefined') return;
    if (value) {
      window.localStorage.setItem('bitininkas_user', JSON.stringify(value));
    } else {
      window.localStorage.removeItem('bitininkas_user');
    }
  }, []);

  const updateUserProfile = useCallback(
    (updates: Partial<User>) => {
      setUser((previous) => {
        if (!previous) return previous;
        const normalized = normalizeUser({ ...previous, ...updates });
        if (!normalized) return previous;
        persistUser(normalized);
        return normalized;
      });
    },
    [normalizeUser, persistUser]
  );

  const logout = useCallback(() => {
    clearCredentials();
    setUser(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedUserRaw = window.localStorage.getItem('bitininkas_user');
    if (savedUserRaw) {
      try {
        const parsed = JSON.parse(savedUserRaw) as Partial<User>;
        const normalized = normalizeUser(parsed);
        if (normalized) {
          setUser(normalized);
        }
      } catch (error) {
        console.warn('Failed to parse stored user', error);
      }
    }

    const storedAccessToken = window.localStorage.getItem('bitininkas_access_token');
    const storedRefreshToken = window.localStorage.getItem('bitininkas_refresh_token');

    if (!storedAccessToken) {
      return;
    }

    setToken(storedAccessToken, storedRefreshToken);

    const bootstrap = async () => {
      try {
        const profile = await api.auth.me();
        const normalizedUser = normalizeUser(mapUserFromApi(profile));
        if (normalizedUser) {
          setUser(normalizedUser);
          persistUser(normalizedUser);
        }
      } catch (error) {
        console.error('Failed to restore session', error);
        logout();
      }
    };

    void bootstrap();
  }, [normalizeUser, logout, persistUser]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const getErrorMessage = (err: unknown) => {
      if (err instanceof HttpError) {
        const data = err.data as { message?: string } | undefined;
        if (data?.message) {
          return data.message;
        }
        return err.message;
      }
      if (err instanceof Error) {
        return err.message;
      }
      return 'Neteisingas el. paštas arba slaptažodis';
    };

    try {
      const result = await api.auth.login({ email, password });
      setToken(result.accessToken, result.refreshToken);

      const profile = await api.auth.me();
      const normalizedUser = normalizeUser(mapUserFromApi(profile));
      if (normalizedUser) {
        setUser(normalizedUser);
        persistUser(normalizedUser);
      }

      return { success: true };
    } catch (error) {
      logout();
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const getErrorMessage = (err: unknown) => {
      if (err instanceof HttpError) {
        const data = err.data as { message?: string } | undefined;
        if (data?.message) {
          return data.message;
        }
        return err.message;
      }
      if (err instanceof Error) {
        return err.message;
      }
      return 'Registracija nepavyko. Bandykite dar kartą vėliau.';
    };

    try {
      const result = await api.auth.register({ name, email, password });
      setToken(result.accessToken, result.refreshToken);

      const profile = await api.auth.me();
      const normalizedUser = normalizeUser(mapUserFromApi(profile));
      if (normalizedUser) {
        setUser(normalizedUser);
        persistUser(normalizedUser);
      }

      return { success: true };
    } catch (error) {
      logout();
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, register, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
