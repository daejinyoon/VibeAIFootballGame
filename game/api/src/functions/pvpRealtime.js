import { app } from '@azure/functions';
import { WebPubSubServiceClient } from '@azure/web-pubsub';
import { EntraAuthError, requireEntraCaller } from '../auth/entra.js';
import {
  PvpConcurrencyError,
  PvpError,
  PvpStorageError,
  buildForfeitMatch,
  normalizeRoomCode,
  publicRoom,
} from '../pvp/pvpDomain.js';
import { createPvpRepository } from '../storage/pvpCosmos.js';

const HUB_SETTING = 'WEBPUBSUB_HUB_NAME';
const CONNECTION_SETTING = 'WEBPUBSUB_CONNECTION_STRING';
const USER_ID_PATTERN = /^[^:]+:[^:]+$/u;
const INPUT_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'a', 's', 'd', 'f', 'e', 'Escape']);

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function errorResponse(error) {
  if (error instanceof EntraAuthError || error instanceof PvpError) {
    return jsonResponse(error.status, { code: error.code, message: error.message });
  }
  if (error instanceof PvpConcurrencyError) {
    return jsonResponse(409, { code: 'ROOM_CHANGED', message: 'The room changed. Refresh and try again.' });
  }
  if (error instanceof PvpStorageError || error?.status === 503) {
    return jsonResponse(503, { code: 'PVP_REALTIME_UNAVAILABLE', message: 'The real-time service is unavailable. Please retry.' });
  }
  return jsonResponse(500, { code: 'PVP_REALTIME_FAILED', message: 'The real-time request could not be completed.' });
}

async function readCode(request) {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 2048) throw new PvpError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new PvpError(400, 'INVALID_JSON', 'The request body must be valid JSON.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PvpError(400, 'INVALID_BODY', 'The request body must be a JSON object.');
  return normalizeRoomCode(body.code);
}

function parseInputData(data) {
  let value = data;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return null; }
  } else if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    try { value = JSON.parse(Buffer.from(value).toString('utf8')); } catch { return null; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.type !== 'input' || !Number.isSafeInteger(value.sequence) || value.sequence < 0) return null;
  if (Object.keys(value).some((key) => !['type', 'sequence', 'frame'].includes(key))) return null;
  const frame = value.frame;
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)
      || Object.keys(frame).some((key) => !['moveX', 'moveY', 'down', 'pressed', 'released'].includes(key))
      || ![-1, 0, 1].includes(frame.moveX) || ![-1, 0, 1].includes(frame.moveY)) return null;
  for (const key of ['down', 'pressed', 'released']) {
    if (!Array.isArray(frame[key]) || frame[key].length > INPUT_KEYS.size
        || new Set(frame[key]).size !== frame[key].length
        || !frame[key].every((entry) => typeof entry === 'string' && INPUT_KEYS.has(entry))) return null;
  }
  return {
    type: 'input',
    sequence: value.sequence,
    frame: {
      moveX: frame.moveX,
      moveY: frame.moveY,
      down: [...frame.down],
      pressed: [...frame.pressed],
      released: [...frame.released],
    },
  };
}

function parseServiceUserId(userId) {
  if (typeof userId !== 'string' || !USER_ID_PATTERN.test(userId)) return null;
  const separator = userId.indexOf(':');
  const tenantId = userId.slice(0, separator);
  const objectId = userId.slice(separator + 1);
  if (!tenantId || !objectId) return null;
  return { tenantId, objectId };
}

function createDefaultServiceClient(connectionString, hubName) {
  return new WebPubSubServiceClient(connectionString, hubName);
}

export function createPvpRealtimeHandler({
  authenticate = requireEntraCaller,
  repository = createPvpRepository(),
  createServiceClient = createDefaultServiceClient,
  now = () => new Date().toISOString(),
  env = process.env,
} = {}) {
  let cachedServiceClient = null;
  let cachedConnectionString = '';
  let cachedHubName = '';

  function serviceClient() {
    const connectionString = env[CONNECTION_SETTING]?.trim();
    const hubName = env[HUB_SETTING]?.trim();
    if (!connectionString || !hubName) throw new PvpStorageError('Web PubSub is not configured.');
    if (cachedServiceClient && cachedConnectionString === connectionString && cachedHubName === hubName) return cachedServiceClient;
    try {
      cachedServiceClient = createServiceClient(connectionString, hubName);
      cachedConnectionString = connectionString;
      cachedHubName = hubName;
      return cachedServiceClient;
    } catch (error) {
      throw new PvpStorageError('Web PubSub configuration is invalid.', error);
    }
  }

  return {
    negotiate: async (request) => {
      try {
        const account = await authenticate(request);
        const code = await readCode(request);
        const found = await repository.getRoom(account.tenantId, code);
        if (!found?.document) throw new PvpError(404, 'ROOM_NOT_FOUND', 'The room was not found.');
        const room = found.document;
        const isHost = room.hostObjectId === account.objectId;
        const isGuest = room.guestObjectId === account.objectId;
        if (!isHost && !isGuest) throw new PvpError(403, 'ROOM_MEMBERSHIP_REQUIRED', 'You are not a member of this room.');
        if (room.status !== 'playing') throw new PvpError(409, 'ROOM_NOT_PLAYING', 'The room is not accepting real-time connections.');
        const group = `pvp-${code}`;
        const tokenOptions = {
          userId: `${account.tenantId}:${account.objectId}`,
          groups: [group],
          ...(isHost ? { roles: [`webpubsub.sendToGroup.${group}`] } : {}),
        };
        let token;
        try {
          token = await serviceClient().getClientAccessToken(tokenOptions);
        } catch (error) {
          throw new PvpStorageError('Web PubSub could not issue a client access URL.', error);
        }
        if (typeof token?.url !== 'string' || !token.url) throw new PvpStorageError('Web PubSub did not return a client URL.');
        return jsonResponse(200, { url: token.url, role: isHost ? 'host' : 'guest', group });
      } catch (error) {
        return errorResponse(error);
      }
    },

    upstream: async (request, webPubSubContext, invocationContext = undefined) => {
      if (!webPubSubContext || webPubSubContext.hasError || webPubSubContext.isPreflight) {
        return webPubSubContext?.response ?? new Response(null, { status: 400 });
      }
      const connection = webPubSubContext.request?.connectionContext;
      if (!connection || (connection.hub && connection.hub !== env[HUB_SETTING])) return new Response(null, { status: 200 });
      const eventType = connection.eventType;
      const eventName = connection.eventName;

      if (eventType === 'user') {
        if (eventName !== 'pvp-input') return new Response(null, { status: 200 });
        const sender = parseServiceUserId(connection.userId);
        const message = parseInputData(webPubSubContext.request?.data);
        if (!sender || !message) return new Response(null, { status: 200 });
        try {
          const found = await repository.findPlayingRoom(sender.tenantId, sender.objectId);
          const room = found?.document;
          if (!room || room.status !== 'playing' || room.guestObjectId !== sender.objectId) return new Response(null, { status: 200 });
          const client = serviceClient();
          try {
            await client.group(`pvp-${room.code}`).sendToAll(message);
          } catch (error) {
            throw new PvpStorageError('The guest input could not be relayed.', error);
          }
        } catch (error) {
          invocationContext?.log?.('pvp-realtime', error instanceof PvpStorageError ? 'PVP_STORAGE_UNAVAILABLE' : 'PVP_RELAY_FAILED');
          return errorResponse(error);
        }
        return new Response(null, { status: 200 });
      }

      if (eventType === 'system' && eventName === 'disconnected') {
        const disconnected = parseServiceUserId(connection.userId);
        if (!disconnected) return new Response(null, { status: 200 });
        try {
          const found = await repository.findPlayingRoom(disconnected.tenantId, disconnected.objectId);
          const room = found?.document;
          if (!room || !['playing', 'forfeit'].includes(room.status)) return new Response(null, { status: 200 });

          let loserObjectId;
          let loser;
          if (room.status === 'forfeit') {
            loser = room.forfeitLoser;
            loserObjectId = loser === 'home' ? room.hostObjectId : room.guestObjectId;
          } else {
            loser = disconnected.objectId === room.hostObjectId ? 'home' : 'away';
            loserObjectId = disconnected.objectId;
            room.status = 'forfeit';
            room.forfeitLoser = loser;
            room.updatedAt = now();
            try {
              await repository.replaceRoom(room, found.etag);
            } catch (error) {
              if (error instanceof PvpConcurrencyError) return new Response(null, { status: 200 });
              throw error;
            }
          }

          if (!loserObjectId || (disconnected.objectId !== room.hostObjectId && disconnected.objectId !== room.guestObjectId)) {
            return new Response(null, { status: 200 });
          }
          const forfeitMatch = buildForfeitMatch(room, loserObjectId, now());
          await repository.createMatchOnce(forfeitMatch);
          const client = serviceClient();
          try {
            await client.group(`pvp-${room.code}`).sendToAll({ type: 'forfeit', loser });
          } catch (error) {
            throw new PvpStorageError('The forfeit event could not be broadcast.', error);
          }
        } catch (error) {
          invocationContext?.log?.('pvp-realtime', error instanceof PvpStorageError ? 'PVP_STORAGE_UNAVAILABLE' : 'PVP_DISCONNECT_FAILED');
          return errorResponse(error);
        }
      }
      return new Response(null, { status: 200 });
    },
  };
}

const realtime = createPvpRealtimeHandler();
app.http('pvpNegotiate', {
  route: 'pvp/negotiate',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: realtime.negotiate,
});

// Azure Static Web Apps managed Functions support HTTP-only triggers and
// bindings. Keep the upstream domain handler above for a future standalone
// Functions backend, but do not register its Web PubSub binding here.
