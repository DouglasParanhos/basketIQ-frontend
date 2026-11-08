import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Tone = "status" | "alert";

const AnnounceContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

/** Says something to a screen reader (WCAG 4.1.3) without moving the focus: `status` is polite, `alert` interrupts. */
export const useAnnounce = () => useContext(AnnounceContext);

/**
 * Two live regions that stay mounted for the whole session, so that the first message is read as well as the rest.
 * The region is emptied and filled again, which makes a repeated message be read again.
 */
export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState("");
  const [alert, setAlert] = useState("");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const announce = useCallback((message: string, tone: Tone = "status") => {
    const set = tone === "alert" ? setAlert : setStatus;
    set("");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => set(message), 50);
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {status}
      </div>
      <div role="alert" aria-atomic="true" className="sr-only">
        {alert}
      </div>
    </AnnounceContext.Provider>
  );
}
