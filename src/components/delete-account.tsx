"use client";

import { useFormStatus } from "react-dom";
import { deleteAccount } from "@/app/account/actions";
import { Button } from "@/components/ui/button";

// Deletes the account after a confirm, since nothing can be restored.
export function DeleteAccount({ description }: { description: string }) {
  return (
    <form
      action={deleteAccount}
      onSubmit={(event) => {
        if (!confirm("Delete your account and everything in it? This can't be undone.")) event.preventDefault();
      }}
      className="flex flex-col items-start gap-1.5"
    >
      <p className="text-sm text-muted-foreground">{description}</p>
      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="link" className="h-auto px-0 text-destructive" disabled={pending}>
      {pending ? "Deleting…" : "Delete my account"}
    </Button>
  );
}
