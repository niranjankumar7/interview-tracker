"use client";

import { PREP_TOPICS } from "@/lib/sprintGenerator";
import { useStore } from "@/lib/store";
import type { InterviewRound } from "@/types";
import { format, isAfter, parseISO, startOfDay } from "date-fns";
import { Calendar, Check, MessageSquareText, Star, Tag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type FeedbackDraft = {
  rating: number;
  prosText: string;
  consText: string;
  struggledTopics: string[];
  notes: string;
  questionsText: string;
};

type RoundDraft = {
  roundNumber: number;
  roundType: InterviewRound["roundType"];
  scheduledDate: string;
  notes: string;
  questionsText: string;
};

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToLines(value: string[]): string {
  return value.join("\n");
}

function roundIsInFuture(scheduledDate?: string): boolean {
  if (!scheduledDate) return false;
  try {
    return isAfter(startOfDay(parseISO(scheduledDate)), startOfDay(new Date()));
  } catch {
    return false;
  }
}

export function PrepDetailPanel(props: {
  applicationId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { applicationId, isOpen, onClose } = props;

  const application = useStore((s) =>
    applicationId ? s.applications.find((a) => a.id === applicationId) : undefined
  );
  const updateApplication = useStore((s) => s.updateApplication);

  const [feedbackRoundNumber, setFeedbackRoundNumber] = useState<number | null>(
    null
  );
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false);

  const [feedbackDraft, setFeedbackDraft] = useState<FeedbackDraft>({
    rating: 0,
    prosText: "",
    consText: "",
    struggledTopics: [],
    notes: "",
    questionsText: "",
  });

  const nextRoundNumber = useMemo(() => {
    if (!application || application.rounds.length === 0) return 1;
    return Math.max(...application.rounds.map((r) => r.roundNumber)) + 1;
  }, [application]);

  const [roundDraft, setRoundDraft] = useState<RoundDraft>({
    roundNumber: 1,
    roundType: "Technical",
    scheduledDate: "",
    notes: "",
    questionsText: "",
  });

  useEffect(() => {
    if (!isOpen) {
      setFeedbackRoundNumber(null);
      setIsAddRoundOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isAddRoundOpen) return;
    setRoundDraft((prev) => ({
      ...prev,
      roundNumber: nextRoundNumber,
      roundType: "Technical",
      scheduledDate: "",
      notes: "",
      questionsText: "",
    }));
  }, [isAddRoundOpen, nextRoundNumber]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (feedbackRoundNumber !== null) {
          setFeedbackRoundNumber(null);
          return;
        }
        if (isAddRoundOpen) {
          setIsAddRoundOpen(false);
          return;
        }
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [feedbackRoundNumber, isAddRoundOpen, isOpen, onClose]);

  const activeRound = useMemo(() => {
    if (!application || feedbackRoundNumber === null) return undefined;
    return application.rounds.find((r) => r.roundNumber === feedbackRoundNumber);
  }, [application, feedbackRoundNumber]);

  useEffect(() => {
    if (!activeRound) return;

    setFeedbackDraft({
      rating: activeRound.feedback?.rating ?? 0,
      prosText: listToLines(activeRound.feedback?.pros ?? []),
      consText: listToLines(activeRound.feedback?.cons ?? []),
      struggledTopics: activeRound.feedback?.struggledTopics ?? [],
      notes: activeRound.feedback?.notes ?? "",
      questionsText: listToLines(activeRound.questionsAsked ?? []),
    });
  }, [activeRound]);

  if (!isOpen || !applicationId) return null;
  if (!application) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {application.company}
            </h2>
            <p className="text-sm text-gray-500">{application.role}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Interview rounds</h3>
            <button
              onClick={() => setIsAddRoundOpen(true)}
              className="text-sm px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              type="button"
            >
              Add round
            </button>
          </div>

          {application.rounds.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-4">
              No rounds tracked yet.
            </div>
          ) : (
            <div className="space-y-4">
              {application.rounds
                .slice()
                .sort((a, b) => a.roundNumber - b.roundNumber)
                .map((round) => {
                  const isFuture = roundIsInFuture(round.scheduledDate);
                  const hasFeedback = Boolean(round.feedback);
                  const feedbackButtonLabel = hasFeedback
                    ? "Edit feedback"
                    : "Complete round";

                  return (
                    <div
                      key={round.roundNumber}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-800">
                              Round {round.roundNumber}
                            </h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {round.roundType}
                            </span>
                          </div>

                          {round.scheduledDate && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {format(parseISO(round.scheduledDate), "MMM d, yyyy")}
                              {isFuture && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  upcoming
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setFeedbackRoundNumber(round.roundNumber)}
                          disabled={isFuture}
                          title={
                            isFuture
                              ? "Feedback can be added after the scheduled date"
                              : undefined
                          }
                          className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                            isFuture
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : hasFeedback
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "bg-emerald-600 text-white hover:bg-emerald-700"
                          }`}
                        >
                          {feedbackButtonLabel}
                        </button>
                      </div>

                      {(round.notes || round.questionsAsked.length > 0) && (
                        <div className="mt-4 space-y-3">
                          {round.notes && (
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Round notes:</span>{" "}
                              {round.notes}
                            </div>
                          )}

                          {round.questionsAsked.length > 0 && (
                            <div className="text-sm text-gray-700">
                              <div className="font-medium flex items-center gap-2 mb-1">
                                <MessageSquareText className="w-4 h-4 text-gray-500" />
                                Questions remembered
                              </div>
                              <ul className="list-disc pl-5 space-y-1">
                                {round.questionsAsked.map((q, i) => (
                                  <li key={`${round.roundNumber}-${i}`}>{q}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {round.feedback && (
                        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-800">
                                Feedback
                              </span>
                              <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, idx) => (
                                  <Star
                                    key={idx}
                                    className={`w-4 h-4 ${
                                      idx < round.feedback!.rating
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {round.feedback.pros.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-1">
                                What went well
                              </div>
                              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                                {round.feedback.pros.map((p, i) => (
                                  <li key={`${round.roundNumber}-pro-${i}`}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {round.feedback.cons.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-1">
                                What needs improvement
                              </div>
                              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                                {round.feedback.cons.map((c, i) => (
                                  <li key={`${round.roundNumber}-con-${i}`}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {round.feedback.struggledTopics.length > 0 && (
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <Tag className="w-4 h-4 text-gray-500" />
                                Struggled topics
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {round.feedback.struggledTopics.map((t) => (
                                  <span
                                    key={`${round.roundNumber}-topic-${t}`}
                                    className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {round.feedback.notes && (
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-1">
                                Notes
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {round.feedback.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Add Round Modal */}
        {isAddRoundOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) setIsAddRoundOpen(false);
            }}
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Add interview round
                </h3>
                <button
                  onClick={() => setIsAddRoundOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Close"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Round number
                    </label>
                    <input
                      type="number"
                      value={roundDraft.roundNumber}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Round type
                    </label>
                    <select
                      value={roundDraft.roundType}
                      onChange={(e) =>
                        setRoundDraft((prev) => ({
                          ...prev,
                          roundType: e.target.value as InterviewRound["roundType"],
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                    >
                      <option value="Technical">Technical</option>
                      <option value="HR">HR</option>
                      <option value="Managerial">Managerial</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled date (optional)
                  </label>
                  <input
                    type="date"
                    value={roundDraft.scheduledDate}
                    onChange={(e) =>
                      setRoundDraft((prev) => ({
                        ...prev,
                        scheduledDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={roundDraft.notes}
                    onChange={(e) =>
                      setRoundDraft((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Questions you remember (one per line)
                  </label>
                  <textarea
                    rows={4}
                    value={roundDraft.questionsText}
                    onChange={(e) =>
                      setRoundDraft((prev) => ({
                        ...prev,
                        questionsText: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddRoundOpen(false)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const scheduledDate = roundDraft.scheduledDate
                        ? new Date(roundDraft.scheduledDate).toISOString()
                        : undefined;

                      const newRound: InterviewRound = {
                        roundNumber: roundDraft.roundNumber,
                        roundType: roundDraft.roundType,
                        scheduledDate,
                        notes: roundDraft.notes,
                        questionsAsked: linesToList(roundDraft.questionsText),
                      };

                      updateApplication(application.id, { rounds: [newRound] });
                      setIsAddRoundOpen(false);
                    }}
                    className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                  >
                    Save round
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Modal */}
        {activeRound && (
          <div
            className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              if (e.target === e.currentTarget) setFeedbackRoundNumber(null);
            }}
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {activeRound.feedback ? "Edit feedback" : "Complete round"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Round {activeRound.roundNumber} · {activeRound.roundType}
                  </p>
                </div>
                <button
                  onClick={() => setFeedbackRoundNumber(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Close"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const ratingValue = idx + 1;
                      const isActive = ratingValue <= feedbackDraft.rating;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setFeedbackDraft((prev) => ({
                              ...prev,
                              rating: ratingValue,
                            }))
                          }
                          className="p-1"
                          aria-label={`Set rating to ${ratingValue}`}
                        >
                          <Star
                            className={`w-6 h-6 ${
                              isActive
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-gray-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                    {feedbackDraft.rating > 0 && (
                      <span className="ml-2 text-sm text-gray-600">
                        {feedbackDraft.rating}/5
                      </span>
                    )}
                  </div>
                  {feedbackDraft.rating === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Select 1-5 stars to save.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What went well (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackDraft.prosText}
                    onChange={(e) =>
                      setFeedbackDraft((prev) => ({
                        ...prev,
                        prosText: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What needs improvement (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackDraft.consText}
                    onChange={(e) =>
                      setFeedbackDraft((prev) => ({
                        ...prev,
                        consText: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-600 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Struggled topics
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PREP_TOPICS.map((topic) => {
                      const selected = feedbackDraft.struggledTopics.includes(topic);
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() =>
                            setFeedbackDraft((prev) => ({
                              ...prev,
                              struggledTopics: selected
                                ? prev.struggledTopics.filter((t) => t !== topic)
                                : [...prev.struggledTopics, topic],
                            }))
                          }
                          className={`text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                            selected
                              ? "bg-yellow-100 border-yellow-300 text-yellow-900"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {selected && <Check className="w-3 h-3" />}
                          {topic}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackDraft.notes}
                    onChange={(e) =>
                      setFeedbackDraft((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Questions you remember (one per line)
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackDraft.questionsText}
                    onChange={(e) =>
                      setFeedbackDraft((prev) => ({
                        ...prev,
                        questionsText: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackRoundNumber(null)}
                    className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const rating = Math.max(1, Math.min(5, feedbackDraft.rating));
                      updateApplication(application.id, {
                        rounds: [
                          {
                            ...activeRound,
                            questionsAsked: linesToList(feedbackDraft.questionsText),
                            feedback: {
                              rating,
                              pros: linesToList(feedbackDraft.prosText),
                              cons: linesToList(feedbackDraft.consText),
                              struggledTopics: feedbackDraft.struggledTopics,
                              notes: feedbackDraft.notes,
                            },
                          },
                        ],
                      });

                      setFeedbackRoundNumber(null);
                    }}
                    disabled={feedbackDraft.rating === 0}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      feedbackDraft.rating === 0
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    Save feedback
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof window !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
