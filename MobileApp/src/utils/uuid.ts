/**
 * RFC 4122 v4-format id for Idempotency-Key headers. Uses Math.random
 * because Hermes has no crypto.randomUUID; that is fine here since the key
 * only has to be unique per submission, not secret.
 */
export function generateUuid(): string {
  const hex = (max: number, offset = 0) =>
    (offset + Math.floor(Math.random() * max)).toString(16);

  // x: any hex digit; y: 8, 9, a or b (RFC 4122 variant).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char =>
    char === 'x' ? hex(16) : hex(4, 8),
  );
}
