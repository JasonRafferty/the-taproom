"use client";

import { useEffect, useState } from "react";

type Comment = {
  id: string;
  text: string;
  createdAt: string;
  author: { id: string; displayName: string; avatarColor: string };
};

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function CommentThread({ cardId }: { cardId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/cards/${cardId}/comments`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await responseError(r, "Could not load comments."));
        return r.json();
      })
      .then((loaded) => {
        if (cancelled) return;
        setComments(loaded);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load comments.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  async function responseError(res: Response, fallback: string) {
    const data = await res.json().catch(() => null);
    return data?.error ?? fallback;
  }

  async function post() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(await responseError(res, "Could not post comment."));
      const created = await res.json();
      setComments((prev) => [...prev, created]);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    setError(null);
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await responseError(res, "Could not delete comment."));
    } catch (err) {
      setComments(previous);
      setError(err instanceof Error ? err.message : "Could not delete comment.");
    }
  }

  if (loading) return <p className="comment-empty">Loading comments…</p>;

  return (
    <>
      <div className="comment-list">
        {error && <p className="status-message is-error">{error}</p>}
        {comments.length === 0 && <p className="comment-empty">No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id}>
            <div className="comment-head">
              <span className="avatar" style={{ "--c": c.author.avatarColor } as React.CSSProperties}>
                {initials(c.author.displayName)}
              </span>
              <span className="comment-author">{c.author.displayName}</span>
              <span className="comment-time">{new Date(c.createdAt).toLocaleString()}</span>
              <button className="comment-delete" type="button" onClick={() => remove(c.id)}>
                Delete
              </button>
            </div>
            <p className="comment-text">{c.text}</p>
          </div>
        ))}
      </div>
      <div className="comment-form">
        <textarea
          className="comment-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          disabled={saving}
        />
        <button className="btn-primary comment-post" type="button" onClick={post} disabled={saving}>
          {saving ? "Posting..." : "Post"}
        </button>
      </div>
    </>
  );
}
