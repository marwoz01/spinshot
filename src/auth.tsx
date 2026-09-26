import { createContext, lazy, Suspense, useContext, type ReactNode } from "react";

export interface AuthInfo {
  /** Czy logowanie jest skonfigurowane na serwerze (klucze Clerka). */
  enabled: boolean;
  loaded: boolean;
  signedIn: boolean;
  userId: string | null;
  displayName: string | null;
  getToken: () => Promise<string | null>;
}

const guest: AuthInfo = {
  enabled: false,
  loaded: true,
  signedIn: false,
  userId: null,
  displayName: null,
  getToken: async () => null,
};

export const AuthContext = createContext<AuthInfo>(guest);

export const useAuthInfo = () => useContext(AuthContext);

const ClerkAuth = lazy(() => import("./clerk.tsx"));

export function AuthProvider({ publishableKey, children }: { publishableKey: string | null; children: ReactNode }) {
  if (!publishableKey) return <AuthContext.Provider value={guest}>{children}</AuthContext.Provider>;
  return (
    <Suspense fallback={null}>
      <ClerkAuth publishableKey={publishableKey}>{children}</ClerkAuth>
    </Suspense>
  );
}
