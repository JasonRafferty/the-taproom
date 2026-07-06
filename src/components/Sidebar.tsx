import Link from "next/link";
import { BOARD_LABELS, BOARD_SLUGS, type BoardType } from "@/lib/boards";

const BOARD_ORDER: BoardType[] = ["BUG", "FEATURE", "TASK"];

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export default function Sidebar({
  currentUser,
}: {
  currentUser: { displayName: string; avatarColor: string };
}) {
  return (
    <aside className="rail" aria-label="Primary navigation">
      <div className="rail-brand">
        <div>
          <p className="rail-name">The&nbsp;Taproom</p>
          <p className="rail-sub">Siply internal hub</p>
        </div>
      </div>
      <nav className="rail-nav">
        <div className="rail-group">
          <Link className="rail-link" href="/">Home</Link>
        </div>
        <div className="rail-group">
          <p className="rail-group-label">Boards</p>
          {BOARD_ORDER.map((boardType) => (
            <Link key={boardType} className="rail-link board-link" href={`/boards/${BOARD_SLUGS[boardType]}`}>
              {BOARD_LABELS[boardType]}
            </Link>
          ))}
        </div>
        <div className="rail-group">
          <Link className="rail-link" href="/resources">Resources</Link>
          <Link className="rail-link" href="/usage">Usage</Link>
        </div>
      </nav>
      <div className="rail-team">
        <p className="rail-label">Logged in as</p>
        <div className="avatars">
          <span className="avatar is-viewing" style={{ "--c": currentUser.avatarColor } as React.CSSProperties}>
            {initials(currentUser.displayName)}
          </span>
          <span className="rail-hint">{currentUser.displayName}</span>
        </div>
        <form action="/api/auth/logout" method="post" className="rail-logout">
          <button type="submit" className="rail-link">Log out</button>
        </form>
      </div>
    </aside>
  );
}
