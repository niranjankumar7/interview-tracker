"use client";

import { QuestionBankView } from "@/components/pipeline";
import { AppHeader } from "@/components/layout/AppHeader";

export default function QuestionsPage() {
    return (
        <div className="flex flex-1 min-h-0 flex-col bg-background h-screen">
            <AppHeader />

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">
                <QuestionBankView />
            </main>
        </div>
    );
}
