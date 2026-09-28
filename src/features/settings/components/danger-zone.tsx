"use client";

import { Download, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Spinner } from "@/components/shared/states";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccountAction } from "@/features/settings/actions";
import { PasswordInput } from "@/features/auth/components/password-input";
import { idleState } from "@/lib/actions";
import { DELETE_CONFIRMATION } from "@/lib/validation/settings";

export function ExportDataButton() {
  return (
    <Button asChild variant="outline">
      <a href="/api/account/export" download>
        <Download /> Download my data
      </a>
    </Button>
  );
}

export function DeleteAccountDialog() {
  const [state, action, pending] = useActionState(deleteAccountAction, idleState);
  const [confirmation, setConfirmation] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 /> Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="space-y-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your profile, every practice session, recording, transcript,
              report and achievement. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="password">Your password</Label>
            <PasswordInput id="password" name="password" autoComplete="current-password" required />
            {errors.password?.map((e) => (
              <p key={e} role="alert" className="text-sm text-destructive">
                {e}
              </p>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-semibold">{DELETE_CONFIRMATION}</span> to confirm
            </Label>
            <Input
              id="confirmation"
              name="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              required
            />
            {errors.confirmation?.map((e) => (
              <p key={e} role="alert" className="text-sm text-destructive">
                {e}
              </p>
            ))}
          </div>
          {state.status === "error" && state.message && !Object.keys(errors).length ? (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Keep my account</AlertDialogCancel>
            <Button
              type="submit"
              variant="destructive"
              disabled={pending || confirmation !== DELETE_CONFIRMATION}
            >
              {pending ? <Spinner label="Deleting" /> : null}
              Permanently delete
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
