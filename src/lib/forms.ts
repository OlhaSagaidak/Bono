export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  // Echoed back on validation errors: React resets a form after its action
  // runs, and these become the new defaults so the person doesn't retype.
  values?: Record<string, string | string[]>;
};

export const textValue = (state: FormState, name: string): string | undefined => {
  const v = state.values?.[name];
  return typeof v === "string" ? v : undefined;
};

export const listValue = (state: FormState, name: string): string[] | undefined => {
  const v = state.values?.[name];
  return Array.isArray(v) ? v : undefined;
};

export const formText = (formData: FormData, name: string) => String(formData.get(name) ?? "");
