import { WebPubSubClient } from '@azure/web-pubsub-client';
import { deserializeInputFrame } from './pvpInput.js';

export function isValidPvpSnapshot(snapshot) {
  const state = snapshot?.state;
  if (!snapshot || snapshot.type !== 'snapshot' || !Number.isSafeInteger(snapshot.sequence) || snapshot.sequence < 0
      || !state || typeof state !== 'object' || !Array.isArray(state.players) || state.players.length !== 8
      || !state.ball || !Number.isFinite(state.ball.x) || !Number.isFinite(state.ball.y)
      || !state.score || !['home', 'away'].every((team) => Number.isInteger(state.score[team]) && state.score[team] >= 0 && state.score[team] <= 99)) return false;
  const ids = new Set();
  for (const player of state.players) {
    if (!player || typeof player.id !== 'string' || ids.has(player.id)
        || !['home', 'away'].includes(player.team)
        || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return false;
    ids.add(player.id);
  }
  try {
    return new TextEncoder().encode(JSON.stringify(snapshot)).byteLength <= 128 * 1024;
  } catch {
    return false;
  }
}

function parsePayload(data) {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  if (data instanceof ArrayBuffer) {
    try { return JSON.parse(new TextDecoder().decode(data)); } catch { return null; }
  }
  if (data instanceof Uint8Array) {
    try { return JSON.parse(new TextDecoder().decode(data)); } catch { return null; }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  try {
    if (new TextEncoder().encode(JSON.stringify(data)).byteLength > 128 * 1024) return null;
    return data;
  } catch {
    return null;
  }
}

export function createPvpConnection({ api, WebPubSubClientClass = WebPubSubClient,
  onInput, onSnapshot, onForfeit, onStatus } = {}) {
  let client = null;
  let role = null;
  let group = null;
  let status = 'disconnected';
  let stopped = false;
  let startPromise = null;

  const setStatus = (nextStatus) => {
    if (status === nextStatus) return;
    status = nextStatus;
    onStatus?.(nextStatus);
  };

  const handleGroupMessage = (event) => {
    if (stopped || (event?.message?.group && event.message.group !== group)) return;
    const payload = parsePayload(event?.message?.data);
    if (!payload || typeof payload.type !== 'string') return;
    if (payload.type === 'input' && role === 'host' && deserializeInputFrame(payload)) {
      onInput?.(payload);
      return;
    }
    if (payload.type === 'snapshot' && role === 'guest' && isValidPvpSnapshot(payload)) {
      onSnapshot?.(payload);
      return;
    }
    if (payload.type === 'forfeit' && ['home', 'away'].includes(payload.loser)) onForfeit?.({ loser: payload.loser });
  };
  const handleDisconnected = () => { if (!stopped) setStatus('disconnected'); };
  const handleConnected = () => { if (!stopped) setStatus('connected'); };
  const handleStopped = () => { if (!stopped) setStatus('failed'); };

  function detach() {
    if (!client) return;
    client.off?.('connected', handleConnected);
    client.off?.('group-message', handleGroupMessage);
    client.off?.('disconnected', handleDisconnected);
    client.off?.('stopped', handleStopped);
  }

  async function start(code) {
    if (stopped) throw new Error('This PvP connection has already stopped.');
    if (startPromise) return startPromise;
    if (!api || typeof api.negotiate !== 'function') throw new Error('PvP negotiation is unavailable.');
    setStatus('connecting');
    startPromise = (async () => {
      try {
        const negotiation = await api.negotiate(code);
        if (stopped) throw new Error('This PvP connection has already stopped.');
        if (!negotiation || typeof negotiation.url !== 'string' || !['host', 'guest'].includes(negotiation.role)
            || typeof negotiation.group !== 'string' || !/^pvp-[A-Z0-9]{6}$/u.test(negotiation.group)) {
          throw new Error('PvP negotiation returned an invalid connection.');
        }
        role = negotiation.role;
        group = negotiation.group;
        client = new WebPubSubClientClass(negotiation.url);
        client.on('connected', handleConnected);
        client.on('group-message', handleGroupMessage);
        client.on('disconnected', handleDisconnected);
        client.on('stopped', handleStopped);
        await client.start();
        if (stopped) throw new Error('This PvP connection has already stopped.');
        setStatus('connected');
        return { role, group };
      } catch (error) {
        detach();
        client?.stop?.();
        if (!stopped) setStatus('failed');
        throw error;
      }
    })();
    return startPromise;
  }

  return {
    start,
    get status() { return status; },
    get role() { return role; },
    async sendInput(packet) {
      if (stopped || status !== 'connected' || role !== 'guest' || !deserializeInputFrame(packet)) return false;
      await client.sendEvent('pvp-input', packet, 'json');
      return true;
    },
    async sendSnapshot(state, sequence) {
      const snapshot = { type: 'snapshot', sequence, state };
      if (stopped || status !== 'connected' || role !== 'host' || !isValidPvpSnapshot(snapshot)) return false;
      await client.sendToGroup(group, snapshot, 'json');
      return true;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      detach();
      client?.stop?.();
      client = null;
      setStatus('disconnected');
    },
  };
}
