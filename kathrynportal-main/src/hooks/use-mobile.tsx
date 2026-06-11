import * as React from "react";

const MOBILE_BREAKPOINT = 768;
/** Below lg — iPad portrait / small tablets use drawer nav instead of docked sidebar. */
const COMPACT_NAV_BREAKPOINT = 1024;

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
}

export function useIsCompactNav() {
  return useMediaQuery(`(max-width: ${COMPACT_NAV_BREAKPOINT - 1}px)`);
}

export function prefersCompactCalendarView(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${COMPACT_NAV_BREAKPOINT - 1}px)`).matches;
}
