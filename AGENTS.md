# AGENTS.md — Operational Invariants for AI Coding Agents

This repository enforces strict operational guidelines for AI coding agents working on tasks and Pull Requests.

---

## 1. Pull Request Lifecycle & Branch Management
- **Never reuse or edit merged PRs**: Once a Pull Request has been merged into `main`, do not edit its description, add work to its branch, or attempt to keep working within that PR context.
- **Always branch anew from updated `main`**:
  1. Switch to `main` and pull the latest remote changes: `git checkout main && git pull origin main`.
  2. Create a clean, dedicated feature or fix branch: `git checkout -b feat/<task-name>` or `git checkout -b fix/<task-name>`.
  3. Implement changes, test thoroughly, and verify builds.
  4. Push the new branch: `git push -u origin <branch-name>`.
  5. Open a brand new, well-documented Pull Request using `gh pr create` with full description, testing breakdown, and verification proof.

---

## 2. Multi-Task Execution Discipline (To-Do List Invariant)
- **Always create a To-Do List upfront**: Whenever a user prompt contains multiple tasks or instructions, you must immediately generate a structured, atomic to-do checklist before writing code or making edits.
- **Sequential completion and ticking**:
  - Proceed through the checklist sequentially, completing one task before advancing to the next.
  - Update and tick off each completed task (`- [x]`) in status updates to the user.
  - Test and verify each item before marking it complete.
- **Never skip or combine unannounced**: All tasks in the user prompt must be explicitly tracked and accounted for.
