import { useEffect, type RefObject } from 'react';

/**
 * Google AdSense's ad-unclipping script walks up the DOM from ad slots and
 * force-sets `height: auto !important` (inline, so it beats any stylesheet
 * rule including our own `!important`) on the first ancestor it finds with
 * `overflow: hidden` and a fixed height — to guarantee its ad isn't clipped.
 * That's exactly the shell div this app-shell layout relies on to keep main
 * scrolling internally and the footer pinned, so the whole page starts
 * scrolling instead. This element never needs an inline style of its own,
 * so just revert any that shows up.
 */
export function useLockShellHeight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      if (el.getAttribute('style')) {
        el.removeAttribute('style');
      }
    });
    observer.observe(el, { attributes: true, attributeFilter: ['style'] });

    return () => observer.disconnect();
  }, [ref]);
}
