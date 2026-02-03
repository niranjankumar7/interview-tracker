"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Upload, TriangleAlert } from "lucide-react";
import { z } from "zod";

import { storeBackupSchema, type StoreBackup } from "@/lib/backup-schema";
import { useStore } from "@/lib/store";
import type { Application, Question, Sprint, UserProgress } from "@/types";

type ImportMode = "replace" | "merge";

function upsertById<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of existing) byId.set(item.id, item);
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values());
}

function mergeProgress(existing: UserProgress, incoming: UserProgress): UserProgress {
  const existingTime = Date.parse(existing.lastActiveDate);
  const incomingTime = Date.parse(incoming.lastActiveDate);
  const hasIncomingNewer =
    Number.isFinite(incomingTime) &&
    (!Number.isFinite(existingTime) || incomingTime >= existingTime);

  return hasIncomingNewer ? incoming : existing;
}

function formatZodError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });

  return `Backup format mismatch:\n${lines.join("\n")}`;
}

export default function SettingsPage() {
  const resetData = useStore((s) => s.resetData);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);

  const applicationsCount = useStore((s) => s.applications.length);
  const sprintsCount = useStore((s) => s.sprints.length);
  const questionsCount = useStore((s) => s.questions.length);

  const exportData = () => {
    const { applications, sprints, questions, completedTopics, progress } =
      useStore.getState();
    const backup: StoreBackup = {
      version: 1,
      applications,
      sprints,
      questions,
      completedTopics,
      progress,
    };

    const date = new Date().toISOString().slice(0, 10);
    const filename = `interview-tracker-backup-${date}.json`;
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus({ kind: "success", message: `Exported backup as ${filename}` });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  const applyImportedBackup = (backup: StoreBackup, mode: ImportMode) => {
    const completedTopics = backup.completedTopics ?? [];

    if (mode === "replace") {
      useStore.setState({
        applications: backup.applications,
        sprints: backup.sprints,
        questions: backup.questions,
        completedTopics,
        progress: backup.progress,
      });
      return;
    }

    const existing = useStore.getState();
    const mergedApplications = upsertById<Application>(
      existing.applications,
      backup.applications,
    );
    const mergedSprints = upsertById<Sprint>(existing.sprints, backup.sprints);
    const mergedQuestions = upsertById<Question>(
      existing.questions,
      backup.questions,
    );
    const mergedCompletedTopics = Array.from(
      new Set([...existing.completedTopics, ...completedTopics]),
    );
    const mergedProgress = mergeProgress(existing.progress, backup.progress);

    useStore.setState({
      applications: mergedApplications,
      sprints: mergedSprints,
      questions: mergedQuestions,
      completedTopics: mergedCompletedTopics,
      progress: mergedProgress,
    });
  };

  const importData = async () => {
    if (!selectedFile) {
      setStatus({ kind: "error", message: "Select a .json file to import." });
      return;
    }

    if (
      selectedFile.type &&
      selectedFile.type !== "application/json" &&
      !selectedFile.name.toLowerCase().endsWith(".json")
    ) {
      setStatus({
        kind: "error",
        message: "Invalid file type. Please upload a .json backup file.",
      });
      return;
    }

    const reader = new FileReader();

    const readText = new Promise<string>((resolve, reject) => {
      reader.onerror = () => reject(new Error("Could not read the selected file."));
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Could not read the selected file as text."));
          return;
        }
        resolve(reader.result);
      };
      reader.readAsText(selectedFile);
    });

    let parsedJson: unknown;
    try {
      const text = await readText;
      parsedJson = JSON.parse(text);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid JSON file. Please upload a valid backup.";
      setStatus({ kind: "error", message });
      return;
    }

    const result = storeBackupSchema.safeParse(parsedJson);
    if (!result.success) {
      setStatus({ kind: "error", message: formatZodError(result.error) });
      return;
    }

    if (importMode === "replace") {
      const confirmed = window.confirm(
        "Importing in Replace mode will overwrite your existing data. This cannot be undone. Continue?",
      );
      if (!confirmed) return;
    }

    applyImportedBackup(result.data, importMode);
    setStatus({
      kind: "success",
      message:
        importMode === "replace"
          ? "Imported backup (replaced existing data)."
          : "Imported backup (merged with existing data).",
    });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div>
            <h1 className="font-bold text-gray-800">Settings</h1>
            <p className="text-xs text-gray-500">Manage your local data backup</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 sm:p-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            Data Management
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Backup, restore, or clear your locally stored tracker data.
          </p>

          <div className="grid gap-6">
            <section className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">Export</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Download a JSON backup of your applications, sprints, and
                    questions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportData}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Current data: {applicationsCount} applications, {sprintsCount} sprints,
                {" "}
                {questionsCount} questions.
              </p>
            </section>

            <section className="rounded-lg border border-gray-200 p-4">
              <h3 className="font-medium text-gray-900">Import</h3>
              <p className="text-sm text-gray-600 mt-1">
                Restore data from a backup file. Replace is recommended.
              </p>

              <div className="mt-4 grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Backup file (.json)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setSelectedFile(file);
                      setStatus(null);
                    }}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {selectedFile && (
                    <p className="text-xs text-gray-500">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium text-gray-700">
                    Import mode
                  </legend>
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === "replace"}
                      onChange={() => setImportMode("replace")}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">Replace</span> (overwrites
                      existing data)
                    </span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === "merge"}
                      onChange={() => setImportMode("merge")}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">Merge</span> (keeps existing
                      data and upserts by id)
                    </span>
                  </label>
                </fieldset>

                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs text-gray-500">
                    Imported files are validated before applying.
                  </p>
                  <button
                    type="button"
                    onClick={importData}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!selectedFile}
                  >
                    <Upload className="w-4 h-4" />
                    Import Data
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-red-200 bg-red-50 p-4">
              <h3 className="font-medium text-red-900">Danger Zone</h3>
              <p className="text-sm text-red-700 mt-1">
                Clear all locally stored data. This cannot be undone.
              </p>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <TriangleAlert className="w-4 h-4" />
                Reset All Data
              </button>
            </section>

            {status && (
              <div
                className={`rounded-md border p-3 text-sm whitespace-pre-wrap ${
                  status.kind === "success"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
                role="status"
                aria-live="polite"
              >
                {status.message}
              </div>
            )}
          </div>
        </div>
      </main>

      {isResetModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reset all data confirmation"
        >
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Are you sure?
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              This cannot be undone. Your applications, sprints, and questions
              will be permanently removed from this browser.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetData();
                  setIsResetModalOpen(false);
                  setStatus({ kind: "success", message: "All data reset." });
                }}
                className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
