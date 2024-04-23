/**
 * Logs debug information to the console if the DEBUG environment variable is set.
 * @param {...any} args - Arguments to be logged.
 */
export function debug(...args) {
  if (process.env.DEBUG) {
    console.log(...args);
  }
}
