import { useState, useEffect } from "react";

/**
 * Custom hook to track media query matches.
 * @param query The media query string (e.g., '(min-width: 640px)')
 * @returns Boolean indicating if the query matches
 */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQueryList.matches);

    // Use addEventListener for modern browsers, fallback for older ones
    try {
      mediaQueryList.addEventListener("change", listener);
    } catch (e) {
      // Fallback for older browsers
      mediaQueryList.addListener(listener); // Deprecated but necessary for some environments
    }

    // Cleanup listener on unmount
    return () => {
      try {
        mediaQueryList.removeEventListener("change", listener);
      } catch (e) {
        mediaQueryList.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;
