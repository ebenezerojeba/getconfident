// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { EmptyState, ErrorState, LoadingState, SuccessState } from "./states";

describe("shared states", () => {
  it("LoadingState announces politely", () => {
    render(<LoadingState title="Analyzing" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Analyzing");
  });

  it("EmptyState renders title, description and actions", () => {
    render(
      <EmptyState title="Nothing here" description="Start a session">
        <button type="button">Start</button>
      </EmptyState>,
    );
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByText("Start a session")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });

  it("ErrorState is an alert and calls onRetry", async () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("ErrorState hides retry when no handler is given", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("SuccessState renders as a status", () => {
    render(<SuccessState title="Saved" />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
});
