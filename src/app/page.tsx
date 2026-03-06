"use client";

import { useState, useEffect } from "react";
import LoginForm from "@/components/LoginForm";
import NameSetup from "@/components/NameSetup";
import Dashboard from "@/components/Dashboard";

interface User {
  id: string;
  email: string;
  name: string | null;
  office: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/fish.png" alt="Loading" className="h-12 w-12 animate-bounce" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={setUser} />;
  }

  if (!user.name) {
    return <NameSetup user={user} onNameSet={(u) => setUser(u)} />;
  }

  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
