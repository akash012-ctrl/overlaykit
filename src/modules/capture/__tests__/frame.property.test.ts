// Feature: camera-ocr-geometry, Property 13: Still frames are valid and uniquely identified
import * as fc from 'fast-check';

import { createFakeCamera, createFakeFs } from '../../../../test-support/fakes';
import { imageSize, invalidDimension } from '../../../../test-support/arbitraries';
import { createFrameIdSource, isMirroredExif, toFrameRef, uprightSizeForExif } from '../frame';
import { createCaptureServiceFrom } from '../service';
import { createTempStillStore } from '../still-store';

describe('Property 13', () => {
  it('n calls to the id source give n distinct ids', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1000 }), (n) => {
        const ids = createFrameIdSource('still');
        const seen = new Set(Array.from({ length: n }, () => ids.next()));
        expect(seen.size).toBe(n);
      }),
      { numRuns: 100 },
    );
  });

  it('a valid size gives a still FrameRef with that size', () => {
    fc.assert(
      fc.property(imageSize(), fc.boolean(), (size, mirrored) => {
        const result = toFrameRef({ frameId: 'still-1', capturedAtMs: 1, size, mirrored, uri: 'file:///a.jpg' });
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value.source).toBe('still');
          expect(result.value.size).toEqual(size);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('an invalid dimension gives CAM_CAPTURE_FAILED', () => {
    fc.assert(
      fc.property(invalidDimension(), fc.integer({ min: 1, max: 5000 }), fc.boolean(), (bad, good, widthBad) => {
        const size = widthBad ? { width: bad, height: good } : { width: good, height: bad };
        expect(toFrameRef({ frameId: 'still-1', capturedAtMs: 1, size, mirrored: false, uri: 'file:///a.jpg' })).toEqual({
          ok: false,
          error: 'CAM_CAPTURE_FAILED',
        });
      }),
      { numRuns: 100 },
    );
  });

  it('captureStill deletes the still it wrote when the size is invalid (one delete)', async () => {
    await fc.assert(
      fc.asyncProperty(invalidDimension(), async (bad) => {
        const fs = createFakeFs();
        const camera = createFakeCamera(fs);
        camera.photo = { ok: true, value: { uri: 'file:///camera/p.jpg', size: { width: bad, height: 100 }, mirrored: false } };
        const service = createCaptureServiceFrom({
          camera,
          store: createTempStillStore(fs),
          fs,
          clock: () => 1,
          openSettings: async () => undefined,
        });
        const result = await service.captureStill(camera.handle);
        expect(result).toEqual({ ok: false, error: 'CAM_CAPTURE_FAILED' });
        expect(fs.deleted).toHaveLength(1);
        expect(fs.files.size).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});

describe('EXIF helpers', () => {
  it.each([
    [undefined, false],
    [1, false],
    [2, true],
    [3, false],
    [4, true],
    [5, true],
    [6, false],
    [7, true],
    [8, false],
  ])('orientation %s mirrored=%s', (orientation, mirrored) => {
    expect(isMirroredExif(orientation)).toBe(mirrored);
  });

  it('swaps width and height only for orientations 5 to 8', () => {
    expect(uprightSizeForExif({ width: 4, height: 3 }, 6)).toEqual({ width: 3, height: 4 });
    expect(uprightSizeForExif({ width: 4, height: 3 }, 3)).toEqual({ width: 4, height: 3 });
    expect(uprightSizeForExif({ width: 4, height: 3 }, undefined)).toEqual({ width: 4, height: 3 });
  });
});
