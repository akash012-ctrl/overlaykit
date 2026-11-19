import type { StringKey } from './en';

/**
 * Review status of one hi or kn string. D-031: no fluent reviewers are
 * available, so every value in this spec is 'unreviewed' and none may claim a
 * reviewer. The reviewed form exists for spec B, if a reviewer is found.
 */
export type StringReview = 'unreviewed' | { readonly reviewer: string; readonly reviewedOn: string };

export type LocalizedString = { readonly text: string; readonly review: StringReview };

/** A missing key is a type error (R20.2). */
export type LocalizedTable = { readonly [K in StringKey]: LocalizedString };
