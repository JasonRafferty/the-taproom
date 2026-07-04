# Board Card Interactions — Design Spec

**Date:** 2026-07-04
**Status:** Draft for review
**Visual reference:** `docs/mockups/2026-07-03-taproom-mockup.html` — this feature is
implemented directly in that mockup. Open it in a browser to see the current state.
**Parent spec:** `docs/superpowers/specs/2026-07-03-the-taproom-design.md` — this doc
covers the detail behind that spec's §2, §7, and §8 as revised on this date.

## 1. Purpose

The mockup's board is currently look-but-don't-touch: cards can be filtered and viewed in
a read-only drawer, but you can't actually move a card between columns or edit it without
leaving the page. This spec adds the three interactions needed to make the board feel like
a real, minimal Jira-lite: **drag-and-drop between columns**, a **card detail modal** with
inline editing (replacing the old slide-over drawer), and **comments** on cards.

This reverses two v1 non-goals from the parent spec: "no comments/activity feed on cards"
and the slide-over-drawer card detail pattern. Both are now in scope, decided directly with
the founder driving this project.

## 2. Scope note: mockup vs. real app

This mockup has no backend — filters, board search, and the "viewing as" switcher are all
in-browser JS state with no persistence layer. This feature follows the same pattern:
**everything below is in-memory only.** A page refresh resets drag-and-drop moves, edits,
and comments back to the seeded starting data. This is a demo of the interaction, not a
data-storage mechanism — the real app's persistence design (Postgres via Prisma) is
unaffected and out of scope here.

## 3. Drag-and-drop

- Native HTML5 drag-and-drop API (`draggable="true"` on `.card`) — no external library.
- Cards can be dragged **between columns only**, within the currently-open board. Order
  within a column is not manually reorderable in v1 (matches parent spec §7).
- Dropping a card appends it to the end of the target column.
- While dragging over a column, that column gets a visual highlight (border shifts to the
  accent lime color) so the drop target is unambiguous.
- On drop:
  - The card's `data-column` attribute updates to the new column's name.
  - The existing `applyBoardFilters()` function re-runs, which already recalculates each
    column's visible card count badge and empty/no-match hint state — no new counting
    logic needed.
  - If the target column was showing the static `.column-empty` placeholder (a column
    with zero cards, e.g. "Nothing released yet"), that placeholder is removed, since the
    column now has a real card.
- Dragging is unaffected by the current assignee/search filter — you can drag a card that's
  currently filtered out of view is a non-issue, since filtered-out cards are `display:none`
  and therefore not draggable targets anyway.

## 4. Card detail modal (replaces the drawer)

The existing slide-over `.drawer`/`.drawer-backdrop` markup, CSS, and JS
(`openDrawer`/`closeDrawer`) are deleted entirely and replaced with a centered modal
dialog + backdrop. Trigger is unchanged: clicking a `.card` or a Home "What's Next"
`.list-item[data-title]` row opens it.

**Layout (top to bottom):**
1. Board · Column eyebrow (plain text, not editable — moving column is drag-and-drop's job)
   + close button.
2. **Title** — editable text field, saves on blur (updates `data-title` and the card's
   visible `.card-title` text).
3. **Priority** — dropdown (High / Medium / Low), saves immediately on change (updates
   `data-priority`, the card's `pri-high`/`pri-med`/`pri-low` class for its left-edge
   stripe, and adds/removes the on-face `.card-priority` badge per parent spec §7's "High
   only" face-badge rule).
4. **Assignee** — dropdown of the four founders (reusing existing avatar colors/initials
   from `AVATAR_COLORS`/`AVATAR_NAMES`), saves immediately (updates `data-assignee`,
   `data-assignee-name`, and the card face's avatar chip).
5. **Due date** — dropdown of the existing relative-day set (No due date / Today / Mon /
   Tue / Wed / Thu / Fri), saves immediately (updates `data-due` and the card face's
   `.card-due` badge, including the `is-today` styling).
6. **Description** — editable textarea, saves on blur (updates `data-desc`).
7. **Added by / created** footer — unchanged, plain text.
8. **Comments** — see §5.

No Save/Cancel buttons anywhere in the modal — every field commits its own change
immediately (dropdowns) or on blur (text fields), matching the parent spec's "no separate
edit mode" principle.

## 5. Comments

- Displayed below the footer as a simple vertical thread: avatar, author name, relative
  timestamp ("just now" for anything posted this session), comment text, and a delete (×)
  control on every comment.
- **Any founder can delete any comment** — no ownership check, consistent with the app
  having no roles/permissions (parent spec §2). Deletion is immediate, no confirmation
  dialog (matches the mockup's lightweight feel — nothing else in it confirms destructive
  actions either).
- Below the thread: a small textarea + "Post" button (multi-line, since a comment may be
  more than one sentence). Posting adds a comment authored as
  whichever founder is currently selected in the existing "viewing as" avatar switcher
  (`currentUser`) — reusing that mechanism rather than inventing a separate "who's
  commenting" concept.
- **Data model:** a `WeakMap<cardElement, Comment[]>` keyed directly on the card's DOM
  node — no new `data-id` scheme needed, since card elements persist for the life of the
  page. Each `Comment` is `{ author, authorName, text, timestamp }`.
- **Seed data:** two cards start with 1–2 comments already on them so the thread is visible
  without typing anything first — suggested: one Bug card and one Feature card (the two
  collaborative/multi-person boards), e.g. the "GDPR export omits liked/commented posts"
  bug and the "Taste Profile Builder" feature, both of which already have multi-person
  context in their existing descriptions.

## 6. Out of scope (unchanged from parent spec)

- No edit history / activity log beyond the comment thread itself.
- No @mentions or notifications when a comment is posted.
- No comment editing — post and delete only, no editing an existing comment's text.
- No manual reordering of cards within a column (§3).
- No cross-board drag (not reachable anyway — only one board is visible at a time).
