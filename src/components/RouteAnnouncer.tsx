import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useAnnounce } from "./Announce";

/**
 * Tells a screen reader that the page changed (WCAG 4.1.3) and, when the element the person used is gone, moves the focus
 * to the content (2.4.3). It reacts to the path, not to the query string, so changing a filter does not take the focus.
 */
export function RouteAnnouncer() {
  const { pathname } = useLocation();
  const announce = useAnnounce();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // Waits for the new page to mount, so that the title it reads is the new one.
    const id = window.setTimeout(() => {
      announce(document.title);
      const active = document.activeElement;
      if (!active || active === document.body) document.getElementById("conteudo")?.focus({ preventScroll: true });
    }, 150);
    return () => window.clearTimeout(id);
  }, [pathname, announce]);
  return null;
}
