"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function RetrySurahButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="primary"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {isPending ? "Retrying..." : "Try again"}
    </Button>
  );
}