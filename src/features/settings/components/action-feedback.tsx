"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/actions";

/** Surfaces a server action's success/error message as a toast. */
export function useActionToast(state: ActionState) {
  const last = useRef<ActionState | null>(null);
  useEffect(() => {
    if (state === last.current || !state.message) return;
    last.current = state;
    if (state.status === "success") toast.success(state.message);
    else if (state.status === "error") toast.error(state.message);
  }, [state]);
}
