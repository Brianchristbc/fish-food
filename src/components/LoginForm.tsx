"use client";

import { useState } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
  office: string;
}

interface Props {
  onLogin: (user: User) => void;
}

export default function LoginForm({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!email.toLowerCase().endsWith("@tinyfish.io")) {
      setError("Must use a @tinyfish.io email");
      return;
    }

    setSending(true);
    const res = await fetch("/api/auth/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setSending(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    setSending(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    onLogin(meData.user);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="TinyFish" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Fish Food</h1>
          <p className="mt-1 text-sm text-slate-500">
            Nominate & vote on the weekly team purchase
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === "email" ? (
            <form onSubmit={sendCode} noValidate>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tinyfish Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@tinyfish.io"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                style={{ backgroundColor: "#f58220" }}
                className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:brightness-90 disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send verification code"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyCode} noValidate>
              <p className="mb-3 text-sm text-slate-600">
                Code sent to <strong>{email}</strong>
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={sending}
                style={{ backgroundColor: "#f58220" }}
                className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:brightness-90 disabled:opacity-50"
              >
                {sending ? "Verifying..." : "Verify & sign in"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError("");
                }}
                className="mt-2 w-full text-sm text-slate-500 hover:text-slate-700"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

        {/* Decorative illustration */}
        <div className="mt-8 flex justify-center opacity-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/Discover.svg" alt="" className="h-32" />
        </div>
      </div>
    </div>
  );
}
