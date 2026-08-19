---
title: 'Refocus npm README on usability'
type: 'chore'
created: '2026-08-19'
status: 'done'
route: 'one-shot'
---

# Refocus npm README on usability

## Intent

**Problem:** The npm README led with release marketing, version history, and an internal publishing workflow instead of helping users understand and use HEADBANG. It also promoted a workflow link that was not appropriate for the package README.

**Approach:** Remove release-specific announcements, historical scope notes, and maintainer-only publishing instructions while preserving practical CLI, configuration, and delivery guidance.

## Suggested Review Order

- Confirm the README opens with the product purpose and user-facing workflow.
  [`README.md:1`](../../README.md#L1)

- Confirm release documentation remains task-oriented without version-history framing.
  [`README.md:292`](../../README.md#L292)

- Confirm internal npm publishing details and version-scope marketing are absent.
  [`README.md:686`](../../README.md#L686)
