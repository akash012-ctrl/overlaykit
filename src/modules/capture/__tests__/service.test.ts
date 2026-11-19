import { createFakeCamera, createFakeFs } from '../../../../test-support/fakes';
import { createCaptureServiceFrom } from '../service';
import { createTempStillStore, STILLS_FOLDER } from '../still-store';

function setup() {
  const fs = createFakeFs();
  const camera = createFakeCamera(fs);
  const store = createTempStillStore(fs);
  let now = 1000;
  const service = createCaptureServiceFrom({
    camera,
    store,
    fs,
    clock: () => (now += 5),
    openSettings: async () => undefined,
  });
  return { fs, camera, service };
}

describe('captureStill', () => {
  it('moves the photo into the stills folder and returns a still FrameRef (R3.5, R4.1)', async () => {
    const { fs, camera, service } = setup();
    const result = await service.captureStill(camera.handle);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      frameId: 'still-1',
      source: 'still',
      size: { width: 3000, height: 4000 },
      mirrored: false,
      capturedAtMs: 1005,
    });
    expect(result.value.pixels).toEqual({ kind: 'file', uri: `file:///cache/${STILLS_FOLDER}/still-1.jpg` });
    expect([...fs.files]).toEqual([`file:///cache/${STILLS_FOLDER}/still-1.jpg`]);
  });

  it('gives each still a new id and a later timestamp (R3.2, R3.3)', async () => {
    const { camera, service } = setup();
    const a = await service.captureStill(camera.handle);
    const b = await service.captureStill(camera.handle);
    if (!a.ok || !b.ok) throw new Error('capture failed');
    expect(a.value.frameId).not.toBe(b.value.frameId);
    expect(b.value.capturedAtMs).toBeGreaterThan(a.value.capturedAtMs);
  });

  it('CAM_CAPTURE_FAILED without a mounted preview', async () => {
    const { service } = setup();
    expect(await service.captureStill(null)).toEqual({ ok: false, error: 'CAM_CAPTURE_FAILED' });
  });

  it('CAM_CAPTURE_FAILED when the camera fails or throws, and never rejects (R3.6)', async () => {
    const { camera, service } = setup();
    camera.photo = { ok: false, error: 'CAM_CAPTURE_FAILED' };
    expect(await service.captureStill(camera.handle)).toEqual({ ok: false, error: 'CAM_CAPTURE_FAILED' });
    camera.photo = 'throw';
    expect(await service.captureStill(camera.handle)).toEqual({ ok: false, error: 'CAM_CAPTURE_FAILED' });
  });

  it('deletes the camera file when the still cannot be stored (R4.6)', async () => {
    const { fs, camera, service } = setup();
    fs.failMove = true;
    const result = await service.captureStill(camera.handle);
    expect(result).toEqual({ ok: false, error: 'CAM_CAPTURE_FAILED' });
    expect(fs.deleted).toContain('file:///camera/photo.jpg');
    expect(fs.files.size).toBe(0);
  });

  it('deletes the stored still when its size is invalid (R3.7, R4.6)', async () => {
    const { fs, camera, service } = setup();
    camera.photo = { ok: true, value: { uri: 'file:///camera/photo.jpg', size: { width: 0, height: 4000 }, mirrored: false } };
    expect(await service.captureStill(camera.handle)).toEqual({ ok: false, error: 'CAM_CAPTURE_FAILED' });
    expect(fs.deleted).toEqual([`file:///cache/${STILLS_FOLDER}/still-1.jpg`]);
    expect(fs.files.size).toBe(0);
  });

  it('carries the mirrored flag (R11.1)', async () => {
    const { camera, service } = setup();
    camera.photo = { ok: true, value: { uri: 'file:///camera/photo.jpg', size: { width: 10, height: 20 }, mirrored: true } };
    const result = await service.captureStill(camera.handle);
    expect(result.ok && result.value.mirrored).toBe(true);
  });
});

describe('still lifetime', () => {
  it('releaseStill deletes the file and reports missing the second time (R4.2)', async () => {
    const { camera, service } = setup();
    const result = await service.captureStill(camera.handle);
    if (!result.ok) throw new Error('capture failed');
    expect(await service.releaseStill(result.value)).toBe('deleted');
    expect(await service.releaseStill(result.value)).toBe('missing');
  });

  it('purgeStills deletes every leftover and counts failures (R4.4, R4.5)', async () => {
    const fs = createFakeFs([`file:///cache/${STILLS_FOLDER}/a.jpg`, `file:///cache/${STILLS_FOLDER}/b.jpg`, 'file:///cache/other.txt']);
    const service = createCaptureServiceFrom({
      camera: createFakeCamera(fs),
      store: createTempStillStore(fs),
      fs,
      clock: () => 0,
      openSettings: async () => undefined,
    });
    expect(await service.purgeStills()).toBe(0);
    expect([...fs.files]).toEqual(['file:///cache/other.txt']);
    fs.files.add(`file:///cache/${STILLS_FOLDER}/c.jpg`);
    fs.failDelete = true;
    expect(await service.purgeStills()).toBe(1);
  });
});

describe('permission', () => {
  it.each([
    [{ status: 'undetermined', canAskAgain: true }, { kind: 'undetermined' }],
    [{ status: 'granted', canAskAgain: true }, { kind: 'granted' }],
    [{ status: 'denied', canAskAgain: true }, { kind: 'denied', code: 'CAM_PERMISSION_DENIED' }],
    [{ status: 'denied', canAskAgain: false }, { kind: 'blocked', code: 'CAM_PERMISSION_BLOCKED' }],
  ] as const)('maps %j', async (snapshot, expected) => {
    const { camera, service } = setup();
    camera.permission = snapshot;
    expect(await service.readPermission()).toEqual(expected);
    expect(await service.requestPermission()).toEqual(expected);
  });

  it('treats a library error as blocked (R1.6)', async () => {
    const { camera, service } = setup();
    camera.getPermission = async () => {
      throw new Error('boom');
    };
    expect(await service.readPermission()).toEqual({ kind: 'blocked', code: 'CAM_PERMISSION_BLOCKED' });
  });
});
