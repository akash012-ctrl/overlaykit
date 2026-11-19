import type { ReactNode } from 'react';

/** Reserved for spec D (R17). Renders nothing and takes no space unless a control is passed. `ui` imports no `speech` here. */
export function SpeakSlot({ control }: { control?: ReactNode }) {
  return control ?? null;
}