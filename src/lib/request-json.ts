export class RequestBodyError extends Error {
  constructor(message: string, readonly status: 400 | 413) { super(message); }
}

export async function readJsonBody(request: Request, maxBytes = 1_000_000): Promise<unknown> {
  if (!request.body) throw new RequestBodyError('Request body is required.', 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyError('Request body is too large.', 413);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError('Request body could not be read.', 400);
  }
  try {
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new RequestBodyError('Request body must be valid JSON.', 400);
  }
}
