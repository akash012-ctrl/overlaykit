// Gemini Live constants (spec 05 task 19.1, D-050, D-051). Pure data, no network code.

export const LIVE_MODEL_ID = 'gemini-3.8-live';
export const LIVE_MODEL_RESOURCE = `models/${LIVE_MODEL_ID}`;

/** Host and path of Google's raw WebSocket endpoint (Live API WebSockets guide). The key is added in session.ts only. */
export const LIVE_HOST = 'generativelanguage.googleapis.com';
export const LIVE_PATH = '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export const LIVE_AUDIO_MIME = 'audio/pcm;rate=16000';
export const LIVE_FRAME_MIME = 'image/jpeg';

/** Google's documented ceiling: at most 1 video frame per second. Not a tuned threshold. */
export const LIVE_MIN_FRAME_GAP_MS = 1000;

/** Resume attempts after a drop or GoAway before the session ends with PL_LIVE_SESSION_ENDED. */
export const LIVE_MAX_RESUME_ATTEMPTS = 2;

// Unset until measured on the phone (like the other thresholds). NaN means "never fires":
// see armTimer in session.ts. shortcut: no plan or connect timeout until they are measured; abort still works.
/** Gap between frames while watching, ms. Not below 1000. */
export const LIVE_FRAME_INTERVAL_MS = NaN;
/** Wait for one tool call, ms, then PL_TIMEOUT. */
export const LIVE_PLAN_TIMEOUT_MS = NaN;
/** A step older than this is stale, ms. Used by ui/guide. */
export const LIVE_STEP_MAX_AGE_MS = NaN;
/** No plan request for this long ends the session, ms. */
export const LIVE_IDLE_STOP_MS = NaN;

export const LIVE_FUNCTIONS = { step: 'show_step', finished: 'goal_finished', cannotPlan: 'cannot_plan' } as const;
