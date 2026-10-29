/** Return true only for Vite's compile-time local development flag. */
export function isLocalDevelopmentMode(environment) {
  return environment?.DEV === true;
}
