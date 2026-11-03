// Functions v4 entry point. HTTP functions are registered here as the API is added.
import { app } from '@azure/functions';
import './functions/profile.js';
import './functions/dailyChallenge.js';
// Keep the managed API limited to HTTP-only profile and daily challenge routes.
// PvP room routes remain excluded until the hosted registration is revalidated.

export { app };
