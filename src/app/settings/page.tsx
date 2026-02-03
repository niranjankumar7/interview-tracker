"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Upload, TriangleAlert } from "lucide-react";
import { z } from "zod";

import { storeBackupSchema, type StoreBackup } from "@/lib/backup-schema";
import { useStore } from "@/lib/store";
import type { Application, Question, Sprint, UserProgress } from "@/types";

type ImportMode = "replace" | "merge";

const BACKUP_VERSION = 1 as const;

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
  const existingValid = Number.isFinite(existingTime);
  const incomingValid = Number.isFinite(incomingTime);

  const base =
    !existingValid && incomingValid
      ? incoming
      : existingValid && !incomingValid
        ? existing
        : !existingValid && !incomingValid
          ? existing
          : incomingTime >= existingTime
            ? incoming
            : existing;

  return {
    currentStreak: Math.max(existing.currentStreak, incoming.currentStreak),
    longestStreak: Math.max(existing.longestStreak, incoming.longestStreak),
    lastActiveDate: base.lastActiveDate,
    totalTasksCompleted: Math.max(
      existing.totalTasksCompleted,
      incoming.totalTasksCompleted,
    ),
  };
}

function formatZodError(error: z.ZodError): string {
  const maxIssues = 8;
  const lines = error.issues.slice(0, maxIssues).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `• ${path}: ${issue.message}`;
  });

  const moreIssues =
    error.issues.length > maxIssues
      ? `\n…and ${error.issues.length - maxIssues} more issue(s).`
      : "";

  return `Backup format mismatch. Please use a backup exported from this app.\n${lines.join(
    "\n",
  )}${moreIssues}`;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not read the selected file as text."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsText(file);
  });
}

export default function SettingsPage() {
  const resetData = useStore((s) => s.resetData);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const resetCancelButtonRef = useRef<HTMLButtonElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const [pendingImport, setPendingImport] = useState<
    | { backup: StoreBackup; mode: ImportMode }
    | null
  >(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "success"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);

  useEffect(() => {
    if (isResetModalOpen) resetCancelButtonRef.current?.focus();
  }, [isResetModalOpen]);

  useEffect(() => {
    if (pendingImport) importCancelButtonRef.current?.focus();
  }, [pendingImport]);

  const applications = useStore((s) => s.applications);
  const sprints = useStore((s) => s.sprints);
  const questions = useStore((s) => s.questions);
  const completedTopics = useStore((s) => s.completedTopics);
  const progress = useStore((s) => s.progress);

  const exportData = () => {
    const rawBackup: StoreBackup = {
      version: BACKUP_VERSION,
      applications,
      sprints,
      questions,
      completedTopics,
      progress,
    };

    let backup: StoreBackup;
    try {
      backup = storeBackupSchema.parse(rawBackup);
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? `Export failed: local data is invalid.\n${formatZodError(error)}`
          : "Export failed: local data is invalid.";
      setStatus({ kind: "error", message });
      return;
    }

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
      setStatus({ kind: "success", message: `Download started: ${filename}` });
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;

    try {
      applyImportedBackup(pendingImport.backup, pendingImport.mode);
      setStatus({
        kind: "success",
        message:
          pendingImport.mode === "replace"
            ? "Imported backup (replaced existing data)."
            : "Imported backup (merged with existing data).",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? `Import failed: ${error.message}`
          : "Import failed due to an unexpected error.";
      setStatus({ kind: "error", message });
    } finally {
      setPendingImport(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const applyImportedBackup = (backup: StoreBackup, mode: ImportMode) => {
    const completedTopics = backup.completedTopics;

    if (mode === "replace") {
      // Replace mode trusts the backup as-is.
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
    // `completedTopics` is treated as a set of unique identifiers (order-independent).
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

    const nameIsJson = selectedFile.name.toLowerCase().endsWith(".json");
    const typeIsJson = selectedFile.type
      ? selectedFile.type.toLowerCase().includes("json")
      : false;
    if (!nameIsJson && !typeIsJson) {
      setStatus({
        kind: "error",
        message: "Invalid file type. Please upload a .json backup file.",
      });
      return;
    }

    let parsedJson: unknown;
    try {
      const text = await readFileAsText(selectedFile);
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

    if (result.data.version !== BACKUP_VERSION) {
      setStatus({
        kind: "error",
        message: `Unsupported backup version: v${result.data.version}.`,
      });
      return;
    }

    setPendingImport({ backup: result.data, mode: importMode });
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
                Current data: {applications.length} applications, {sprints.length} sprints,
                {" "}
                {questions.length} questions.
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
                      data and upserts by id; items with matching ids can be
                      overwritten)
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

      {pendingImport && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Import data confirmation"
        >
          <div className="w-full max-w-md rounded-lg bg-white shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {pendingImport.mode === "replace" ? "Import and replace?" : "Import and merge?"}
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              {pendingImport.mode === "replace"
                ? "This will overwrite your existing data. This cannot be undone."
                : "This will merge the backup into your existing data. Items with matching ids can be overwritten. This cannot be undone."}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                ref={importCancelButtonRef}
                type="button"
                onClick={() => setPendingImport(null)}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className={`px-4 py-2 rounded-md text-white text-sm font-medium ${
                  pendingImport.mode === "replace"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
              >
                Import Data
              </button>
            </div>
          </div>
        </div>
      )}

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
                ref={resetCancelButtonRef}
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
