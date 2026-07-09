import Link from "next/link";
import { BOARD_LABELS, BOARD_SLUGS, type BoardType } from "@/lib/boards";

const BOARD_ORDER: BoardType[] = ["BUG", "FEATURE", "TASK"];

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 7.5L8 2l6 5.5M3.5 6.5V14h9V6.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ResourcesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 3.2C3 2.9 3.3 2.7 3.6 2.8c1.5.4 3 1.1 4.4 2 1.4-.9 2.9-1.6 4.4-2 .3-.1.6.1.6.4v9c0 .2-.2.4-.4.5-1.5.4-2.9 1-4.2 1.9a.6.6 0 01-.8 0c-1.3-.9-2.7-1.5-4.2-1.9-.2-.1-.4-.3-.4-.5v-9z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 4.8V13.6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function UsageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 13.5V3M2.5 13.5H13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="5" y="8.5" width="2" height="4" fill="currentColor" />
      <rect x="8.2" y="6" width="2" height="6.5" fill="currentColor" />
      <rect x="11.4" y="4" width="2" height="8.5" fill="currentColor" />
    </svg>
  );
}

const BOARD_ICON: Record<BoardType, React.ReactNode> = {
  BUG: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="9" r="4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 5V3M5 5.5L3.5 4M11 5.5L12.5 4M4 9H2M14 9h-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  FEATURE: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2l1.6 3.6L13 7l-3.4 1.4L8 12l-1.6-3.6L3 7l3.4-1.4L8 2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  ),
  TASK: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M5.5 8.2l1.7 1.7 3.3-3.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function Sidebar({
  currentUser,
}: {
  currentUser: { displayName: string; avatarColor: string };
}) {
  return (
    <aside className="rail" aria-label="Primary navigation">
      <div className="rail-brand">
        <img className="rail-mark" src="/assets/siply-logo-rating.png" alt="" aria-hidden="true" />
        <div>
          <p className="rail-name">The&nbsp;Taproom</p>
          <p className="rail-sub">Siply internal hub</p>
        </div>
      </div>
      <nav className="rail-nav">
        <div className="rail-group">
          <Link className="rail-link" href="/">
            <HomeIcon />
            Home
          </Link>
        </div>
        <div className="rail-group">
          <p className="rail-group-label">Boards</p>
          {BOARD_ORDER.map((boardType) => (
            <Link key={boardType} className="rail-link board-link" href={`/boards/${BOARD_SLUGS[boardType]}`}>
              {BOARD_ICON[boardType]}
              {BOARD_LABELS[boardType]}
            </Link>
          ))}
        </div>
        <div className="rail-group">
          <Link className="rail-link" href="/resources">
            <ResourcesIcon />
            Resources
          </Link>
          <Link className="rail-link" href="/usage">
            <UsageIcon />
            Usage
          </Link>
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
