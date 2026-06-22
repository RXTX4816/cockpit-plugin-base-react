import { useState, useEffect } from "react";

function isDark(): boolean {
  return document.documentElement.classList.contains("pf-v6-theme-dark");
}

// Reactively tracks the PatternFly dark mode class on <html>.
// Returns true when the dark theme is active.
export function useDarkMode(): boolean {
  const [dark, setDark] = useState(isDark);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(isDark()));
    observer.observe(document.documentElement, { attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}
