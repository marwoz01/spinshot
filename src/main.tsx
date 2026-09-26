import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { AuthProvider } from "./auth.tsx";
import "./index.css";

async function boot() {
  // Klucz Clerka przychodzi z serwera, więc wystarczy ustawić go w jednym miejscu (.env serwera).
  const config = await fetch("/api/config")
    .then((res) => res.json() as Promise<{ clerkPublishableKey: string | null }>)
    .catch(() => ({ clerkPublishableKey: null }));

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AuthProvider publishableKey={config.clerkPublishableKey}>
        <App />
      </AuthProvider>
    </StrictMode>,
  );
}

void boot();
