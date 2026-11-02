# Task: T01 Accept Profile v8

## Status: done

## Goal
Let the profile API accept and persist the current v8 profile payload without rejecting legacy v7 clients.

## Decision Summary
- Accept schema versions 7 and 8. Preserve v7 payloads in v7 form. For v8, validate and preserve the goal celebration preference.
- The current frontend is v8, while the API validator hard-codes v7; this mismatch produces HTTP 400.

## Implementation

### I01. Validate versioned profile payloads

- Related Files:
  - `game/api/src/profileValidation.js` :: `readProfilePayload`, `badRequest`, version and ceremony validation — modify.
  - `game/api/src/profileValidation.test.js` :: API payload schema tests — modify.

#### Details
- **Signatures & Types**:
  ```js
  export async function readProfilePayload(request) -> Promise<ProfileV7 | ProfileV8>
  ```
- **Data & Schema Fields**:
  - `ProfileV7`: `{ schemaVersion: 7, nickname: string, campaignSave: object|null, bestRecord: object|null, teamCustomization: object }`.
  - `ProfileV8`: the same fields with `schemaVersion: 8` and `goalCelebration: { mode: 'random', ceremonyId: null } | { mode: 'specific', ceremonyId: string }`.
  - Supported ceremony IDs: `siuuu`, `moonwalk`, `takeTheL`, `slickback`, `rko`.
- **Execution Flow / Logic**:
  1. Keep existing body-size, JSON, nickname, campaign, best-record, and team-customization checks.
  2. Accept only schema versions 7 and 8.
  3. For v7, return exactly the existing sanitized v7 field set and do not add a ceremony field.
  4. For v8, require a plain `goalCelebration` object. Accept `mode === 'random'` only with `ceremonyId === null`, or `mode === 'specific'` only with one of the five supported ceremony IDs. Reject all other combinations with `ProfileValidationError(400, 'INVALID_PROFILE', ...)`.
  5. Return the sanitized v8 object including `goalCelebration` so Cosmos DB persists the user's preference.
  6. Add tests for v7 preservation, v8 random, v8 specific for a supported ID, and rejection of missing/invalid ceremony fields and unsupported schema versions.

### I02. Validate locally

- **Validation**:
  - From `game/api/`: `npm test -- src/profileValidation.test.js`
  - From `game/`: `npm run build`
- **Commit**:
  ```text
  fix(api): accept goal celebration profile v8

  Plan: 2026-11-02-profile-v8-api-compatibility
  Phase: P01-api-schema-fix
  Task: T01-accept-profile-v8
  ```
