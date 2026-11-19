import * as fc from 'fast-check';

import { notConfiguredProvider } from '..';

describe('not-configured adapter properties', () => {
  const realFetch = globalThis.fetch;
  const fetchSpy = jest.fn(() => {
    throw new Error('network request made');
  });

  beforeAll(() => {
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = realFetch;
  });

  // Feature: camera-ocr-geometry, Property 16: The not-configured adapter answers every line with TR_NOT_CONFIGURED
  it('answers every text with TR_NOT_CONFIGURED and makes no network request', async () => {
    const texts = fc.array(fc.oneof(fc.string({ unit: 'binary' }), fc.string({ unit: 'binary', minLength: 2_000, maxLength: 3_000 })), {
      maxLength: 30,
    });
    await fc.assert(
      fc.asyncProperty(texts, fc.constantFrom('en', 'hi', 'kn'), async (list, target) => {
        const outcomes = await notConfiguredProvider.translate({ texts: list, source: 'auto', target });
        expect(outcomes).toHaveLength(list.length);
        for (const outcome of outcomes) expect(outcome).toEqual({ ok: false, error: 'TR_NOT_CONFIGURED' });
      }),
      { numRuns: 100 },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
