/**
 * Off unless the build sets EXPO_PUBLIC_OVERLAYKIT_LIVE=1. Distributed builds leave it unset
 * until AT-G1-06 has a PASSED record in docs/DEVICE-TESTS.md (R16.1, DD-14).
 */
export const LIVE_MODE_AVAILABLE: boolean = process.env.EXPO_PUBLIC_OVERLAYKIT_LIVE === '1';
