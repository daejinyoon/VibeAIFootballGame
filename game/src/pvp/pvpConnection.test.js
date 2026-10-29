import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState } from '../game/createInitialGameState.js';
import { createPvpConnection, isValidPvpSnapshot } from './pvpConnection.js';
import { serializeInputFrame } from './pvpInput.js';

class FakeWebPubSubClient {
  static latest;

  constructor(url) {
    this.url = url;
    this.handlers = new Map();
    this.started = false;
    this.stopped = false;
    this.sent = [];
    FakeWebPubSubClient.latest = this;
  }

  on(name, handler) {
    this.handlers.set(name, [...(this.handlers.get(name) ?? []), handler]);
  }

  off(name, handler) {
    this.handlers.set(name, (this.handlers.get(name) ?? []).filter((entry) => entry !== handler));
  }

  async start() {
    this.started = true;
    assert.ok(this.handlers.get('group-message')?.length, 'message callback must be registered before connect');
  }

  async sendEvent(...args) { this.sent.push(['event', ...args]); }
  async sendToGroup(...args) { this.sent.push(['group', ...args]); }
  stop() { this.stopped = true; }

  emit(name, event) {
    for (const handler of this.handlers.get(name) ?? []) handler(event);
  }
}

const sampleState = () => createInitialGameState();

test('guest sends validated input only and receives validated authoritative snapshots and forfeits', async () => {
  const callbacks = { input: [], snapshots: [], forfeits: [], statuses: [] };
  const connection = createPvpConnection({
    api: { negotiate: async () => ({ url: 'wss://service/client', role: 'guest', group: 'pvp-ABC234' }) },
    WebPubSubClientClass: FakeWebPubSubClient,
    onInput: (message) => callbacks.input.push(message),
    onSnapshot: (message) => callbacks.snapshots.push(message),
    onForfeit: (message) => callbacks.forfeits.push(message),
    onStatus: (status) => callbacks.statuses.push(status),
  });

  assert.deepEqual(await connection.start('ABC234'), { role: 'guest', group: 'pvp-ABC234' });
  const client = FakeWebPubSubClient.latest;
  assert.equal(connection.status, 'connected');
  assert.equal(await connection.sendInput(serializeInputFrame({
    moveX: 1, moveY: 0, down: new Set(), pressed: new Set(['a']), released: new Set(),
  }, 1)), true);
  assert.equal(await connection.sendInput({ type: 'snapshot' }), false);
  assert.equal(await connection.sendSnapshot(sampleState(), 0), false);
  assert.equal(client.sent[0][0], 'event');
  assert.equal(client.sent[0][1], 'pvp-input');

  const snapshot = { type: 'snapshot', sequence: 4, state: sampleState() };
  client.emit('group-message', { message: { group: 'pvp-ABC234', data: snapshot } });
  client.emit('group-message', { message: { group: 'pvp-OTHER1', data: snapshot } });
  client.emit('group-message', { message: { group: 'pvp-ABC234', data: { ...snapshot, sequence: -1 } } });
  client.emit('group-message', { message: { group: 'pvp-ABC234', data: { type: 'input' } } });
  client.emit('group-message', { message: { group: 'pvp-ABC234', data: { type: 'forfeit', loser: 'home' } } });
  assert.equal(callbacks.snapshots.length, 1);
  assert.deepEqual(callbacks.forfeits, [{ loser: 'home' }]);
  assert.equal(callbacks.input.length, 0);
  assert.deepEqual(callbacks.statuses, ['connecting', 'connected']);

  connection.stop();
  connection.stop();
  assert.equal(client.stopped, true);
  assert.equal(client.handlers.get('group-message').length, 0);
  assert.equal(connection.status, 'disconnected');
});

test('host receives only valid relayed input and is the only role permitted to publish snapshots', async () => {
  const received = [];
  const connection = createPvpConnection({
    api: { negotiate: async () => ({ url: 'wss://service/client', role: 'host', group: 'pvp-ABC234' }) },
    WebPubSubClientClass: FakeWebPubSubClient,
    onInput: (message) => received.push(message),
  });
  await connection.start('ABC234');
  const client = FakeWebPubSubClient.latest;
  const packet = serializeInputFrame({ moveX: -1, moveY: 0, down: new Set(), pressed: new Set(), released: new Set() }, 0);
  client.emit('group-message', { message: { group: 'pvp-ABC234', data: packet } });
  client.emit('group-message', { message: { group: 'pvp-ABC234', data: { ...packet, frame: { ...packet.frame, moveX: 2 } } } });
  assert.equal(received.length, 1);
  assert.deepEqual(received[0], packet);
  assert.equal(await connection.sendInput(packet), false);
  assert.equal(await connection.sendSnapshot(sampleState(), 2), true);
  assert.equal(client.sent[0][0], 'group');
  assert.equal(client.sent[0][1], 'pvp-ABC234');
  connection.stop();
});

test('snapshot validator rejects malformed player, score, and state shapes', () => {
  const snapshot = { type: 'snapshot', sequence: 1, state: sampleState() };
  assert.equal(isValidPvpSnapshot(snapshot), true);
  assert.equal(isValidPvpSnapshot({ ...snapshot, sequence: Number.MAX_SAFE_INTEGER + 1 }), false);
  assert.equal(isValidPvpSnapshot({ ...snapshot, state: { ...snapshot.state, players: [] } }), false);
  assert.equal(isValidPvpSnapshot({ ...snapshot, state: { ...snapshot.state, score: { home: 100, away: 0 } } }), false);
});
