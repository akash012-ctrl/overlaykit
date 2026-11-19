import { CAM_ERROR_CODES, OCR_ERROR_CODES, TR_ERROR_CODES } from '..';

// Pins the code lists to docs/ARCHITECTURE.md §8 and D-033 (OQ-7). The QE-1
// tests iterate these lists, so a dropped or repeated code must fail here.

describe('error code lists', () => {
  it('lists every CAM_* code once', () => {
    expect([...CAM_ERROR_CODES].sort()).toEqual(
      ['CAM_CAPTURE_FAILED', 'CAM_PERMISSION_BLOCKED', 'CAM_PERMISSION_DENIED', 'CAM_UNAVAILABLE'],
    );
  });

  it('lists only TR_NOT_CONFIGURED in spec A', () => {
    expect(TR_ERROR_CODES).toEqual(['TR_NOT_CONFIGURED']);
  });

  it('lists every OCR_* code once, including OCR_RECOGNITION_FAILED', () => {
    expect([...OCR_ERROR_CODES].sort()).toEqual([
      'OCR_ENGINE_UNAVAILABLE',
      'OCR_LOW_QUALITY',
      'OCR_NO_TEXT',
      'OCR_RECOGNITION_FAILED',
      'OCR_UNSUPPORTED_SCRIPT',
    ]);
  });
});
