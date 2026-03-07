"use client";

import { useState, useEffect, useCallback } from "react";

const CHALLENGES = [
  {
    type: "checkbox" as const,
    prompt: "I am not a robot fish",
  },
  {
    type: "grid" as const,
    prompt: "Select all squares with fish",
    gridItems: ["🐟", "🚗", "🐟", "🌮", "🏠", "🐟", "📱", "🐟", "🎸"],
    answers: [0, 2, 5, 7],
  },
  {
    type: "grid" as const,
    prompt: "Select all squares with office supplies",
    gridItems: ["📎", "🌊", "✏️", "🐠", "📎", "🎣", "🖊️", "🍕", "📎"],
    answers: [0, 2, 4, 6, 8],
  },
  {
    type: "grid" as const,
    prompt: "Select all squares with things the office needs",
    gridItems: ["☕", "🍕", "🎧", "🪴", "🍩", "⌨️", "🧃", "🖱️", "🎮"],
    answers: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    type: "math" as const,
    prompt: "Solve: What is the maximum item price?",
    answer: "49.98",
    placeholder: "$XX.XX",
  },
  {
    type: "grid" as const,
    prompt: "Select all squares with Amazon products",
    gridItems: ["📦", "📦", "📦", "📦", "📦", "📦", "📦", "📦", "📦"],
    answers: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    type: "checkbox" as const,
    prompt: "I promise my nomination is under $49.98",
  },
  {
    type: "grid" as const,
    prompt: "Select all squares with traffic lights (there are none)",
    gridItems: ["🐟", "🐠", "🐡", "🎏", "🐟", "🐠", "🐡", "🎏", "🐟"],
    answers: [],
  },
];

export default function FakeCaptcha() {
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [solved, setSolved] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [mathInput, setMathInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [failed, setFailed] = useState(false);

  const nextChallenge = useCallback(() => {
    setSolved((s) => s + 1);
    setSelected([]);
    setMathInput("");
    setChecked(false);
    setFailed(false);
    setChallengeIndex((i) => (i + 1) % CHALLENGES.length);
  }, []);

  // Auto-advance after "verifying"
  useEffect(() => {
    if (verifying) {
      const t = setTimeout(() => {
        setVerifying(false);
        nextChallenge();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [verifying, nextChallenge]);

  const challenge = CHALLENGES[challengeIndex];

  function handleVerify() {
    if (challenge.type === "checkbox") {
      if (checked) {
        setVerifying(true);
      }
      return;
    }

    if (challenge.type === "math") {
      if (mathInput.replace("$", "").trim() === challenge.answer) {
        setVerifying(true);
      } else {
        setFailed(true);
        setTimeout(() => setFailed(false), 1000);
      }
      return;
    }

    if (challenge.type === "grid") {
      const correct = challenge.answers!;
      const isCorrect =
        selected.length === correct.length &&
        selected.every((s) => correct.includes(s));
      if (isCorrect) {
        setVerifying(true);
      } else {
        setFailed(true);
        setSelected([]);
        setTimeout(() => setFailed(false), 1000);
      }
    }
  }

  function toggleGridItem(i: number) {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">C</span>
        </div>
        <span className="text-xs font-medium text-slate-500">
          fishCAPTCHA — solved {solved} so far
        </span>
      </div>

      {verifying ? (
        <div className="text-center py-6">
          <div className="h-8 w-8 mx-auto mb-2 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
          <p className="text-sm text-slate-500">Verifying you are human...</p>
        </div>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-700 mb-3">{challenge.prompt}</p>

          {challenge.type === "checkbox" && (
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300"
              />
              <span className="text-sm text-slate-600">Click to confirm</span>
            </label>
          )}

          {challenge.type === "grid" && (
            <div className="grid grid-cols-3 gap-1.5">
              {challenge.gridItems!.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleGridItem(i)}
                  className={`h-14 rounded-lg text-2xl transition border ${
                    selected.includes(i)
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  } ${failed ? "animate-[shake_0.3s]" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {challenge.type === "math" && (
            <input
              type="text"
              value={mathInput}
              onChange={(e) => setMathInput(e.target.value)}
              placeholder={challenge.placeholder}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                failed
                  ? "border-red-300 bg-red-50"
                  : "border-slate-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              } focus:outline-none`}
              onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
            />
          )}

          <button
            onClick={handleVerify}
            className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Verify
          </button>
        </>
      )}
    </div>
  );
}
