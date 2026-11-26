/**
 * Subtle institutional UI transitions (150ms ease-out, zero spring overshoot or flashy effects).
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const PILL_TRANSITION = {
  duration: 0.15,
  ease: "easeOut",
} as const;

export const HOVER_PILL_TRANSITION = {
  duration: 0.12,
  ease: "easeOut",
} as const;

export const PAGE_TRANSITION = {
  duration: 0.15,
  ease: "easeOut",
} as const;

export const MODAL_TRANSITION = {
  duration: 0.15,
  ease: "easeOut",
} as const;

export const CARD_STAGGER_DELAY = 0;
