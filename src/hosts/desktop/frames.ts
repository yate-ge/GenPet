/** Length-prefixed JSON frames (4-byte little-endian size), used by both desktop channels. */

export function encodeFrame(message: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length);
  return Buffer.concat([header, body]);
}

/** Returns a socket `data` handler that emits each complete message and stops at the first bad frame. */
export function readFrames(
  maxBytes: number,
  onMessage: (message: unknown) => void,
  onError: (problem: 'too-large' | 'invalid-json') => void,
) {
  let buffer = Buffer.alloc(0);
  let failed = false;
  return (chunk: Buffer) => {
    if (failed) return;
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE(0);
      if (length > maxBytes) {
        failed = true;
        return onError('too-large');
      }
      if (buffer.length < length + 4) return;
      const body = buffer.subarray(4, length + 4);
      buffer = buffer.subarray(length + 4);
      let message: unknown;
      try {
        message = JSON.parse(body.toString('utf8'));
      } catch {
        failed = true;
        return onError('invalid-json');
      }
      onMessage(message);
    }
  };
}
