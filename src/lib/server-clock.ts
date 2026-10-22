// The phone's clock can be wrong: set by hand, or minutes off after a long time without a
// network. Every deadline the app counts down to (a live session, a say-hi request) comes
// from the server, so it is compared with serverNow(): the phone's clock corrected by how far
// it was off the last time the server said what time it was (my_status sends its clock).

let offsetMs = 0;

/** The current time on the server's clock, in milliseconds, as best we know it. */
export function serverNow() {
  return Date.now() + offsetMs;
}

/**
 * Remember how far the phone's clock is off. `sentAt` and `receivedAt` are the phone's clock
 * just before and after the request; the server's answer is taken as halfway between them.
 */
export function syncServerClock(serverTimeMs: number, sentAt: number, receivedAt: number) {
  offsetMs = serverTimeMs - (sentAt + receivedAt) / 2;
}
