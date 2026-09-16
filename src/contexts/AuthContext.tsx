// Auth context providing Firebase authentication state throughout the app
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type OAuthCredential,
  type User,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import { auth, googleProvider } from '@/config/firebase';
import { syncUserProfile, seedDemoProjectIfEmpty, getUserAPIKeysFromFirestore } from '@/services/firestoreService';
import { saveAIKey } from '@/services/aiService';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function mapFirebaseUser(user: User, credential?: OAuthCredential | null): UserProfile {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    accessToken: credential?.accessToken ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const mapped = mapFirebaseUser(firebaseUser);
        setUser(mapped);
        syncUserProfile(mapped);
        seedDemoProjectIfEmpty(mapped.uid);

        // Load saved API keys from Firestore database into session/local memory
        getUserAPIKeysFromFirestore(mapped.uid).then((keys) => {
          if (keys.gemini) saveAIKey('gemini', keys.gemini);
          if (keys.openai) saveAIKey('openai', keys.openai);
          if (keys.anthropic) saveAIKey('anthropic', keys.anthropic);
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setUser(mapFirebaseUser(result.user, credential));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setError(message);
      console.error('Auth error:', err);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-out failed';
      setError(message);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, error, signInWithGoogle, logout }),
    [user, loading, error, signInWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
