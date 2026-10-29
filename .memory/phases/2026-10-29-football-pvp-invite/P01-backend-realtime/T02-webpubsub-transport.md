# Task: T02 Web PubSub Transport

## Status: done

## Goal
Connect only authenticated room members to their Web PubSub room, relay guest input to the match host, and handle a verified disconnect as an immediate forfeit. Keep the API compatible with the existing Azure Static Web Apps managed Functions host.

## Decision Summary
- Azure Static Web Apps managed Functions supports HTTP triggers only. Handle Web PubSub upstream callbacks with an HTTP function and the `webPubSubContext` input binding; do not register `WebPubSubTrigger` functions.
- Generate client URLs server-side from the verified Entra caller and the room membership. The host receives permission to publish state to its own room group; the guest may only send user events to the upstream handler.
- Use `@azure/web-pubsub` in the API, the `football-pvp` hub, and a group named `pvp-<CODE>`. The API key/connection string stays on the server.

## Implementation

### I01. Authenticated connection URL and client message channel

- Related Files:
  - `game/api/src/functions/pvpRealtime.js` :: `createPvpRealtimeHandler`, negotiate route, Web PubSub upstream route — token creation, guest input relay, disconnect forfeits; new
  - `game/api/src/pvp/pvpCosmos.js` :: `getRoom`, `replaceRoom`, `createMatchOnce` — room membership and forfeit persistence; modify
  - `game/api/src/index.js` :: import realtime function registrations; modify
  - `game/api/src/functions/pvpRealtime.test.js` :: access and relay checks; new
  - `game/api/package.json` :: `@azure/web-pubsub` dependency and `scripts.check`; modify
  - `game/api/package-lock.json` — lock API service SDK dependency; modify
- **Signatures & Types**:
  ```js
  export function createPvpRealtimeHandler({ authenticate, repository, createServiceClient, now } = {});
  // HTTP negotiate handler: POST /api/pvp/negotiate with {code} -> {url, role, group}
  // HTTP upstream handler: POST /api/pvp/events/{event}, WebPubSubContext supplied by input binding
  ```
- **Connection Contract**:
  - Hub: `football-pvp`.
  - Stable Web PubSub `userId`: `${tenantId}:${objectId}` from `requireEntraCaller`; never accept it from query or JSON.
  - Group: `pvp-${CODE}`. Negotiation requires a valid room in `playing` state and a caller equal to its host or guest.
  - Host token options: `userId`, `groups:[group]`, `roles:["webpubsub.sendToGroup.<group>"]`.
  - Guest token options: `userId`, `groups:[group]`, no group-publish role. Both tokens are generated on demand and never cached.
- **Event Schema**:
  ```ts
  type PvpInputMessage = {
    type: 'input'; sequence: number;
    frame: { moveX: -1|0|1; moveY: -1|0|1; down: string[]; pressed: string[]; released: string[] }
  };
  type PvpSnapshotMessage = { type: 'snapshot'; sequence: number; state: GameState };
  ```
  - The guest sends `PvpInputMessage` as user event `pvp-input`. The upstream handler takes sender identity from `WebPubSubContext.request.connectionContext.userId`, verifies it equals the room guest, validates sequence and frame keys, then sends the JSON message to the room group with `WebPubSubServiceClient.group(group).sendToAll(...)`.
  - Host snapshots use the host's group-publish permission and are sent directly through `@azure/web-pubsub-client`; guest clients cannot publish snapshots.
- **Execution Flow / Logic**:
  1. Precondition & Validation: reject missing/bad Entra tokens through the existing `requireEntraCaller`; reject negotiation if user is not a member or room is not `playing`; require `WEBPUBSUB_CONNECTION_STRING` and `WEBPUBSUB_HUB_NAME`.
  2. Core Processing: `POST /api/pvp/negotiate` calls `WebPubSubServiceClient.getClientAccessToken({userId,groups,roles})` and returns `{url,role,group}`. Register `app.http('pvpEvents', {route:'pvp/events/{event}',methods:['POST'],authLevel:'anonymous',extraInputs:[wpsContext],handler})`, where `wpsContext` is `input.generic({type:'webPubSubContext',name:'wpsContext',connection:'WEBPUBSUB_CONNECTION_STRING'})`. If `hasError` or `isPreflight`, return the binding's prebuilt `response` unchanged.
  3. User event: accept only `pvp-input`; ignore guest-supplied `snapshot` messages; only relay input if event user ID exactly matches the guest object ID in the room. The server does not trust sender IDs embedded in JSON.
  4. Disconnect event: for `request.connectionContext.eventType === 'system'` and event name `disconnected`, find the playing room by the verified WPS user ID. Mark the disconnected side as loser, create `match:<CODE>` once with `source:'forfeit'` and null score fields, transition room to `forfeit`, and publish `{type:'forfeit',loser:'home'|'away'}` to the still-connected group. A waiting-room disconnect does not delete the room because the creator explicitly chose manual cancellation.
  5. Error & Exception Handling: return the Web PubSub binding's response for preflight/invalid upstream requests; malformed user events are acknowledged without forwarding. Log codes and room code only; never log tokens, connection strings, user IDs, or payload state snapshots.
- **Data & Schema Fields**:
  - API app settings: `WEBPUBSUB_CONNECTION_STRING` secret and `WEBPUBSUB_HUB_NAME=football-pvp`.
  - Host disconnect/guest disconnect identity resolves to the room's `hostObjectId` / `guestObjectId`, then to the corresponding home/away role.
- **Acceptance Criteria**:
  - [ ] An unauthenticated user, wrong-tenant user, room nonmember, cancelled room, or non-playing member cannot obtain a connection URL.
  - [ ] Host token can publish only to its room group; guest token cannot publish to any group.
  - [ ] Guest input is forwarded only when the Web PubSub connection user ID belongs to that room's guest.
  - [ ] A confirmed match disconnect creates exactly one automatic forfeit record, and a waiting-room disconnect leaves the room available until host cancellation.
  - [ ] The upstream endpoint uses HTTP plus `WebPubSubContext`, not a non-HTTP trigger.

### I02. Function binding configuration
- Related Files:
  - `game/api/host.json` :: `extensionBundle` — enable the Web PubSub context binding; modify
  - `game/api/src/functions/pvpRealtime.test.js` :: preflight and invalid-context behavior; modify
- **Data & Schema Fields**:
  ```json
  {
    "version": "2.0",
    "extensionBundle": {
      "id": "Microsoft.Azure.Functions.ExtensionBundle",
      "version": "[4.0.0, 5.0.0)"
    }
  }
  ```
- **Acceptance Criteria**:
  - [ ] The API host loads the `webPubSubContext` input binding locally and in managed Static Web Apps Functions.
  - [ ] Binding connection uses the named server setting and validates upstream requests; no service secret appears in browser code.

## Validation
- `npm --prefix game/api test` — negotiation authorization, input filtering, disconnect idempotency, and binding-context tests pass.
- `npm --prefix game/api run check` — API source and function registrations parse.
- `npm --prefix game run build` — frontend import graph remains valid after API SDK changes.

## Commit Message
```text
feat(pvp): add room-scoped Web PubSub transport

Plan: 2026-10-29-football-pvp-invite
Phase: P01-backend-realtime
Task: T02-webpubsub-transport

- Issue room-scoped Web PubSub access URLs from verified Entra identity
- Relay guest input and persist verified disconnect forfeits through HTTP upstream events
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: specified in git history
