import { useSyncExternalStore } from "react";

/**
 * Custom hook to track media query matches.
 * @param query The media query string (e.g., '(min-width: 640px)')
 * @returns Boolean indicating if the query matches
 */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") return () => {};
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener("change", callback);
      return () => mediaQueryList.removeEventListener("change", callback);
    },
    () =>
      typeof window !== "undefined"
        ? window.matchMedia(query).matches
        : false,
    () => false,
  );
}

export default useMediaQuery;
