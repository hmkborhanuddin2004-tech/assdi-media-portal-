/**
 * Shared silky zero-bounce motion primitives ("Glassy Dashboard V31" easing).
 * Only animates GPU-composited properties (transform / opacity) with critically-damped cubic-bezier curves.
 */
export const SILKY_EASE = [0.22, 1, 0.36, 1] as const;

export const PILL_TRANSITION = {
  duration: 0.22,
  ease: SILKY_EASE,
} as const;

export const HOVER_PILL_TRANSITION = {
  duration: 0.16,
  ease: SILKY_EASE,
} as const;

export const PAGE_TRANSITION = {
  duration: 0.2,
  ease: SILKY_EASE,
} as const;

export const MODAL_TRANSITION = {
  duration: 0.2,
  ease: SILKY_EASE,
} as const;

export const CARD_STAGGER_DELAY = 0.03;
