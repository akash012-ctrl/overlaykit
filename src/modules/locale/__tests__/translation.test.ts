import { getTranslationProvider, notConfiguredProvider } from '..';

describe('notConfiguredProvider', () => {
  const realFetch = globalThis.fetch;
  const realXhr = globalThis.XMLHttpRequest;
  let fetchSpy: jest.Mock;
  let xhrSpy: jest.Mock;

  beforeEach(() => {
    fetchSpy = jest.fn(() => {
      throw new Error('network request made');
    });
    xhrSpy = jest.fn(() => {
      throw new Error('network request made');
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    globalThis.XMLHttpRequest = xhrSpy as unknown as typeof XMLHttpRequest;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    globalThis.XMLHttpRequest = realXhr;
  });

  it('is the provider in spec A (R17.1)', () => {
    expect(getTranslationProvider()).toBe(notConfiguredProvider);
    expect(notConfiguredProvider.id).toBe('not-configured');
  });

  it('returns one TR_NOT_CONFIGURED per text, in order, with no network request (R17.2)', async () => {
    const texts = ['TICKETS', 'टिकट खरीदें', '', 'x'.repeat(5000), '🎫'];
    const outcomes = await notConfiguredProvider.translate({ texts, source: 'auto', target: 'hi' });
    expect(outcomes).toHaveLength(texts.length);
    for (const outcome of outcomes) {
      expect(outcome).toEqual({ ok: false, error: 'TR_NOT_CONFIGURED' });
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('returns an empty list for no texts', async () => {
    await expect(notConfiguredProvider.translate({ texts: [], source: 'auto', target: 'kn' })).resolves.toEqual([]);
  });
});
