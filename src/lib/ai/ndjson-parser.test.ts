import { describe, test, expect, vi } from 'vitest';
import { createNDJSONParser } from './ndjson-parser';

describe('createNDJSONParser', () => {
  test('parses complete lines in a single chunk', () => {
    const parser = createNDJSONParser<{ type: string; value?: number }>();
    
    const chunk = '{"type":"a","value":1}\n{"type":"b","value":2}\n';
    const events = parser.processChunk(chunk);
    
    expect(events).toEqual([
      { type: 'a', value: 1 },
      { type: 'b', value: 2 },
    ]);
  });

  test('buffers incomplete line at end of chunk', () => {
    const parser = createNDJSONParser<{ type: string; value?: number }>();
    
    const chunk1 = '{"type":"a","value":1}\n{"type":"b"';
    const events1 = parser.processChunk(chunk1);
    
    expect(events1).toEqual([{ type: 'a', value: 1 }]);
    
    const chunk2 = ',"value":2}\n';
    const events2 = parser.processChunk(chunk2);
    
    expect(events2).toEqual([{ type: 'b', value: 2 }]);
  });

  test('handles large result split across two chunks (bug reproduction)', () => {
    const parser = createNDJSONParser<{ type: string; data?: string }>();
    
    // Simulate a ~13KB result split in half
    const largeData = 'x'.repeat(13000);
    const fullLine = `{"type":"result","data":"${largeData}"}`;
    const midpoint = Math.floor(fullLine.length / 2);
    
    const chunk1 = `{"type":"progress"}\n${fullLine.slice(0, midpoint)}`;
    const events1 = parser.processChunk(chunk1);
    
    // Only the progress event should be parsed
    expect(events1).toEqual([{ type: 'progress' }]);
    
    const chunk2 = fullLine.slice(midpoint) + '\n';
    const events2 = parser.processChunk(chunk2);
    
    // Now the complete result should be parsed
    expect(events2).toHaveLength(1);
    expect(events2[0]).toEqual({ type: 'result', data: largeData });
  });

  test('handles error event (bug reproduction)', () => {
    const parser = createNDJSONParser<{ type: string; error?: string }>();
    
    const chunk = '{"type":"error","error":"AI 服务未配置"}\n';
    const events = parser.processChunk(chunk);
    
    expect(events).toEqual([{ type: 'error', error: 'AI 服务未配置' }]);
  });

  test('flush processes remaining buffered content', () => {
    const parser = createNDJSONParser<{ type: string }>();
    
    parser.processChunk('{"type":"a"}\n{"type":"b"}');
    const finalEvents = parser.flush();
    
    expect(finalEvents).toEqual([{ type: 'b' }]);
  });

  test('flush returns empty array when buffer is empty', () => {
    const parser = createNDJSONParser<{ type: string }>();
    
    parser.processChunk('{"type":"a"}\n');
    const finalEvents = parser.flush();
    
    expect(finalEvents).toEqual([]);
  });

  test('skips empty lines', () => {
    const parser = createNDJSONParser<{ type: string }>();
    
    const chunk = '{"type":"a"}\n\n\n{"type":"b"}\n';
    const events = parser.processChunk(chunk);
    
    expect(events).toEqual([
      { type: 'a' },
      { type: 'b' },
    ]);
  });

  test('handles invalid JSON gracefully', () => {
    const parser = createNDJSONParser<{ type: string }>();
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    
    const chunk = '{"type":"a"}\n{invalid json}\n{"type":"b"}\n';
    const events = parser.processChunk(chunk);
    
    // Only valid events are returned
    expect(events).toEqual([
      { type: 'a' },
      { type: 'b' },
    ]);
    
    // Error is logged
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('handles multiple incomplete lines across chunks', () => {
    const parser = createNDJSONParser<{ id: number }>();
    
    // First chunk: complete line + partial line
    const events1 = parser.processChunk('{"id":1}\n{"id":2');
    expect(events1).toEqual([{ id: 1 }]);
    
    // Second chunk: continue partial + new partial
    const events2 = parser.processChunk('}\n{"id":3}\n{"id"');
    expect(events2).toEqual([{ id: 2 }, { id: 3 }]);
    
    // Third chunk: complete last line
    const events3 = parser.processChunk(':4}\n');
    expect(events3).toEqual([{ id: 4 }]);
  });

  test('real-world interview prep response pattern', () => {
    const parser = createNDJSONParser<
      | { type: 'progress' }
      | { type: 'result'; data: { jobTitle: string } }
      | { type: 'error'; error: string }
    >();
    
    // Progress heartbeats
    const events1 = parser.processChunk('{"type":"progress"}\n{"type":"progress"}\n');
    expect(events1).toHaveLength(2);
    expect(events1.every(e => e.type === 'progress')).toBe(true);
    
    // Large result split across chunks
    const resultJson = JSON.stringify({
      type: 'result',
      data: {
        jobTitle: '新媒体运营专员',
        summary: 'Summary text...',
        greetings: [{ style: 'concise', text: 'Hi' }],
        // ... rest of interview prep data
      },
    });
    
    const splitPoint = Math.floor(resultJson.length / 2);
    parser.processChunk(resultJson.slice(0, splitPoint));
    const events2 = parser.processChunk(resultJson.slice(splitPoint) + '\n');
    
    expect(events2).toHaveLength(1);
    expect(events2[0].type).toBe('result');
    if (events2[0].type === 'result') {
      expect(events2[0].data.jobTitle).toBe('新媒体运营专员');
    }
  });
});
