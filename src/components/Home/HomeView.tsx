"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import type { BoardType } from "@/lib/boards";
import DecisionsPanel, { type Decision, type User } from "./DecisionsPanel";

const TODAY = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function HomeView({
  initialDecisions,
  initialUsers,
}: {
  initialDecisions: Decision[];
  initialUsers: User[];
}) {
  const [title, setTitle] = useState("");
  const [captureType, setCaptureType] = useState<BoardType>("TASK");
  const [flash, setFlash] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  async function handleCapture(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCapturing(true);
    setFlash(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardType: captureType, title }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Could not add card.");
      }
      setTitle("");
      setFlash("Added to the board.");
      setTimeout(() => setFlash(null), 2500);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Could not add card.");
    } finally {
      setCapturing(false);
    }
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">{TODAY}</p>
          <h1>Morning, crew</h1>
        </div>
      </header>
      <p className="page-purpose">
        Start here — capture what&apos;s on your mind and keep the important decisions moving.
      </p>

      <div className="capture-panel">
        <div>
          <h2>Got something on your mind?</h2>
          <p className="panel-note">
            {flash ?? "Capture it before it disappears."}
          </p>
        </div>
        <form onSubmit={handleCapture} className="capture-row">
          <input
            className="capture-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Map pins overlap when zoomed in on Manchester"
            disabled={capturing}
          />
          <select
            className="capture-select"
            value={captureType}
            onChange={(e) => setCaptureType(e.target.value as BoardType)}
            disabled={capturing}
          >
            <option value="FEATURE">Feature idea</option>
            <option value="BUG">Bug</option>
            <option value="TASK">Task</option>
          </select>
          <button className="btn-primary" type="submit" disabled={capturing}>
            {capturing ? "Adding..." : "Add card"}
          </button>
        </form>
      </div>

      <div className="home-showcase">
        <DecisionsPanel initialDecisions={initialDecisions} initialUsers={initialUsers} />
        <section className="fun-panel" aria-label="Siply">
          <div className="logo-stage" aria-hidden="true">
            <span className="logo-ring" />
            <span className="logo-ring is-inner" />
            <span className="logo-tick tick-a" />
            <span className="logo-tick tick-b" />
            <span className="logo-tick tick-c" />
            <span className="logo-tick tick-d" />
            <Image
              className="siply-logo-hero"
              src="/assets/siply-logo-rating.png"
              alt=""
              width={1024}
              height={1024}
              priority
            />
          </div>
          <div className="fun-copy">
            <div>
              <p className="fun-kicker">Siply HQ</p>
              <p className="fun-title">Keep it moving</p>
            </div>
            <span className="fun-chip">Internal hub</span>
          </div>
        </section>
      </div>
    </section>
  );
}
