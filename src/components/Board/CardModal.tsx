"use client";

import { useState } from "react";
import CommentThread from "./CommentThread";
import type { Card } from "./BoardView";

type User = { id: string; username: string; displayName: string; avatarColor: string };

export default function CardModal({
  card,
  boardLabel,
  users,
  onClose,
  onUpdated,
}: {
  card: Card;
  boardLabel: string;
  users: User[];
  onClose: () => void;
  onUpdated: (card: Card) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");

  async function patch(fields: Record<string, unknown>) {
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    onUpdated(await res.json());
  }

  return (
    <div className="modal-backdrop is-open" onClick={onClose}>
      <div className="modal is-open" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <p className="modal-eyebrow">
            {boardLabel} · {card.column}
          </p>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <input
          className="modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== card.title && patch({ title })}
        />

        <div className="modal-row">
          <span className="modal-label">Priority</span>
          <select
            className="modal-select"
            value={card.priority ?? ""}
            onChange={(e) => patch({ priority: e.target.value || null })}
          >
            <option value="">None</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="modal-row">
          <span className="modal-label">Assignee</span>
          <select
            className="modal-select"
            value={card.assignee?.id ?? ""}
            onChange={(e) => patch({ assigneeId: e.target.value || null })}
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="modal-row">
          <span className="modal-label">Due date</span>
          <input
            className="modal-select"
            type="date"
            value={card.dueDate ? card.dueDate.slice(0, 10) : ""}
            onChange={(e) => patch({ dueDate: e.target.value || null })}
          />
        </div>

        <textarea
          className="modal-desc-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => description !== (card.description ?? "") && patch({ description })}
          placeholder="Description"
        />

        <p className="modal-foot">
          Added by {card.createdBy.displayName} · {new Date(card.createdAt).toLocaleDateString()}
        </p>

        <div className="modal-comments">
          <p className="modal-comments-title">Comments</p>
          <CommentThread cardId={card.id} />
        </div>
      </div>
    </div>
  );
}
