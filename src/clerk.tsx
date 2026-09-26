import { ClerkProvider, SignInButton, useAuth, UserButton, useUser } from "@clerk/react";
import { plPL } from "@clerk/localizations";
import { useMemo, type ReactNode } from "react";
import { AuthContext, useAuthInfo, type AuthInfo } from "./auth.tsx";

// Cały kod Clerka jest w osobnym, leniwie ładowanym pliku — goście go nie pobierają.

function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const displayName = user?.username ?? user?.firstName ?? null;
  const value = useMemo<AuthInfo>(
    () => ({
      enabled: true,
      loaded: isLoaded,
      signedIn: Boolean(isSignedIn),
      userId: userId ?? null,
      displayName,
      getToken: async () => {
        try {
          return (await getToken()) ?? null;
        } catch {
          return null;
        }
      },
    }),
    [isLoaded, isSignedIn, userId, displayName, getToken],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const appearance = {
  variables: {
    colorPrimary: "#6b2fe0",
    colorText: "#2a1650",
    borderRadius: "14px",
    fontFamily: "Nunito, system-ui, sans-serif",
  },
};

export default function ClerkAuth({ publishableKey, children }: { publishableKey: string; children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={publishableKey} localization={plPL} appearance={appearance}>
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}

export function ClerkControls() {
  const auth = useAuthInfo();
  if (!auth.loaded) return null;
  if (auth.signedIn) {
    return (
      <div className="grid size-11 place-items-center rounded-full border-[3px] border-ink bg-white shadow-[0_3px_0_var(--color-ink)]">
        <UserButton />
      </div>
    );
  }
  return (
    <SignInButton mode="modal">
      <button type="button" className="btn btn-sm btn-sun">
        Zaloguj się
      </button>
    </SignInButton>
  );
}
