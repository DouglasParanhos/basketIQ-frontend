import { useEffect, useRef, type ReactNode, type Ref } from "react";
import { useHideNav } from "./AppShell";

/**
 * A screen without the navigation bar: the start action (back or «Cancelar»), the centred title, and the action that
 * matters pinned to the foot of the screen.
 */
export function FullScreen({
  start,
  title,
  titleRef,
  footer,
  children,
}: {
  start: ReactNode;
  title: string;
  titleRef?: Ref<HTMLHeadingElement>;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useHideNav();
  // The title takes the focus by default (WCAG 2.4.3); a screen that has a better target passes its own `titleRef`.
  const own = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!titleRef) own.current?.focus();
  }, [titleRef]);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pb-3 pt-5">
        <div className="justify-self-start">{start}</div>
        <h1 ref={titleRef ?? own} tabIndex={-1} className="text-center font-display text-xl font-semibold leading-tight">
          {title}
        </h1>
        <div />
      </header>
      <div className="flex flex-1 flex-col gap-3 pb-4">{children}</div>
      {footer && (
        <footer className="sticky bottom-0 -mx-5 flex flex-col gap-2 bg-ground px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{footer}</footer>
      )}
    </div>
  );
}
