# Task: T01 Register PvP HTTP Routes

## Status: in_progress

## Goal
Restore the existing company PvP room-management and leaderboard HTTP routes in the Azure Static Web Apps managed API after the profile and daily challenge routes are available, without registering unsupported Web PubSub bindings.

## Decision Summary
- Import the plain HTTP route module `functions/pvp.js` into the Functions entry point; do not import `functions/pvpRealtime.js`.
- Keep Web PubSub upstream events and `/api/pvp/negotiate` disabled because the managed API cannot host the required `WebPubSubContext` binding; a standalone Functions backend is required for real-time PvP.

## Implementation

### I01. Register supported room-management HTTP handlers

- Related Files:
  - `game/api/src/index.js` :: Functions app imports; modify
  - `game/api/src/functions/pvp.js` :: HTTP route registration; read-only
  - `game/api/src/functions/pvp.test.js` :: authenticated route handler behavior; read-only or modify only if route-level coverage is added
  - `game/api/package.json` :: syntax check script; read-only unless route module is missing from checks
  - `game/PVP_AZURE_SETUP.md` :: managed API availability and limitation notes; modify

#### Details
- **Signatures & Types**:
  ```javascript
  // game/api/src/index.js imports, in addition to the existing profile and daily challenge imports:
  import './functions/pvp.js';
  // Do not add:
  // import './functions/pvpRealtime.js';
  ```
- **Registered HTTP routes**:
  - `POST /api/pvp/rooms`
  - `GET /api/pvp/rooms/{code}`
  - `POST /api/pvp/rooms/{code}/join`
  - `PUT /api/pvp/rooms/{code}/loadout`
  - `POST /api/pvp/rooms/{code}/ready`
  - `POST /api/pvp/rooms/{code}/start`
  - `DELETE /api/pvp/rooms/{code}`
  - `GET /api/pvp/rooms/{code}/result`
  - `POST /api/pvp/rooms/{code}/result`
  - `GET /api/pvp/leaderboard`
- **Execution Flow / Logic**:
  1. Keep existing profile and daily challenge imports in `src/index.js`; add the room-management module import only.
  2. Do not edit `pvpRealtime.js`, do not register a WebPubSubContext trigger, and do not register `/api/pvp/negotiate` in this task.
  3. Update the managed API paragraph in `game/PVP_AZURE_SETUP.md`: room-management and leaderboard HTTP routes are hosted; `/api/pvp/negotiate` and `/api/pvp/events/{event}` remain unavailable until a standalone Functions backend is configured.
  4. Run API tests, syntax checks, and the frontend production build before deployment.
  5. Deploy through the existing `.github/workflows/azure-static-web-apps.yml` master-branch workflow. Do not change Azure resources or environment secrets.
  6. After deployment, make unauthenticated requests to `GET /api/profile`, `GET /api/daily-challenge`, `GET /api/pvp/leaderboard`, and `GET /api/pvp/rooms/ABC234`. Each must return the application's JSON `401` (not a platform 404); check response headers/body only and do not send tokens.
- **Error & Exception Handling**:
  - If any route returns platform 404 or causes `/api/profile` to return 404, stop and revert the new import; keep the last known profile-only deployment behavior.
  - Do not treat `401` as a failure in unauthenticated probes; it confirms the route reached Entra authentication before accessing Cosmos.
  - Do not claim real-time matchmaking works: negotiation and upstream event forwarding are intentionally unavailable in this managed API.

### I02. Local and deployment validation

- Related Files:
  - `game/api/src/index.js` :: route registration; verify
  - `game/PVP_AZURE_SETUP.md` :: operational documentation; verify
  - `.github/workflows/azure-static-web-apps.yml` :: deployment workflow; read-only
  - Hosted Static Web App `https://mango-rock-0a79acd00.3.azurestaticapps.net` :: unauthenticated route probes

#### Details
- Verify `npm test`, `npm run check` from `game/api`, and `npm run build` from `game` pass.
- Verify deployment workflow succeeds before probing the hosted routes.
- Record the deployment run and four observed status codes in this Task's Progress section; do not record any access token or secret.

## Acceptance Criteria
- [x] All ten `functions/pvp.js` HTTP routes are indexed by the managed API.
- [x] Profile and daily challenge endpoints remain registered after adding PvP routes.
- [ ] Unauthenticated probes return function JSON 401 rather than platform 404 for profile, daily challenge, PvP leaderboard, and PvP room lookup.
- [x] `functions/pvpRealtime.js`, `/api/pvp/negotiate`, and Web PubSub event forwarding remain disabled and documented.
- [ ] API tests, API syntax checks, frontend build, and deployment pass.

## Validation
- `npm test` from `game/api` — all API tests pass.
- `npm run check` from `game/api` — Functions modules pass syntax checks.
- `npm run build` from `game` — frontend deployment bundle builds.
- Hosted smoke check at `https://mango-rock-0a79acd00.3.azurestaticapps.net` — the four unauthenticated route probes above return JSON 401, not 404.
- GitHub Actions workflow `Deploy football game to Azure Static Web Apps` — deployment succeeds.

## Commit Message
```text
feat(api): register supported company PvP routes

Plan: 2026-11-03-daily-challenge
Phase: P03-hosted-integration
Task: T01-register-pvp-http-routes

- Re-enable room and leaderboard HTTP endpoints
- Keep unsupported real-time Web PubSub handlers disabled
```

## Progress
- [x] 로컬 구현 완료: `functions/pvp.js` 등록 및 관리형 API 지원 범위 문서화
- [x] 로컬 API 39개 테스트, API 구문 검사, 프런트 빌드 통과
- [ ] 배포 및 네 개 호스팅 경로의 JSON 401 probe — GitHub 연결에 push 권한이 없고 로컬 git remote가 없어 보류
- commit: `ae382d4` (local; awaiting hosted deployment)
