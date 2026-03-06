"use client";

import { useState } from "react";

interface Props {
  nominationCount: number;
}

export default function SlackRally({ nominationCount }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleRally() {
    setSending(true);
    const res = await fetch("/api/slack/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rally", message: message.trim() || undefined }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setMessage("");
      setTimeout(() => { setSent(false); setOpen(false); }, 3000);
    } else {
      const data = await res.json();
      alert(data.error || "Failed to send");
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-dashed border-purple-300 bg-purple-50 p-4">
      <p className="text-sm text-purple-700 mb-3 text-center">
        {nominationCount === 0
          ? "It's quiet in here... rally the team to get nominating!"
          : nominationCount === 1
          ? "Only 1 item so far — need more competition!"
          : `Only ${nominationCount} items — the more the merrier!`}
      </p>

      {!open ? (
        <div className="text-center">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Rally the team on Slack
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a custom message... (optional)"
            rows={2}
            className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setOpen(false); setMessage(""); }}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleRally}
              disabled={sending || sent}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                sent
                  ? "bg-purple-200 text-purple-600"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              } disabled:opacity-60`}
            >
              {sent ? "Sent!" : sending ? "Sending..." : "Send to Slack"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
