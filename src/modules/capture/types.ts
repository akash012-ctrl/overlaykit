export type PermissionState =
  | { readonly kind: 'checking' }
  /** Never requested: the screen requests at once (R1.1). */
  | { readonly kind: 'undetermined' }
  | { readonly kind: 'granted' }
  /** Denied, and Android can still show the prompt (R1.3). */
  | { readonly kind: 'denied'; readonly code: 'CAM_PERMISSION_DENIED' }
  /** Denied, and Android will no longer show the prompt (R1.6). */
  | { readonly kind: 'blocked'; readonly code: 'CAM_PERMISSION_BLOCKED' };

export type CameraState =
  | { readonly kind: 'starting' }
  | { readonly kind: 'ready' }
  /** The back camera can't start, or stopped while the preview was shown (R2.4). */
  | { readonly kind: 'unavailable'; readonly code: 'CAM_UNAVAILABLE' };
