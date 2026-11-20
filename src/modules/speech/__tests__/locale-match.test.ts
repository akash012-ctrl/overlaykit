import { listenTag } from '../locale-match';

describe('listenTag', () => {
  it('prefers an installed pack, then a listed language', () => {
    expect(listenTag({ all: ['en-US', 'hi-IN'], installed: ['en-GB'] }, 'en')).toEqual({ tag: 'en-GB', installed: true });
    expect(listenTag({ all: ['en-US', 'hi-IN'], installed: [] }, 'hi')).toEqual({ tag: 'hi-IN', installed: false });
  });

  it('falls back to the default tag when the service lists no languages', () => {
    expect(listenTag({ all: [], installed: [] }, 'kn')).toEqual({ tag: 'kn-IN', installed: false });
  });

  it('is null when the service lists languages and this one is not among them', () => {
    expect(listenTag({ all: ['en-US'], installed: [] }, 'kn')).toBeNull();
  });
});
