import { useEffect, useRef } from "react";

/**
 * The focus pattern of a confirmation (A-14): when it opens, the focus goes to the element the ref is on; when it closes,
 * the focus goes back to what opened it, if that is still on the page. Give the ref to the question's title (with `tabIndex={-1}`).
 */
export function useConfirmFocus<T extends HTMLElement>(open = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);
  return ref;
}
