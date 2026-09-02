// Easing for the scroll-world films.
//
// Not interchangeable with anything in a library: every scene's copy fade is
// expressed as a ratio fed through `smooth`, so changing the curve changes the
// look of every seam in every deck.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** Smoothstep. f(0)=0, f(1)=1, flat at both ends. */
export const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
