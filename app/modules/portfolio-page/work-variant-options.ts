export const workVariantOptions = [
  { id: "lift", label: "Lift the city", detail: "A paper layer reveals the projects below" },
  { id: "transit", label: "Streetcar route", detail: "Visit the work as stops on a line" },
  { id: "guide", label: "Field guide", detail: "Unfold annotated project pages" },
  { id: "theatre", label: "Paper theatre", detail: "Move between acts on a small stage" },
  { id: "postcards", label: "Postcards", detail: "Browse a stack of project dispatches" },
] as const;

export type WorkVariant = (typeof workVariantOptions)[number]["id"];
export const defaultWorkVariant: WorkVariant = "lift";

export function isWorkVariant(value: unknown): value is WorkVariant {
  return workVariantOptions.some((option) => option.id === value);
}
