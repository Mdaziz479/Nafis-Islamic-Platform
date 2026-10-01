"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type AuthUser } from "@/components/auth/AuthContext";
import { getQuranReaderPreferencesSnapshot } from "@/components/quran/reader-preferences";
import {
  clearGuestUserData,
  getGuestUserDataSnapshot,
} from "@/components/quran/guest-user-data";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

function getFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function validateFields(formData: FormData, registering: boolean): FieldErrors {
  const name = getFormValue(formData, "name").trim();
  const email = getFormValue(formData, "email").trim();
  const password = getFormValue(formData, "password");
  const errors: FieldErrors = {};
  const atIndex = email.indexOf("@");
  const finalDotIndex = email.lastIndexOf(".");
  const validEmail = atIndex > 0
    && finalDotIndex > atIndex + 1
    && finalDotIndex < email.length - 1
    && !/\s/.test(email);

  if (registering && !name) errors.name = "Enter your name.";
  if (!email) errors.email = "Enter your email address.";
  else if (!validEmail) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  else if (registering && password.length < 8) errors.password = "Use at least 8 characters.";

  return errors;
}

function getAuthenticationError(status: number) {
  if (status === 401) return "We couldn't match that email and password. Check them and try again.";
  if (status === 409) return "An account with this email already exists. Sign in instead.";
  if (status === 400) return "Please check your details and try again.";
  return "We couldn't complete your request. Please try again shortly.";
}

export function AccountForm() {
  const auth = useAuth();
  const router = useRouter();
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setMessage(null);
    setIsSuccess(false);
    const body = registering
      ? { name: getFormValue(formData, "name"), email: getFormValue(formData, "email"), password: getFormValue(formData, "password") }
      : { email: getFormValue(formData, "email"), password: getFormValue(formData, "password") };
    try {
      const response = await fetch(`/api/auth/${registering ? "register" : "login"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) {
        setMessage(getAuthenticationError(response.status));
        return;
      }
      const result = await response.json() as { user?: AuthUser };
      if (result.user) auth?.setAuthenticatedUser(result.user);
      let dataSynced = false;
      try {
        const syncResponse = await fetch("/api/user-data/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...getGuestUserDataSnapshot(),
            settings: getQuranReaderPreferencesSnapshot(),
          }),
        });
        dataSynced = syncResponse.ok;
        if (dataSynced) {
          clearGuestUserData();
          sessionStorage.removeItem("sakinah:guest-sync-pending");
        } else {
          sessionStorage.setItem("sakinah:guest-sync-pending", "1");
        }
      } catch {
        dataSynced = false;
        sessionStorage.setItem("sakinah:guest-sync-pending", "1");
      }
      window.dispatchEvent(new Event("sakinah-auth-change"));
      window.dispatchEvent(new Event("sakinah-guest-sync-state-change"));
      setIsSuccess(dataSynced);
      router.replace(getSafeReturnPath());
      router.refresh();
    } catch { setMessage("Authentication is currently unavailable."); }
    finally { setPending(false); }
  }

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const errors = validateFields(formData, registering);
    setFieldErrors(errors);
    setMessage(null);
    if (Object.keys(errors).length > 0) return;
    void submit(formData);
  }

  function switchMode(nextRegistering: boolean) {
    setRegistering(nextRegistering);
    setFieldErrors({});
    setMessage(null);
    setIsSuccess(false);
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  let submitLabel = "Sign in";
  if (registering) submitLabel = "Create account";
  if (pending) submitLabel = "Please wait";

  return (
    <Card as="section" className="account-panel" aria-label="Account access">
      <div className="account-panel-heading">
        <span className="account-panel-eyebrow">{registering ? "A NEW BEGINNING" : "WELCOME BACK"}</span>
        <h2>{registering ? "Create your account" : "Sign in"}</h2>
        <p>{registering ? "A few details and your reading space is ready." : "Pick up right where you left off."}</p>
      </div>

      <fieldset className="account-mode-switch">
        <legend className="visually-hidden">Choose an account action</legend>
        <Button
          type="button"
          variant="secondary"
          className={`account-mode-button${registering ? "" : " is-active"}`}
          aria-pressed={!registering}
          disabled={pending}
          onClick={() => switchMode(false)}
        >
          Sign in
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={`account-mode-button${registering ? " is-active" : ""}`}
          aria-pressed={registering}
          disabled={pending}
          onClick={() => switchMode(true)}
        >
          Create account
        </Button>
      </fieldset>

      <form className="account-form" onSubmit={handleSubmit} noValidate>
        {registering && (
          <div className="account-field">
            <label htmlFor="account-name">Name</label>
            <input
              id="account-name"
              name="name"
              type="text"
              autoComplete="name"
              maxLength={120}
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? "account-name-error" : undefined}
              onChange={() => clearFieldError("name")}
              disabled={pending}
            />
            {fieldErrors.name && <p className="account-field-error" id="account-name-error">{fieldErrors.name}</p>}
          </div>
        )}

        <div className="account-field">
          <label htmlFor="account-email">Email</label>
          <input
            id="account-email"
            name="email"
            type="email"
            autoComplete="email"
            aria-required="true"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "account-email-error" : undefined}
            onChange={() => clearFieldError("email")}
            disabled={pending}
          />
          {fieldErrors.email && <p className="account-field-error" id="account-email-error">{fieldErrors.email}</p>}
        </div>

        <div className="account-field">
          <label htmlFor="account-password">Password</label>
          <div className="account-password-control">
            <input
              id="account-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={registering ? "new-password" : "current-password"}
              aria-required="true"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "account-password-error" : undefined}
              onChange={() => clearFieldError("password")}
              disabled={pending}
            />
            <button
              type="button"
              className="account-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              disabled={pending}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.password && <p className="account-field-error" id="account-password-error">{fieldErrors.password}</p>}
        </div>

        <Button type="submit" className="account-submit-button" disabled={pending}>
          {pending && <span className="account-spinner" aria-hidden="true" />}
          {submitLabel}
        </Button>

        {message && (
          <output className={`account-feedback${isSuccess ? " is-success" : " is-error"}`} aria-live="polite">
            {message}
          </output>
        )}
      </form>
    </Card>
  );
}

function getSafeReturnPath() {
  const fallback = "/dashboard";
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested || !requested.startsWith("/") || requested.startsWith("//") || requested.includes("\\")) {
    return fallback;
  }
  try {
    const destination = new URL(requested, window.location.origin);
    if (destination.origin !== window.location.origin || destination.pathname === "/account") return fallback;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}
