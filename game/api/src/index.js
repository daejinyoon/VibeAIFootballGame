// Functions v4 entry point. HTTP functions are registered here as the API is added.
import { app } from '@azure/functions';
import './functions/profile.js';
import './functions/dailyChallenge.js';
import './functions/pvp.js';
// Keep the managed API HTTP-only; the Web PubSub realtime module remains excluded.

export { app };
