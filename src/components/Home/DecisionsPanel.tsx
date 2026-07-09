"use client";

import { useState, type FormEvent } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export type User = { id: string; username: string; displayName: string; avatarColor: string };
type Status = "OPEN" | "DISCUSS" | "BLOCKING" | "RESOLVED";
export type Decision = {
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

export default function DecisionsPanel({
  initialDecisions,
  initialUsers,
}: {
  initialDecisions: Decision[];
  initialUsers: User[];
}) {
  const [decisions, setDecisions] = useState<Decision[]>(initialDecisions);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState<Status>("OPEN");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setOwnerId("");
    setStatus("OPEN");
    setNote("");
    setShowForm(false);
  }

  function startEdit(d: Decision) {
    setError(null);
    setEditingId(d.id);
    setTitle(d.title);
    setOwnerId(d.owner?.id ?? "");
    setStatus(d.status);
    setNote(d.note ?? "");
    setShowForm(true);
  }

  async function responseError(res: Response, fallback: string) {
    const data = await res.json().catch(() => null);
    return data?.error ?? fallback;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    const payload = { title, ownerId: ownerId || null, status, note: note || null };
    try {
      if (editingId) {
        const res = await fetch(`/api/decisions/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await responseError(res, "Could not save decision."));
        const updated = await res.json();
        setDecisions((prev) =>
          updated.status === "RESOLVED"
            ? prev.filter((d) => d.id !== updated.id)
            : prev.map((d) => (d.id === updated.id ? updated : d))
        );
      } else {
        const res = await fetch("/api/decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await responseError(res, "Could not save decision."));
        const created = await res.json();
        if (created.status !== "RESOLVED") setDecisions((prev) => [...prev, created]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save decision.");
    } finally {
      setSaving(false);
    }
  }

  async function resolve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/decisions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      if (!res.ok) throw new Error(await responseError(res, "Could not resolve decision."));
      setDecisions((prev) => prev.filter((d) => d.id !== id)); // resolved drops off the "needed" list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve decision.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/decisions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await responseError(res, "Could not delete decision."));
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      setDeletingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete decision.");
    } finally {
      setBusyId(null);
    }
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
          disabled={saving}
        >
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      {showForm && (
        <form className="decision-form is-open" onSubmit={save}>
          {error && <p className="status-message is-error">{error}</p>}
          <div className="decision-form-grid">
            <input
              className="decision-input"
              placeholder="Decision title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
            <select className="decision-select" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={saving}>
              <option value="">Owner…</option>
              {initialUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName}
                </option>
              ))}
            </select>
            <select className="decision-select" value={status} onChange={(e) => setStatus(e.target.value as Status)} disabled={saving}>
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
            disabled={saving}
          />
          <div className="decision-form-actions">
            <button className="btn-secondary" type="button" onClick={resetForm} disabled={saving}>
              Cancel
            </button>
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Save decision"}
            </button>
          </div>
        </form>
      )}

      <div className="decision-list">
        {!showForm && error && <p className="status-message is-error">{error}</p>}
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
                <button className="icon-btn" type="button" aria-label="Edit decision" onClick={() => startEdit(d)} disabled={busyId === d.id}>
                  ✎
                </button>
                <button className="icon-btn" type="button" aria-label="Resolve decision" onClick={() => resolve(d.id)} disabled={busyId === d.id}>
                  ✓
                </button>
                <button
                  className="icon-btn is-danger"
                  type="button"
                  aria-label="Delete decision"
                  onClick={() => setDeletingId(d.id)}
                  disabled={busyId === d.id}
                >
                  ×
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {deletingId && (
        <ConfirmDialog
          title="Delete this decision?"
          message="This will permanently remove it from the decisions list."
          confirmLabel="Delete decision"
          onConfirm={() => remove(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </section>
  );
}
