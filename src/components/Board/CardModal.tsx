"use client";

import { useState } from "react";
import CommentThread from "./CommentThread";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { Card } from "./BoardView";

type User = { id: string; username: string; displayName: string; avatarColor: string };

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 4.5h11M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5M6.5 7.5v4M9.5 7.5v4M3.5 4.5l.6 8.2a1 1 0 001 .9h5.8a1 1 0 001-.9l.6-8.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CardModal({
  card,
  boardLabel,
  users,
  onClose,
  onUpdated,
  onDeleted,
}: {
  card: Card;
  boardLabel: string;
  users: User[];
  onClose: () => void;
  onUpdated: (card: Card) => void;
  onDeleted: (cardId: string) => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function patch(fields: Record<string, unknown>) {
    const res = await fetch(`/api/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    onUpdated(await res.json());
  }

  async function remove() {
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
    onDeleted(card.id);
  }

  return (
    <div className="modal-backdrop is-open" onClick={onClose}>
      <div className="modal is-open" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <p className="modal-eyebrow">
            {boardLabel} · {card.column}
          </p>
          <div className="modal-head-actions">
            <button
              className="icon-btn is-danger"
              type="button"
              aria-label="Delete card"
              onClick={() => setConfirmingDelete(true)}
            >
              <TrashIcon />
            </button>
            <button className="modal-close" type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
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

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this card?"
          message={`"${card.title}" will be permanently deleted, including its comments.`}
          confirmLabel="Delete card"
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
