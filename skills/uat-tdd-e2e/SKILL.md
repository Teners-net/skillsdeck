---
name: uat-tdd-e2e
description: >-
  A disciplined workflow for implementing a feature correctly in one pass: write
  a short UAT (user story, acceptance criteria, negative and edge cases,
  Definition of Done), drive the build with TDD (failing tests first, then
  implement to green, never weakening or faking tests), validate end-to-end (test
  API endpoints directly, or run a Playwright browser walkthrough with
  screenshots for UI), add regression tests for anything E2E catches, then run
  the full checks (tests, lint, type-check, build) and report results. Use this
  whenever asked to implement, build, or add a feature, endpoint, page, or
  user-facing flow — especially when correctness, test coverage, or getting it
  right the first time matters. Triggers on any feature-implementation request.
---

# Feature implementation: UAT-first, TDD, E2E validation

Use this workflow to implement a feature correctly in a single pass. Work the phases in order. Do not skip the failing-test step (phase 2) or the end-to-end validation (phase 3) — they are what catch the bugs that "looks done" misses.

## 0. Ground yourself in the codebase

Before writing anything, review the existing code and follow its current patterns — directory layout, framework conventions, the existing test style, and the tooling already in use.

## 1. Write a short UAT first

Produce a brief UAT for the feature before any code, covering:

- User story
- Preconditions
- Acceptance criteria
- Negative cases
- Edge cases
- Definition of Done

## 2. Drive the implementation with TDD

- Write tests from the UAT acceptance criteria **first**, before the implementation.
- Install and configure any required testing tools if they're missing.
- Run the tests and confirm they fail **for the expected reason** — don't skip this red step; a test that passes before the feature exists is testing nothing.
- Implement the feature.
- Re-run the tests until they pass.
- **Never remove, weaken, or fake a test to force a pass.** If a test is wrong, fix the test deliberately and say so; don't quietly gut it.

## 3. Validate end-to-end

**Backend / API features** — exercise the endpoints directly and verify each of:

- request payload
- validation
- auth / authorization
- status codes
- response shape
- database persistence

**Frontend features** — run a browser E2E walkthrough with Playwright (or the project's existing E2E tool):

- open the app
- perform the user flow
- verify both success and error states
- capture screenshots of the passing criteria, and note where they're saved

## 4. Close the loop on anything E2E caught

If E2E surfaces something the unit tests missed: add a regression test for it, fix the issue, then rerun the full suite. The regression test is mandatory — the point is that the same bug can't return silently.

## 5. Run all checks before declaring done

Run every relevant check and confirm it's green:

- tests
- lint
- type-check
- build

Do not report the task complete while any relevant test fails or is skipped.

## Final report

End the work with a summary containing:

- UAT summary
- Tests written
- Commands run
- Endpoint / E2E results
- Screenshot paths
- Bugs found and fixed
- Final pass/fail status
- Confidence level
