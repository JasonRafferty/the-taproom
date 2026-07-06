"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BOARD_LABELS, BOARD_SLUGS, type BoardType } from "@/lib/boards";

type CardSummary = {
  id: string;
  boardType: BoardType;
  title: string;
  dueDate: string | null;
};
type LinkSummary = { id: string; title: string; url: string };
type HomeData = {
  myOpenCards: CardSummary[];
  dueSoon: CardSummary[];
  recentlyCompleted: CardSummary[];
  quickLinks: LinkSummary[];
};

export default function HomeView() {
  const [data, setData] = useState<HomeData | null>(null);
  const [title, setTitle] = useState("");
  const [captureType, setCaptureType] = useState<BoardType>("TASK");

  async function load() {
    const res = await fetch("/api/home");
    setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCapture(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardType: captureType, title }),
    });
    setTitle("");
    load();
  }

  if (!data) return <p className="page-purpose">Loading…</p>;

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Home</p>
          <h1>Morning, crew</h1>
        </div>
      </header>

      <div className="panel">
        <h2>Got something on your mind?</h2>
        <form onSubmit={handleCapture} className="quick-capture">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
          <select value={captureType} onChange={(e) => setCaptureType(e.target.value as BoardType)}>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature idea</option>
            <option value="TASK">Task</option>
          </select>
          <button className="btn-primary" type="submit">
            Add card
          </button>
        </form>
      </div>

      <div className="panel">
        <h2>My open cards</h2>
        {data.myOpenCards.length === 0 && <p className="column-empty">Nothing assigned to you right now.</p>}
        <ul>
          {data.myOpenCards.map((card) => (
            <li className="list-item" key={card.id}>
              <Link href={`/boards/${BOARD_SLUGS[card.boardType]}`}>
                <span className="card-meta-left">{BOARD_LABELS[card.boardType]}</span> {card.title}
                {card.dueDate && <span className="card-due"> Due {new Date(card.dueDate).toLocaleDateString()}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Due soon</h2>
        {data.dueSoon.length === 0 && <p className="column-empty">Nothing has a due date yet.</p>}
        <ul>
          {data.dueSoon.map((card) => (
            <li className="list-item" key={card.id}>
              <Link href={`/boards/${BOARD_SLUGS[card.boardType]}`}>
                <span className="card-meta-left">{BOARD_LABELS[card.boardType]}</span> {card.title}{" "}
                <span className="card-due">Due {new Date(card.dueDate!).toLocaleDateString()}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Recently completed</h2>
        {data.recentlyCompleted.length === 0 && <p className="column-empty">Nothing completed yet.</p>}
        <ul>
          {data.recentlyCompleted.map((card) => (
            <li className="list-item" key={card.id}>
              <span className="card-meta-left">{BOARD_LABELS[card.boardType]}</span> {card.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Quick links</h2>
        {data.quickLinks.length === 0 && <p className="column-empty">No links yet.</p>}
        <ul>
          {data.quickLinks.map((link) => (
            <li className="list-item" key={link.id}>
              <a href={link.url} target="_blank" rel="noreferrer">
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
