import { ComponentType } from "react";
import { createRoot } from "react-dom/client";

export function bootstrapPlugin(App: ComponentType): void {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
}
