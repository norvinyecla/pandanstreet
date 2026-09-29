import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from '../api/client.ts';
import type { UserProfile } from '../api/types.ts';

interface AuthContextValue {
  currentUser: UserProfile | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get<UserProfile>('/auth/me')
      .then((user) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        if (!cancelled) setCurrentUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const user = await api.post<UserProfile>('/auth/login', {
      username,
      password,
    });
    setCurrentUser(user);
  }, []);

  const signup = useCallback(
    async (username: string, name: string, password: string) => {
      const user = await api.post<UserProfile>('/auth/signup', {
        username,
        name,
        password,
      });
      setCurrentUser(user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post<void>('/auth/logout');
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
    setCurrentUser(null);
  }, []);

  const value = useMemo(
    () => ({ currentUser, isLoading, login, signup, logout }),
    [currentUser, isLoading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
