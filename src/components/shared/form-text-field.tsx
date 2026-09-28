"use client";

import { useId } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormTextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
} & Omit<React.ComponentProps<typeof Input>, "name" | "defaultValue" | "value" | "onChange">;

/**
 * Accessible text input bound to react-hook-form: associates label, description
 * and error message with the input via id / aria-describedby / aria-invalid.
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  ...inputProps
}: FormTextFieldProps<T>) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const describedBy =
          [description ? descriptionId : null, fieldState.error ? errorId : null]
            .filter(Boolean)
            .join(" ") || undefined;
        return (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Input
              {...inputProps}
              {...field}
              value={field.value ?? ""}
              id={id}
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={describedBy}
            />
            {description ? (
              <FieldDescription id={descriptionId}>{description}</FieldDescription>
            ) : null}
            <FieldError id={errorId} errors={[fieldState.error]} />
          </Field>
        );
      }}
    />
  );
}
