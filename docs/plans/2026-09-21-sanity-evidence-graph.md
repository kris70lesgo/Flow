# Sanity Evidence Graph Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Sanity the optional durable evidence graph for every supplier investigation without breaking AegisFlow's zero-configuration demo.

**Architecture:** The current incident repository remains responsible for workflow transitions and human-authorization guards. A server-only Sanity adapter serializes each completed investigation into linked `evidenceIncident`, `evidenceSupplier`, `evidenceClaim`, `evidenceDocument`, `evidenceSource`, and `evidenceDecision` documents. The investigation reads normally from its local/Xano mirror, then writes the evidence graph to Sanity when credentials are present; the Evidence screen queries Sanity first and transparently falls back to the incident mirror when it is not.

**Tech Stack:** Next.js 16 App Router, TypeScript, Zod, Vitest, `@sanity/client`, Sanity Studio 6.

---

### Task 1: Define the graph contract

**Files:**
- Modify: `schemas/core.ts`
- Create: `lib/sanity/evidence-graph.ts`
- Test: `tests/sanity-evidence-graph.test.ts`

**Step 1:** Write graph-transform tests using the seeded incident and assert supplier, claim, document, source and decision references are stable and scoped to an incident.

**Step 2:** Run the test and verify it fails because the adapter does not exist.

**Step 3:** Add the server-only configuration guard, deterministic document IDs, graph transform, GROQ query and a write function that records honest `LIVE`/`LOCAL` ledger entries.

**Step 4:** Run the focused test and verify it passes.

### Task 2: Persist investigation evidence

**Files:**
- Modify: `lib/orchestration/investigation.ts`
- Modify: `schemas/core.ts`
- Modify: `lib/integrations/ledger.ts`

**Step 1:** Add Sanity as a first-class ledger sponsor and sync the completed evidence graph before the incident's final persistence.

**Step 2:** Ensure missing configuration records `LOCAL` rather than pretending a Sanity write occurred.

**Step 3:** Run workflow and fallback tests.

### Task 3: Make the graph visible and editable

**Files:**
- Create: `components/evidence/evidence-graph.tsx`
- Modify: `app/(workspace)/evidence/page.tsx`
- Create: `sanity/sanity.config.ts`
- Create: `sanity/sanity.cli.ts`
- Create: `sanity/schemaTypes/index.ts`
- Create: `sanity/schemaTypes/evidence.ts`
- Create: `sanity/package.json`

**Step 1:** Add a compact graph panel that shows supplier-to-claim-to-source/document links and clearly labels `SANITY` versus `LOCAL MIRROR`.

**Step 2:** Add a clean Sanity Studio configured for project/dataset environment values and schemas matching the graph contract.

**Step 3:** Run TypeScript, unit tests and production build.

### Task 4: Document and configure

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Create: `scripts/seed-sanity.mjs`

**Step 1:** Document the three required Sanity variables, public-dataset/CORS requirements and a safe seed command.

**Step 2:** Add a seed script that fails clearly without a write token and never reads a token into the browser bundle.

**Step 3:** Verify no secret appears in tracked files and run the full suite.
