"use client";

import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { AppHeader } from "@/components/layout/AppHeader";

export default function ChatPage() {
  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background h-screen">
      <AppHeader />

      <main className="flex-1 overflow-hidden">
        <div className="h-full">
          <MessageThreadFull />
        </div>
      </main>
    </div>
  );
}
