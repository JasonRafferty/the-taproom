# Home Page Improvements — Design

## 1. Purpose

The Home view in the mockup (`docs/mockups/2026-07-03-taproom-mockup.html`) currently
has five sections — Quick Capture, My Open Cards, Due Soon, Recently Completed, and
Quick Links — each a full bordered panel. Reviewing it turned up two problems:

- Two structural gaps versus the existing design spec (`2026-07-03-the-taproom-design.md`
  §6): "Recently Completed" is hard-coded HTML instead of derived from board data, and
  Home's list rows aren't clickable into the card detail drawer the way board cards are.
- A clutter problem: five equally-weighted panels is a lot for a 4-person team, and two
  of them (Recently Completed, Quick Links) are reference material, not action items —
  the spec's own framing is "capture-and-triage, not passive stats."

This doc defines the reworked Home layout that fixes both, while keeping Home's job
unchanged: capture what's on your mind, see what's yours, see what's due.

## 2. Final Home Structure

Four elements, two of which are new panels replacing three old ones:

1. **Header + recap line** — the existing greeting/date header gains a one-line,
   read-only callout beneath it surfacing the single most recent completed card (e.g.
   "🎉 GDPR export & erasure endpoints shipped 2d ago"). This replaces the old
   "Recently Completed" panel. If nothing has been completed yet, the line is omitted.
2. **Quick Capture** — unchanged panel and fields, plus two small behavior additions
   (below).
3. **"What's next" panel** — a single merged panel replacing "My Open Cards" and
   "Due Soon."
4. **Quick Links — removed from Home.** The same links remain available via the
   Resources rail item; Home no longer duplicates them.

## 3. "What's next" panel — behavior

- **Scope toggle**: two-way segmented control, `Mine` / `Everyone`, defaulting to
  `Mine` on load and whenever the "Viewing as" teammate changes.
- **Source data**: same underlying query as today's `renderMyCards`/`renderDueSoon` —
  every card across all three boards, excluding terminal columns (`Done` on Tasks,
  `Released` on Bugs/Features). No new data model, purely a different rendering of
  the same card set.
- **Sort order**: cards with a due date first (soonest first, using the existing
  `DUE_ORDER` mapping), then cards without a due date, in board order.
- **Row content**: board-type tag (Bug/Feature/Task), title, due date if present.
  When the toggle is on `Everyone`, each row also shows the assignee's avatar (omitted
  on `Mine`, since it's redundant there).
- **Due-date coloring**: rows due today get the same `is-today` warn-color treatment
  board cards already use; this doesn't exist on Home today and is being added for
  consistency.
- **Row interaction**: clicking a row opens the same card-detail drawer used by board
  cards, using the row's underlying card data (title, priority, assignee, due date,
  description, created-by/created). This closes the gap where Home rows are currently
  inert text.
- **Empty state**: if the current scope (Mine or Everyone) has zero qualifying cards,
  the panel collapses to a single friendly line ("Nothing open right now — nice." /
  "Nothing due soon.") rather than rendering an empty bordered box.
- **Header count**: panel header shows the current count, e.g. "What's next · 3".

## 4. Quick Capture — additions

- **Keyword-based type auto-guess**: as the user types in the title field, a small
  keyword match (e.g. "bug", "broken", "crash" → Bug; "idea", "would be nice" →
  Feature idea) pre-selects the type dropdown. The user can still override it manually
  before submitting — this is a convenience default, not a lock.
- **Keyboard shortcut**: pressing `/` anywhere on the Home view (when focus isn't
  already in a text input) focuses the Quick Capture title field.

## 5. Out of scope / non-goals for this change

- No backend or data-model changes — this is still a static mockup demonstrating
  behavior with the existing hard-coded card data.
- No changes to the Board, Resources, Environments, or Usage views.
- No activity feed, notifications, or history beyond the single most-recent-completed
  recap line (consistent with the existing design spec's non-goals).
- Recently Completed and Quick Links are not being deleted as *data* — Recently
  Completed is derivable from existing board data, and Quick Links content still lives
  in Resources. Only their standalone Home panels are removed.

## 6. Follow-up

Once approved, the written design spec (`2026-07-03-the-taproom-design.md` §6) should
be updated to match this new Home structure, since it's the source of truth for the
eventual real build — tracked as a follow-up edit alongside the mockup change.
