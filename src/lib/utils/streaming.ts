export type StreamWriter = { write: (data: unknown) => void };

/**
 * Creates a streaming NDJSON response.
 * The handler receives a writer that serialises each object as a newline-delimited JSON chunk.
 * Errors thrown inside the handler propagate to the stream controller.
 */
export function createStreamingResponse(
  handler: (writer: StreamWriter) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const writer: StreamWriter = {
        write: (data) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'));
        },
      };
      try {
        await handler(writer);
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
