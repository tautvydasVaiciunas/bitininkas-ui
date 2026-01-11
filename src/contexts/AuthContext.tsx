import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, {
  HttpError,
  clearCredentials,
  persistAuthUser,
  setAuthStorageMode,
  setToken,
  readStoredSession,
} from '@/lib/api';
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
  isBootstrapping: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
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
  const [isBootstrapping, setIsBootstrapping] = useState(true);

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
      subscriptionValidUntil:
        'subscriptionValidUntil' in data ? data.subscriptionValidUntil ?? null : null,
      createdAt: 'createdAt' in data && data.createdAt ? data.createdAt : fallbackCreatedAt,
    };
  }, []);

  const updateUserProfile = useCallback(
    (updates: Partial<User>) => {
      setUser((previous) => {
        if (!previous) return previous;
        const normalized = normalizeUser({ ...previous, ...updates });
        if (!normalized) return previous;
        persistAuthUser(normalized);
        return normalized;
      });
    },
    [normalizeUser]
  );

  const logout = useCallback(() => {
    clearCredentials();
    setUser(null);
    setIsBootstrapping(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedSession = readStoredSession();
    const mode = storedSession.storageMode ?? 'session';
    setAuthStorageMode(mode);

    const savedUserRaw = storedSession.userRaw;
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

    const storedAccessToken = storedSession.accessToken;
    const storedRefreshToken = storedSession.refreshToken;

    if (!storedAccessToken) {
      setIsBootstrapping(false);
      return;
    }

    setToken(storedAccessToken, storedRefreshToken);

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const profile = await api.auth.me();
        const normalizedUser = normalizeUser(mapUserFromApi(profile));
        if (normalizedUser && !cancelled) {
          setUser(normalizedUser);
          persistAuthUser(normalizedUser);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to restore session', error);
          logout();
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [normalizeUser, logout]);

  const login = async (
    email: string,
    password: string,
    remember = false,
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
      return 'Neteisingas el. paštas arba slaptažodis';
    };

    try {
      setAuthStorageMode(remember ? 'local' : 'session');
      const result = await api.auth.login({ email, password });
      setToken(result.accessToken, result.refreshToken);

      const profile = await api.auth.me();
      const normalizedUser = normalizeUser(mapUserFromApi(profile));
      if (normalizedUser) {
        setUser(normalizedUser);
        persistAuthUser(normalizedUser);
      }

      return { success: true };
    } catch (error) {
      logout();
      return { success: false, error: getErrorMessage(error) };
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isBootstrapping, login, logout, updateUserProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};
