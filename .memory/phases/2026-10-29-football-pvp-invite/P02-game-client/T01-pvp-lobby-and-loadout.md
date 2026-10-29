# Task: T01 PvP Lobby and Loadout

## Status: done

## Goal
Let a signed-in user create an invite-code room or join one, see the room status, choose and order three PvP skills, ready up, and let the creator start once both users are ready.

## Decision Summary
- Reuse the existing `StartScreen`, Entra account, skill catalog, and visual style. Do not reuse campaign-owned skills; the PvP picker exposes all `SKILL_IDS` and always labels them Lv. 1.
- Use the T01 HTTP contracts: room endpoints under `/api/pvp/rooms`, display names from `account.name || account.username`, and access token in `X-Profile-Access-Token` as the profile repository does.
- The creator is home; the joiner is away. Poll the room endpoint every 2 seconds while a room is waiting/ready; clear the timer on unmount.

## Implementation

### I01. Authenticated PvP API client and skill selection component

- Related Files:
  - `game/src/pvp/pvpApi.js` :: `PvpApiError`, `createPvpApi` — authenticated room HTTP calls; new
  - `game/src/components/PvpSkillPicker.jsx` :: `PvpSkillPicker` — ordered, exactly-three skill selection; new
  - `game/src/components/PvpSkillPicker.test.jsx` :: selection constraints and ordering; new
  - `game/package.json` :: no dependency changes in this task; read-only
- **Signatures & Types**:
  ```js
  export class PvpApiError extends Error {
    constructor(status, code, message);
  }
  export function createPvpApi({ acquireToken = getProfileApiToken, fetchImpl = fetch } = {});
  // methods: createRoom(displayName), getRoom(code), joinRoom(code, displayName),
  // saveLoadout(code, skillIds), setReady(code, ready), startRoom(code), cancelRoom(code)

  export function PvpSkillPicker({ selectedSkillIds, onChange, disabled = false });
  ```
- **Data & Schema Fields**:
  - Frontend `PvpRoom` projection: `{code:string,status:string,hostDisplayName:string,guestDisplayName:string|null,hostSkillIds:string[]|null,guestSkillIds:string[]|null,hostReady:boolean,guestReady:boolean,isHost:boolean}`.
  - `PvpSkillPicker` accepts only a list of `SKILL_IDS` with maximum length three; `onChange` emits a unique ordered `string[]`. It must not include levels in API payloads.
- **Execution Flow / Logic**:
  1. Precondition & Validation: each API request gets a fresh access token using `getProfileApiToken`; sends `X-Profile-Access-Token: Bearer <token>`; adds JSON content type only when it has a body; uses `cache:'no-store'`.
  2. Core Processing: parse API `{room}` responses; normalize room codes to uppercase; picker prevents adding a duplicate and prevents selection beyond three; show every skill from `SKILL_IDS` and `SKILLS` in catalog order, with explicit `Lv.1` label; allow moving a selected skill earlier/later because order is the in-match usage order.
  3. Error & Exception Handling: convert non-OK JSON `{code,message}` to `PvpApiError`; provide a safe Korean fallback message when response JSON is absent; do not silently convert 401 into anonymous play.
  4. State Transition & Return: API methods return `PvpRoom` or the endpoint's result; picker only emits ordered IDs and does not persist campaign loadout changes.

### I02. Room lobby UI and navigation
- Related Files:
  - `game/src/components/PvpLobbyScreen.jsx` :: `PvpLobbyScreen` — create, join, waiting room, ready/start/cancel UI; new
  - `game/src/components/StartScreen.jsx` :: PvP action button and callback prop; modify
  - `game/src/App.jsx` :: PvP lobby screen state, room state, callbacks; modify
  - `game/src/styles.css` :: PvP lobby, code field, member status, picker, responsive layout; modify
  - `game/src/App.test.jsx` :: lobby navigation and state-flow tests; new
- **Signatures & Types**:
  ```js
  PvpLobbyScreen({ room, loading, errorMessage, onCreateRoom, onJoinRoom,
    onSaveLoadout, onSetReady, onStart, onCancel, onBack })
  ```
- **Execution Flow / Logic**:
  1. Start screen offers a separate `회사 사용자와 대전` entry beside campaign actions.
  2. With no room, show create-room action and a six-character code input plus join action. Validate length locally, then let API validation return authoritative errors.
  3. A host-created room displays the invite code with a copy button, host and guest account names, and waiting status. A joiner can enter only once. While status is `waiting` or `ready`, poll `getRoom` every 2000 ms and stop polling on unmount, match start, or cancellation.
  4. Each participant selects exactly three skills, calls `saveLoadout`, then explicitly marks Ready. Lock the picker after Ready; changing a loadout first requires toggling Ready off.
  5. Show the creator's Start button only when both readiness flags and both loadouts are present. Start calls `startRoom`; host can cancel pre-match. Do not let joiner start or cancel the room.
  6. Account display name passed to room APIs is `account.name || account.username`; identity authorization remains the server's verified Entra object ID.
  7. Handle API errors inline, keep the invite code on the page after transient polling failures, and allow returning to the start screen without altering campaign state.
- **Acceptance Criteria**:
  - [ ] A user can create a room and copy a six-character code; another signed-in user can join by code.
  - [ ] The lobby shows both players' names, each ordered loadout, and Ready state without showing object IDs.
  - [ ] Users can choose exactly three distinct catalog skills in a chosen order; every PvP skill is shown as Lv. 1.
  - [ ] Start is disabled until both players have valid loadouts and Ready; only the creator sees an enabled Start action.
  - [ ] Poll timers and API calls do not mutate campaign save, rewards, or loadout.

## Validation
- `npm --prefix game test` — picker, lobby navigation, and existing client tests pass.
- `npm --prefix game run build` — the new lobby modules compile into the Vite app.

## Commit Message
```text
feat(pvp): add invite room lobby and skill picker

Plan: 2026-10-29-football-pvp-invite
Phase: P02-game-client
Task: T01-pvp-lobby-and-loadout

- Add room creation, code joining, readiness, and host start controls
- Add ordered three-skill PvP selection using the full catalog at Lv. 1
```

## Progress
- [x] Implementation complete
- [x] PvP-focused tests and Vite build passed
- Note: Full game suite has three failures in the untouched `game/src/game/stepGame.test.js` simulation tests.
- commit: specified in git history
