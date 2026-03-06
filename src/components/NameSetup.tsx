"use client";

import { useState } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
  office: string;
}

interface Props {
  user: User;
  onNameSet: (user: User) => void;
}

const OFFICES = [
  { value: "US", label: "United States", flag: "🇺🇸" },
  { value: "VN", label: "Vietnam", flag: "🇻🇳" },
  { value: "CN", label: "China", flag: "🇨🇳" },
];

export default function NameSetup({ user, onNameSet }: Props) {
  const [name, setName] = useState("");
  const [office, setOffice] = useState("US");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/auth/set-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, office }),
    });

    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      onNameSet(data.user);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/fish.png" alt="TinyFish" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">Welcome!</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up your profile to get started
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Brian"
              required
              maxLength={30}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />

            <label className="block text-sm font-medium text-slate-700 mb-1 mt-4">
              Office
            </label>
            <div className="grid grid-cols-3 gap-2">
              {OFFICES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOffice(o.value)}
                  className={`rounded-lg border px-3 py-2.5 text-center transition ${
                    office === o.value
                      ? "border-orange-400 bg-orange-50 ring-1 ring-orange-400"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-xl">{o.flag}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{o.label}</div>
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Signed in as {user.email}
            </p>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              style={{ backgroundColor: "#f58220" }}
              className="mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white hover:brightness-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Let's go!"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
