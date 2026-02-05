"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { Calendar, Check, Info, X } from "lucide-react";
import type { CalendarInterviewSuggestion } from "@/types";
import { isValidCompanyName } from "@/lib/calendar-sync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ConfirmOverrides = {
  company?: string;
  role?: string;
  interviewDate?: string;
  createSprint?: boolean;
};

type CalendarSyncReviewModalProps = {
  isOpen: boolean;
  suggestions: CalendarInterviewSuggestion[];
  onClose: () => void;
  onConfirm: (id: string, overrides: ConfirmOverrides) => void;
  onDismiss: (id: string) => void;
};

function toInputDate(value: string): string {
  try {
    const parsed = parseISO(value);
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, "yyyy-MM-dd");
    }
  } catch {
    // fall through
  }
  return value.slice(0, 10);
}

function toIsoDate(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function SuggestionCard({
  suggestion,
  onConfirm,
  onDismiss,
}: {
  suggestion: CalendarInterviewSuggestion;
  onConfirm: (id: string, overrides: ConfirmOverrides) => void;
  onDismiss: (id: string) => void;
}) {
  const [company, setCompany] = useState(suggestion.company);
  const [role, setRole] = useState(suggestion.role ?? "");
  const [date, setDate] = useState(toInputDate(suggestion.interviewDate));
  const [createSprint, setCreateSprint] = useState(true);

  useEffect(() => {
    setCompany(suggestion.company);
    setRole(suggestion.role ?? "");
    setDate(toInputDate(suggestion.interviewDate));
    setCreateSprint(true);
  }, [suggestion.id, suggestion.company, suggestion.interviewDate, suggestion.role]);

  const interviewIso = toIsoDate(date);
  const companyValue = company.trim();
  const canConfirm =
    isValidCompanyName(companyValue) && Boolean(interviewIso);
  const parsedInterviewDate = parseISO(suggestion.interviewDate);
  const interviewLabel = Number.isNaN(parsedInterviewDate.getTime())
    ? suggestion.interviewDate.slice(0, 10)
    : format(parsedInterviewDate, "MMM d, yyyy");

  return (
    <div className="border border-border rounded-xl p-4 space-y-4 bg-background">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {suggestion.title}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {interviewLabel}
            {" · "}
            Confidence: {suggestion.confidence}
          </div>
        </div>
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="text-muted-foreground hover:text-foreground"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5" />
        <span>{suggestion.reason}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Company</Label>
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
          />
        </div>
        <div className="space-y-1">
          <Label>Role</Label>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (optional)"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 items-center">
        <div className="space-y-1">
          <Label>Interview date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Create prep sprint</p>
            <p className="text-xs text-muted-foreground">
              Auto-build a study plan from this date.
            </p>
          </div>
          <Switch checked={createSprint} onCheckedChange={setCreateSprint} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => onDismiss(suggestion.id)}>
          Dismiss
        </Button>
        <Button
          disabled={!canConfirm}
          onClick={() =>
            onConfirm(suggestion.id, {
              company: companyValue,
              role,
              interviewDate: interviewIso,
              createSprint,
            })
          }
        >
          <Check className="h-4 w-4" />
          Confirm interview
        </Button>
      </div>
    </div>
  );
}

export function CalendarSyncReviewModal({
  isOpen,
  suggestions,
  onClose,
  onConfirm,
  onDismiss,
}: CalendarSyncReviewModalProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof document === "undefined") return;
    setPortalTarget(document.body);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof document === "undefined") return;

    const active = document.activeElement;
    previousFocusRef.current = active instanceof HTMLElement ? active : null;

    return () => {
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
  }, [isOpen, portalTarget]);

  if (!isOpen || !portalTarget) return null;

  const pending = suggestions.filter((s) => s.status === "pending");

  const modal = (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              Confirm calendar interviews
            </h2>
            <p className="text-sm text-muted-foreground">
              We found {pending.length} interview{pending.length === 1 ? "" : "s"} in your calendar.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            ref={closeButtonRef}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {pending.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No pending interview events.
            </div>
          ) : (
            pending.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onConfirm={onConfirm}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalTarget);
}
