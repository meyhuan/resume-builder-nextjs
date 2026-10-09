/**
 * Parse NDJSON stream with line buffering to handle chunks that split lines.
 * 
 * @example
 * ```ts
 * const parser = createNDJSONParser<MyEventType>();
 * 
 * // Process chunks
 * for await (const chunk of stream) {
 *   const events = parser.processChunk(chunk);
 *   for (const event of events) {
 *     // Handle event
 *   }
 * }
 * 
 * // Process any remaining buffered content
 * const finalEvents = parser.flush();
 * ```
 */
export interface NDJSONParser<T> {
  /**
   * Process a chunk of data and return parsed events from complete lines.
   * Incomplete lines are buffered until the next chunk.
   */
  processChunk(chunk: string): T[];
  
  /**
   * Process any remaining buffered data at stream end.
   */
  flush(): T[];
}

export function createNDJSONParser<T>(): NDJSONParser<T> {
  let buffer = '';

  return {
    processChunk(chunk: string): T[] {
      // Append to buffer and split by newline
      buffer += chunk;
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      // Parse complete lines
      const events: T[] = [];
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          events.push(JSON.parse(line));
        } catch (err) {
          console.error('[ndjson-parser] Failed to parse line:', line, err);
        }
      }

      return events;
    },

    flush(): T[] {
      if (!buffer.trim()) return [];

      try {
        return [JSON.parse(buffer)];
      } catch (err) {
        console.error('[ndjson-parser] Failed to parse buffered content:', buffer, err);
        return [];
      }
    },
  };
}
