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

  useEffect(() => {
    fetch(`/api/cards/${cardId}`)
      .then((r) => r.json())
      .then((card) => {
        setComments(card.comments);
        setLoading(false);
      });
  }, [cardId]);

  async function post() {
    if (!text.trim()) return;
    const res = await fetch(`/api/cards/${cardId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const created = await res.json();
    setComments((prev) => [...prev, created]);
    setText("");
  }

  async function remove(id: string) {
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p className="comment-empty">Loading comments…</p>;

  return (
    <>
      <div className="comment-list">
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
        />
        <button className="btn-primary comment-post" type="button" onClick={post}>
          Post
        </button>
      </div>
    </>
  );
}
