// Functions v4 entry point. HTTP functions are registered here as the API is added.
import { app } from '@azure/functions';
import './functions/profile.js';
import './functions/dailyChallenge.js';
import './functions/pvp.js';
// Keep the managed API limited to HTTP-only application routes.
// Web PubSub negotiation and upstream routes remain excluded from this host.

export { app };
