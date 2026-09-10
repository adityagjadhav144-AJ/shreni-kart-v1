import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type VerificationStatus = "verified" | "pending" | "failed";

export interface UserProfile {
  id: string;
  uid?: string;
  fullName?: string;
  mobile?: string;
  email?: string;
  artisanName?: string;
  craftCategory?: string;
  experienceYears?: number;
  preferredLanguage?: string;
  profileComplete?: boolean;
  village?: string;
  district?: string;
  state?: string;
  verificationStatus?: VerificationStatus;
  verificationMethod?: string;
  providerReferenceId?: string;
}

export interface AuthSession {
  user: {
    id: string;
    name?: string;
    email?: string;
  };
}

interface AuthContextValue {
  user: User | null;
  session: AuthSession | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const DEFAULT_DEMO_USER_ID = "artisan_radha_01";

const DEFAULT_PROFILE: UserProfile = {
  id: DEFAULT_DEMO_USER_ID,
  uid: DEFAULT_DEMO_USER_ID,
  fullName: "Radha Devi",
  artisanName: "Radha Heritage Crafts",
  craftCategory: "Terracotta & Pottery",
  preferredLanguage: "en",
  verificationStatus: "verified",
  verificationMethod: "Aadhaar e-KYC (Demo)",
  providerReferenceId: "DEMO-ARTISAN-001",
  village: "Khurja",
  district: "Bulandshahr",
  state: "Uttar Pradesh",
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: { user: { id: DEFAULT_DEMO_USER_ID, name: "Radha Devi" } },
  profile: DEFAULT_PROFILE,
  loading: false,
  refreshProfile: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const db = getFirebaseDb();
      const docRef = doc(db, "profiles", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setProfile({ id: uid, ...snap.data() } as UserProfile);
      } else {
        setProfile((prev) => prev || { ...DEFAULT_PROFILE, id: uid, uid });
      }
    } catch {
      // Fallback to local profile
      setProfile((prev) => prev || { ...DEFAULT_PROFILE, id: uid, uid });
    }
  }, []);

  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsub = onAuthStateChanged(auth, (firebaseUser) => {
        setUser(firebaseUser);
        if (firebaseUser) {
          void fetchProfile(firebaseUser.uid);
        } else {
          setProfile(DEFAULT_PROFILE);
        }
      });
      return () => unsub();
    } catch {
      setProfile(DEFAULT_PROFILE);
    }
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    const currentId = user?.uid || DEFAULT_DEMO_USER_ID;
    await fetchProfile(currentId);
  }, [user, fetchProfile]);

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      const currentId = user?.uid || DEFAULT_DEMO_USER_ID;
      try {
        const db = getFirebaseDb();
        const docRef = doc(db, "profiles", currentId);
        await setDoc(docRef, data, { merge: true });
      } catch {
        // Fallback update
      }
      setProfile((prev) =>
        prev ? { ...prev, ...data } : ({ id: currentId, ...data } as UserProfile),
      );
    },
    [user],
  );

  const session: AuthSession = {
    user: {
      id: user?.uid || DEFAULT_DEMO_USER_ID,
      name: profile?.fullName || profile?.artisanName || user?.displayName || "Radha Devi",
      email: user?.email || profile?.email || "radha.artisan@kalakart.in",
    },
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
