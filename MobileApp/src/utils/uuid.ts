/**
 * RFC 4122 v4-format id for Idempotency-Key headers. Uses Math.random
 * because Hermes has no crypto.randomUUID; that is fine here since the key
 * only has to be unique per submission, not secret.
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
