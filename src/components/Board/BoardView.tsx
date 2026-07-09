"use client";

import { useEffect, useMemo, useState } from "react";
import { BOARD_COLUMNS, EMPTY_COLUMN_MESSAGE, type BoardType } from "@/lib/boards";
import CardModal from "./CardModal";

type User = { id: string; username: string; displayName: string; avatarColor: string };

export type Card = {
  id: string;
  boardType: BoardType;
  column: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | null;
  dueDate: string | null;
  assignee: User | null;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

// The mockup's CSS uses abbreviated priority class suffixes (pri-med, not
// pri-medium) — Priority.toLowerCase() alone doesn't match "MEDIUM".
const PRIORITY_CLASS: Record<"LOW" | "MEDIUM" | "HIGH", string> = {
  LOW: "pri-low",
  MEDIUM: "pri-med",
  HIGH: "pri-high",
};

export default function BoardView({
  boardType,
  label,
  purpose,
  initialCards,
  initialUsers,
}: {
  boardType: BoardType;
  label: string;
  purpose: string;
  initialCards: Card[];
  initialUsers: User[];
}) {
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCards(initialCards);
    setUsers(initialUsers);
    setFilter("all");
    setSearch("");
    setSelectedCardId(null);
    setError(null);
  }, [boardType, initialCards, initialUsers]);

  const filtered = useMemo(
    () =>
      cards.filter((card) => {
        if (filter !== "all" && card.assignee?.id !== filter) return false;
        if (search && !card.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [cards, filter, search]
  );

  async function responseError(res: Response, fallback: string) {
    const data = await res.json().catch(() => null);
    return data?.error ?? fallback;
  }

  async function moveCard(cardId: string, column: string) {
    const previousCards = cards;
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, column } : c)));
    setMovingCardId(cardId);
    setError(null);

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column }),
      });
      if (!res.ok) throw new Error(await responseError(res, "Could not move card."));
      const updated = await res.json();
      setCards((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
    } catch (err) {
      setCards(previousCards);
      setError(err instanceof Error ? err.message : "Could not move card.");
    } finally {
      setMovingCardId(null);
    }
  }

  async function createCard() {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardType, title: `Untitled ${label.slice(0, -1)}` }),
      });
      if (!res.ok) throw new Error(await responseError(res, "Could not create card."));
      const card = await res.json();
      setCards((prev) => [...prev, card]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create card.");
    } finally {
      setCreating(false);
    }
  }

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null;

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Board</p>
          <h1>{label}</h1>
        </div>
        <button className="btn-primary" type="button" onClick={createCard} disabled={creating}>
          {creating ? "Adding..." : "+ New card"}
        </button>
      </header>
      <p className="page-purpose">{purpose}</p>
      {error && <p className="status-message is-error">{error}</p>}

      <div className="board-toolbar">
        <div className="filter-row">
          <button className={`filter-chip ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")} type="button">
            All
          </button>
          {users.map((u) => (
            <button
              key={u.id}
              className={`filter-chip ${filter === u.id ? "is-active" : ""}`}
              onClick={() => setFilter(u.id)}
              type="button"
            >
              <span className="avatar" style={{ "--c": u.avatarColor } as React.CSSProperties}>
                {initials(u.displayName)}
              </span>{" "}
              {u.displayName.split(" ")[0]}
            </button>
          ))}
        </div>
        <input
          className="search-input"
          type="text"
          placeholder="Search this board…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="board-scroll">
        <div className="board">
          {BOARD_COLUMNS[boardType].map((column) => {
            const rawColumnCards = cards.filter((c) => c.column === column);
            const columnCards = filtered.filter((c) => c.column === column);
            return (
              <div
                className="column"
                key={column}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const cardId = e.dataTransfer.getData("text/plain");
                  if (cardId) moveCard(cardId, column);
                }}
              >
                <div className="column-head">
                  <span className="column-title">{column}</span>
                  <span className="column-count">{columnCards.length}</span>
                </div>
                {rawColumnCards.length === 0 && (
                  <p className="column-empty">{EMPTY_COLUMN_MESSAGE[boardType][column]}</p>
                )}
                {rawColumnCards.length > 0 && columnCards.length === 0 && (
                  <p className="column-empty-hint is-visible">No matching cards.</p>
                )}
                {columnCards.map((card) => (
                  <div
                    key={card.id}
                    className={`card ${card.priority ? PRIORITY_CLASS[card.priority] : ""} ${
                      movingCardId === card.id ? "is-saving" : ""
                    }`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                    onClick={() => setSelectedCardId(card.id)}
                  >
                    <p className="card-title">{card.title}</p>
                    <div className="card-meta">
                      <span className="card-meta-left">
                        {card.priority === "HIGH" && <span className="card-priority">High</span>}
                        {card.dueDate && (
                          <span className="card-due">Due {new Date(card.dueDate).toLocaleDateString()}</span>
                        )}
                      </span>
                      {card.assignee && (
                        <span className="avatar" style={{ "--c": card.assignee.avatarColor } as React.CSSProperties}>
                          {initials(card.assignee.displayName)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          boardLabel={label}
          users={users}
          onClose={() => setSelectedCardId(null)}
          onUpdated={(updated) =>
            setCards((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
          }
          onDeleted={(cardId) => {
            setCards((prev) => prev.filter((c) => c.id !== cardId));
            setSelectedCardId(null);
          }}
        />
      )}
    </section>
  );
}
