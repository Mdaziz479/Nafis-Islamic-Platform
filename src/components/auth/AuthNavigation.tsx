"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { ROUTES } from "@/lib/constants/routes";

export function AuthNavigation({ mobile = false }: { readonly mobile?: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogout() {
    if (!auth) return;
    setPending(true);
    setMessage(null);
    try {
      await auth.logout();
      router.replace(ROUTES.home);
      router.refresh();
    } catch {
      setMessage("Sign out could not be completed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (!auth || auth.isLoading) {
    return mobile ? (
      <Link href={`${ROUTES.account}?next=${encodeURIComponent(ROUTES.dashboard)}`}>Sign in</Link>
    ) : (
      <Link className="button button-secondary" href={ROUTES.account}>Log in</Link>
    );
  }

  if (!auth.user) {
    return mobile ? (
      <Link href={`${ROUTES.account}?next=${encodeURIComponent(ROUTES.dashboard)}`}>Sign in</Link>
    ) : (
      <Link className="button button-secondary" href={ROUTES.account}>Log in</Link>
    );
  }

  if (mobile) {
    return (
      <>
        <span className="mobile-account-label">Signed in as {auth.user.name}</span>
        <Link href={ROUTES.dashboard}>Dashboard</Link>
        <Link href={ROUTES.settings}>Settings</Link>
        <button type="button" disabled={pending} onClick={() => void handleLogout()}>
          {pending ? "Signing out..." : "Sign out"}
        </button>
        {message ? <output aria-live="polite">{message}</output> : null}
      </>
    );
  }

  return (
    <div className="auth-navigation">
      <Link className="auth-account-name" href={ROUTES.dashboard} title={auth.user.email}>
        {auth.user.name}
      </Link>
      <button className="button button-secondary" type="button" disabled={pending} onClick={() => void handleLogout()}>
        {pending ? "Signing out..." : "Sign out"}
      </button>
      {message ? <output className="auth-navigation-message" aria-live="polite">{message}</output> : null}
    </div>
  );
}