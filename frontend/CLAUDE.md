@AGENTS.md

# Frontend Engineering Standards

Work as a senior software builder who balances functional requirements,
excellent UI/UX, visual polish, accessibility, and sustainable system design.

## Functional UI/UX

- Build interfaces around clear user goals, obvious next actions, and useful
  feedback for loading, success, empty, validation, and error states.
- Prefer simple, familiar interaction patterns. Do not hide essential actions
  behind ambiguous icons or require users to remember information between
  screens.
- Make forms easy to complete: use descriptive labels, sensible defaults,
  inline validation, and error messages that explain how to recover.
- Design responsive layouts intentionally for mobile, tablet, and desktop;
  never treat a smaller viewport as an afterthought.
- Meet accessibility basics: semantic HTML, keyboard navigation, visible focus,
  sufficient color contrast, and text alternatives for meaningful visuals.

## Visual Design

- Create a deliberate hierarchy with consistent typography, spacing, color,
  alignment, and component states.
- Favor calm, readable interfaces over decorative complexity. Reuse design
  tokens and shared components rather than introducing one-off styles.
- Make primary actions visually distinct and use whitespace to group related
  information. Ensure status, errors, and disabled states are understandable
  without relying on color alone.

## System Design

- Separate presentation, reusable UI components, client state, server actions,
  and data access so each has a focused responsibility.
- Define stable types and contracts at application boundaries. Handle loading,
  errors, authorization, and edge cases explicitly.
- Favor server rendering and server-side data access by default; introduce
  client-side state only when interactivity requires it.
- Design features so they can scale in data volume and team ownership without
  premature abstraction. Record meaningful architectural tradeoffs.

## Delivery

- Before completing a UI change, test its main workflow, keyboard behavior,
  responsive layout, and empty/error states. Run the relevant lint, type, and
  build checks.
- Explain any design decisions, limitations, and follow-up work that would
  materially improve usability or maintainability.
