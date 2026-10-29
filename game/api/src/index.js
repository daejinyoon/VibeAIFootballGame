// Functions v4 entry point. HTTP functions are registered here as the API is added.
import { app } from '@azure/functions';
import './functions/profile.js';
import './functions/pvp.js';
import './functions/pvpRealtime.js';

export { app };
