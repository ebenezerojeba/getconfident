import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

/**
 * Wires a native input (rendered via the `children` render-prop) to its label,
 * description and server-side errors for progressive-enhancement forms.
 */
export function ActionField({
  id,
  label,
  description,
  errors,
  children,
}: {
  id: string;
  label: string;
  description?: string;
  errors?: string[];
  children: (props: {
    id: string;
    name: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }) => React.ReactNode;
}) {
  const invalid = Boolean(errors?.length);
  const describedBy =
    [description ? `${id}-description` : null, invalid ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children({
        id,
        name: id,
        "aria-invalid": invalid || undefined,
        "aria-describedby": describedBy,
      })}
      {description ? (
        <FieldDescription id={`${id}-description`}>{description}</FieldDescription>
      ) : null}
      <FieldError id={`${id}-error`} errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}
