// Functions v4 entry point. HTTP functions are registered here as the API is added.
import { app } from '@azure/functions';
import './functions/profile.js';
import './functions/dailyChallenge.js';
// Keep the managed API limited to the verified HTTP-only profile and daily routes.
// PvP room routes remain excluded until hosted registration is validated.

export { app };
