// Core types shared by every module. No React, React Native, or module imports
// here (docs/ARCHITECTURE.md §4).

/** A position with the origin at the top left, in image pixels or view layout units. */
export type Point = { readonly x: number; readonly y: number };

/** A width and height, in image pixels or view layout units. */
export type Size = { readonly width: number; readonly height: number };

/** Success or failure, so modules return errors instead of throwing across boundaries. */
export type Result<T, E extends string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
