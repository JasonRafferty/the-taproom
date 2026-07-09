"use client";

import { useEffect, useState, type FormEvent } from "react";

type User = { id: string; username: string; displayName: string; avatarColor: string };
type Status = "OPEN" | "DISCUSS" | "BLOCKING" | "RESOLVED";
type Decision = {
  id: string;
  title: string;
  note: string | null;
  status: Status;
  owner: User | null;
};

const STATUS_PILL: Record<Status, string> = {
  OPEN: "pending",
  DISCUSS: "warn",
  BLOCKING: "bad",
  RESOLVED: "good",
};
const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Open",
  DISCUSS: "Discuss",
  BLOCKING: "Blocking",
  RESOLVED: "Resolved",
};

export default function DecisionsPanel() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState<Status>("OPEN");
  const [note, setNote] = useState("");

  async function load() {
    const res = await fetch("/api/decisions");
    setDecisions(await res.json());
  }

  useEffect(() => {
    load();
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setOwnerId("");
    setStatus("OPEN");
    setNote("");
    setShowForm(false);
  }

  function startEdit(d: Decision) {
    setEditingId(d.id);
    setTitle(d.title);
    setOwnerId(d.owner?.id ?? "");
    setStatus(d.status);
    setNote(d.note ?? "");
    setShowForm(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const payload = { title, ownerId: ownerId || null, status, note: note || null };
    if (editingId) {
      const res = await fetch(`/api/decisions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updated = await res.json();
      setDecisions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } else {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setDecisions((prev) => [...prev, created]);
    }
    resetForm();
  }

  async function resolve(id: string) {
    await fetch(`/api/decisions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    setDecisions((prev) => prev.filter((d) => d.id !== id)); // resolved drops off the "needed" list
  }

  async function remove(id: string) {
    await fetch(`/api/decisions/${id}`, { method: "DELETE" });
    setDecisions((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <section className="panel decision-panel">
      <div className="panel-head-row">
        <h2>
          Decisions needed <span className="panel-count">· {decisions.length}</span>
        </h2>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {showForm && (
        <form className="decision-form" onSubmit={save}>
          <div className="decision-form-grid">
            <input
              className="decision-input"
              placeholder="Decision title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select className="decision-select" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
              <option value="">Owner…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
            <select className="decision-select" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <option value="OPEN">Open</option>
              <option value="DISCUSS">Discuss</option>
              <option value="BLOCKING">Blocking</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <textarea
            className="decision-textarea"
            placeholder="What needs deciding?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="decision-form-actions">
            <button className="btn-secondary" type="button" onClick={resetForm}>
              Cancel
            </button>
            <button className="btn-primary" type="submit">
              {editingId ? "Save changes" : "Save decision"}
            </button>
          </div>
        </form>
      )}

      <div className="decision-list">
        {decisions.length === 0 && <p className="column-empty">No decisions to make right now.</p>}
        {decisions.map((d) => (
          <article className="decision-item" key={d.id}>
            <div>
              <p className="decision-title">{d.title}</p>
              <p className="decision-meta">
                {d.owner ? `Owner: ${d.owner.displayName.split(" ")[0]}` : "Unassigned"}
                {d.note ? ` · ${d.note}` : ""}
              </p>
            </div>
            <div className="decision-side">
              <span className={`pill ${STATUS_PILL[d.status]} decision-status`}>{STATUS_LABEL[d.status]}</span>
              <div className="decision-actions">
                <button className="icon-btn" type="button" aria-label="Edit decision" onClick={() => startEdit(d)}>
                  ✎
                </button>
                <button className="icon-btn" type="button" aria-label="Resolve decision" onClick={() => resolve(d.id)}>
                  ✓
                </button>
                <button
                  className="icon-btn is-danger"
                  type="button"
                  aria-label="Delete decision"
                  onClick={() => remove(d.id)}
                >
                  ×
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
