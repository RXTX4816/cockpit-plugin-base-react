import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { axe } from "jest-axe";
import { ToastProvider, useToast } from "./ToastProvider";

function ToastTrigger({ label, message }: { label: string; message: string }) {
  const toast = useToast();
  return <button onClick={() => toast.success(message)}>{label}</button>;
}

function setup() {
  return render(
    <ToastProvider>
      <ToastTrigger label="add" message="It worked!" />
    </ToastProvider>,
  );
}

describe("ToastProvider", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders children", () => {
    setup();
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("shows a toast when success() is called", () => {
    setup();
    act(() => { fireEvent.click(screen.getByText("add")); });
    expect(screen.getByText("It worked!")).toBeInTheDocument();
  });

  it("auto-dismisses the toast after 5 seconds", () => {
    setup();
    act(() => { fireEvent.click(screen.getByText("add")); });
    expect(screen.getByText("It worked!")).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText("It worked!")).not.toBeInTheDocument();
  });

  it("dismisses the toast when close button is clicked", () => {
    setup();
    act(() => { fireEvent.click(screen.getByText("add")); });
    expect(screen.getByText("It worked!")).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /close/i });
    act(() => { fireEvent.click(closeBtn); });
    expect(screen.queryByText("It worked!")).not.toBeInTheDocument();
  });

  it("useToast returns noop functions when used outside ToastProvider", () => {
    function Standalone() {
      const toast = useToast();
      return <button onClick={() => toast.error("oops")}>trigger</button>;
    }
    render(<Standalone />);
    // Should not throw
    expect(() => screen.getByText("trigger")).not.toThrow();
  });

  it("has no accessibility violations with a toast shown", async () => {
    vi.useRealTimers(); // axe's internal scan relies on real timers
    const { container } = setup();
    act(() => { fireEvent.click(screen.getByText("add")); });
    expect(await axe(container)).toHaveNoViolations();
  });
});
