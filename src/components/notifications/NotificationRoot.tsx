"use client";

import { Toaster } from "sonner";
import { NotificationManager } from "./NotificationManager";

export function NotificationRoot() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <NotificationManager />
    </>
  );
}
