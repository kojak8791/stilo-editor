/** Budgets of SPEC NFR-1.4 (Chromium, reference machine), in milliseconds. */
export interface Budget {
  /** p95 of the typing latency, worst of start, middle and end of the document. */
  typingP95: number;
  /** `setHTML()` until the view is rendered. */
  load: number;
  /** Median `getHTML()`. */
  getHTML: number;
  /** p95 of a block move in the middle of the document. */
  moveBlockP95: number;
}

/**
 * SPEC NFR-1.4, calibrated by ADR 0003 after the first measurement: for 50k paragraphs, typing
 * p95 33 → 50 ms and block move 33 → 100 ms (ProseMirror reconciles every top-level block when
 * one of them changes). Documents without a budget (`paragraphs-1k`, `nested-list`) are measured
 * for information.
 */
export const BUDGETS: Readonly<Record<string, Budget>> = {
  'paragraphs-10k': { typingP95: 16, load: 1_500, getHTML: 300, moveBlockP95: 16 },
  'paragraphs-50k': { typingP95: 50, load: 6_000, getHTML: 1_500, moveBlockP95: 100 },
};
