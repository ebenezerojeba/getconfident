// @vitest-environment jsdom
import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormTextField } from "./form-text-field";

const schema = z.object({ email: z.email("Enter a valid email") });

function Harness() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });
  return (
    <form onSubmit={form.handleSubmit(() => {})} noValidate>
      <FormTextField
        control={form.control}
        name="email"
        label="Email"
        description="We never share it"
        type="email"
      />
      <button type="submit">Submit</button>
    </form>
  );
}

describe("FormTextField", () => {
  it("associates the label and description with the input", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAccessibleDescription("We never share it");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks the input invalid and exposes the error message", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a valid email");
    expect(input).toHaveAccessibleDescription(/Enter a valid email/);
  });
});
