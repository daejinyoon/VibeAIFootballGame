// Functions v4 entry point. HTTP functions are registered here as the API is added.
import { app } from '@azure/functions';
import './functions/profile.js';
import './functions/pvp.js';
// The real-time PvP module requires a Web PubSub binding that the managed
// Static Web Apps API host does not support. Keep it for a future standalone
// Functions backend, but don't import it into this app.

export { app };
