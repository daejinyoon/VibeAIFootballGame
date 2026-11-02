// Functions v4 entry point. HTTP functions are registered here as the API is added.
import { app } from '@azure/functions';
import './functions/profile.js';
// Keep the managed API profile-only while isolating the hosted 404. PvP room
// routes can be re-enabled after profile function registration is confirmed.

export { app };
