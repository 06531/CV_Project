'use client';

import { useEffect } from 'react';

/**
 * The one pointer tracker on the site. Publishes where the cursor is as CSS
 * variables and lets `globals.css` do the drawing:
 *
 *   --px / --py   viewport position, for the backdrop glow
 *   --cx / --cy   position inside the hovered card, for its spotlight
 *
 * Renders nothing. Everything it enables is gated behind `data-pointer="fine"`
 * on <html>, which is only ever set when there is a real mouse and the reader
 * has not asked for less motion — so touch devices and reduced-motion users
 * never pay for any of this, not even the listener.
 */
export default function PointerFx() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const root = document.documentElement;

    let attached = false;
    let raf = 0;
    let pending: { x: number; y: number; card: HTMLElement | null } | null = null;
    let card: HTMLElement | null = null;

    function clearCard() {
      if (!card) return;
      card.style.removeProperty('--cx');
      card.style.removeProperty('--cy');
      card = null;
    }

    function flush() {
      raf = 0;
      if (!pending) return;
      const { x, y, card: next } = pending;
      pending = null;

      root.style.setProperty('--px', `${x}px`);
      root.style.setProperty('--py', `${y}px`);
      root.setAttribute('data-pointer', 'fine');

      if (next !== card) clearCard();
      if (!next) return;
      const box = next.getBoundingClientRect();
      next.style.setProperty('--cx', `${(x - box.left).toFixed(1)}px`);
      next.style.setProperty('--cy', `${(y - box.top).toFixed(1)}px`);
      card = next;
    }

    function onMove(event: PointerEvent) {
      // A pen or a finger reports through the same event; only a mouse counts.
      if (event.pointerType !== 'mouse') return;
      const target = event.target instanceof Element ? event.target : null;
      pending = {
        x: event.clientX,
        y: event.clientY,
        card: target?.closest<HTMLElement>('[data-spotlight]') ?? null,
      };
      // Coalesce: many moves land per frame, and only the last one matters.
      if (!raf) raf = requestAnimationFrame(flush);
    }

    function rest() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      pending = null;
      root.removeAttribute('data-pointer');
      clearCard();
    }

    function onVisibility() {
      if (document.hidden) rest();
    }

    function attach() {
      if (attached) return;
      attached = true;
      window.addEventListener('pointermove', onMove, { passive: true });
      // Leaving the window entirely — put the glow away rather than stranding
      // it wherever the cursor happened to exit.
      document.addEventListener('pointerleave', rest);
      document.addEventListener('visibilitychange', onVisibility);
    }

    function detach() {
      if (!attached) return;
      attached = false;
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', rest);
      document.removeEventListener('visibilitychange', onVisibility);
      rest();
    }

    function sync() {
      if (fine.matches && !reduce.matches) attach();
      else detach();
    }

    // Both can change mid-session: a mouse gets plugged into a tablet, or the
    // reader turns motion down in system settings.
    fine.addEventListener('change', sync);
    reduce.addEventListener('change', sync);
    sync();

    return () => {
      fine.removeEventListener('change', sync);
      reduce.removeEventListener('change', sync);
      detach();
      root.style.removeProperty('--px');
      root.style.removeProperty('--py');
    };
  }, []);

  return null;
}
