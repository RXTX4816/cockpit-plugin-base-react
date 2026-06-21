import { ComponentType } from "react";
import { createRoot } from "react-dom/client";

/**
 * Mounts a React application into the `#root` DOM element.
 *
 * Call this once at the plugin entry point after {@link initCockpitI18n}.
 *
 * @param App - The root React component to render.
 */
export function bootstrapPlugin(App: ComponentType): void {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}
