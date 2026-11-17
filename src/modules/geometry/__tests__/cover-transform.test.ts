import type { CoverTransform } from '..';
import { computeCoverTransform, imageToView, isVisibleInView, viewToImage } from '..';
import type { Size } from '../../shared';

function transformFor(image: Size, view: Size): CoverTransform {
  const result = computeCoverTransform(image, view);
  if (!result.ok) {
    throw new Error(`expected a valid transform, got ${result.error}`);
  }
  return result.value;
}

// A 3:4 photo from a typical rear camera, shown on a 360 x 800 dp portrait phone.
const PHOTO = { width: 3000, height: 4000 };
const PHONE = { width: 360, height: 800 };

describe('computeCoverTransform', () => {
  it('scales by the larger ratio so the image fills the view', () => {
    const t = transformFor(PHOTO, PHONE);
    expect(t.scale).toBeCloseTo(0.2); // max(360 / 3000, 800 / 4000)
    expect(t.offsetX).toBeCloseTo(-120); // 600 dp wide image, centred in 360 dp
    expect(t.offsetY).toBeCloseTo(0);
  });

  it('has no offset when the aspect ratios match', () => {
    const t = transformFor({ width: 1080, height: 1920 }, { width: 360, height: 640 });
    expect(t.scale).toBeCloseTo(1 / 3);
    expect(t.offsetX).toBeCloseTo(0);
    expect(t.offsetY).toBeCloseTo(0);
  });

  it.each([
    ['zero width', { width: 0, height: 4000 }, PHONE],
    ['negative height', PHOTO, { width: 360, height: -800 }],
    ['NaN', { width: Number.NaN, height: 4000 }, PHONE],
    ['Infinity', PHOTO, { width: Number.POSITIVE_INFINITY, height: 800 }],
  ])('rejects %s', (_label, image, view) => {
    expect(computeCoverTransform(image, view)).toEqual({ ok: false, error: 'INVALID_SIZE' });
  });
});

describe('imageToView and viewToImage', () => {
  it('maps the image centre to the view centre', () => {
    const t = transformFor(PHOTO, PHONE);
    const centre = imageToView({ x: 1500, y: 2000 }, t);
    expect(centre.x).toBeCloseTo(180);
    expect(centre.y).toBeCloseTo(400);
  });

  it('marks points in the cropped margin as not visible', () => {
    const t = transformFor(PHOTO, PHONE);
    expect(isVisibleInView({ x: 0, y: 0 }, t)).toBe(false); // lands at x = -120
    expect(isVisibleInView({ x: 600, y: 0 }, t)).toBe(true); // lands exactly on the left edge
    expect(isVisibleInView({ x: 2999, y: 3999 }, t)).toBe(false);
  });

  // A fixed table of capture and view sizes, not a property test. Random sizes
  // with fast-check are the follow-up (steering quality.md).
  const IMAGES: Size[] = [PHOTO, { width: 4000, height: 3000 }, { width: 1920, height: 1080 }, { width: 640, height: 480 }];
  const VIEWS: Size[] = [PHONE, { width: 412, height: 915 }, { width: 800, height: 360 }, { width: 1, height: 1 }];
  const cases = IMAGES.flatMap((image) => VIEWS.map((view) => ({ image, view })));

  it.each(cases)('always covers the view: $image.width x $image.height in $view.width x $view.height', ({ image, view }) => {
    const t = transformFor(image, view);
    expect(image.width * t.scale).toBeGreaterThanOrEqual(view.width - 1e-9);
    expect(image.height * t.scale).toBeGreaterThanOrEqual(view.height - 1e-9);
    expect(t.offsetX).toBeLessThanOrEqual(1e-9);
    expect(t.offsetY).toBeLessThanOrEqual(1e-9);
  });

  it.each(cases)('round-trips points: $image.width x $image.height in $view.width x $view.height', ({ image, view }) => {
    const t = transformFor(image, view);
    for (const p of [{ x: 0, y: 0 }, { x: image.width / 3, y: image.height / 7 }, { x: image.width, y: image.height }]) {
      const back = viewToImage(imageToView(p, t), t);
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });
});
