import { expect, test } from 'e2e';

// Checks the placeholder Home screen in src/app/index.tsx. Its job for now is to
// prove the e2e pipeline (build, install, launch, locate) works on Android.
// Replace it when the camera screen lands in G1.
test('home screen shows the app name and the three modes', async ({ app, screen }) => {
  await app.open();

  await expect(screen.getByText('OverlayKit')).toBeVisible();
  await expect(screen.getByText('Translate')).toBeVisible();
  await expect(screen.getByText('Explore')).toBeVisible();
  await expect(screen.getByText('Guide')).toBeVisible();
});
