"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import {
  formatOfferTotalCTC,
  getOfferCurrency,
  parseEquityField,
  parseNumberField,
  sanitizeCompanyName,
} from "@/lib/offer-details";
import type { Application, OfferDetails, WorkMode } from "@/types";
import { useTamboComponentState } from "@tambo-ai/react";
import { Building2, CheckCircle2, Briefcase } from "lucide-react";
import { z } from "zod";

export const offerDetailsPanelSchema = z.object({
  applicationId: z
    .string()
    .optional()
    .describe("If known, attach offer to this application"),
  panelId: z
    .string()
    .optional()
    .describe("Unique panel id to prevent state collisions"),
  company: z
    .string()
    .optional()
    .describe("Company name (used to find which application to attach the offer to)"),
  totalCTC: z
    .number()
    .optional()
    .describe("Total annual compensation (CTC), if provided as a single number"),
  baseSalary: z.number().optional().describe("Base salary"),
  bonus: z.number().optional().describe("Annual bonus"),
  equity: z
    .union([z.number(), z.string()])
    .optional()
    .describe("Equity details (number or description, e.g. '10k RSUs')"),
  currency: z
    .string()
    .optional()
    .describe("Currency code or label (defaults to INR)")
    .default("INR"),
  workMode: z
    .enum(["WFH", "Hybrid", "Office"])
    .optional()
    .describe("Work mode"),
  location: z.string().optional().describe("Location"),
  joiningDate: z.string().optional().describe("Joining date (YYYY-MM-DD)"),
  noticePeriod: z.string().optional().describe("Notice period"),
  benefits: z.array(z.string()).optional().describe("Benefits/perks list"),
  notes: z.string().optional().describe("Any additional notes"),
});

type OfferDetailsPanelProps = z.infer<typeof offerDetailsPanelSchema>;

type OfferDetailsPanelState = OfferDetailsPanelProps & {
  selectedApplicationId?: string;
  isSaved: boolean;
  isSaving: boolean;
};

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildOfferDetailsFromState(state: OfferDetailsPanelProps): OfferDetails {
  return {
    totalCTC: state.totalCTC,
    baseSalary: state.baseSalary,
    bonus: state.bonus,
    equity: state.equity,
    currency: state.currency,
    workMode: state.workMode,
    location: state.location,
    joiningDate: state.joiningDate,
    noticePeriod: state.noticePeriod,
    benefits: state.benefits,
    notes: state.notes,
  };
}

export function OfferDetailsPanel(props: OfferDetailsPanelProps) {
  const initialCompany = props.company;
  const panelNonce = useMemo(() => createId(), []);
  const componentId = useMemo(() => {
    const stableKey = props.panelId || props.applicationId;
    const slugRaw = stableKey || initialCompany || "unknown";
    const slug = sanitizeCompanyName(slugRaw).toLowerCase() || "unknown";
    return stableKey
      ? `offer-details-panel:${slug}`
      : `offer-details-panel:${slug}:${panelNonce}`;
  }, [initialCompany, panelNonce, props.applicationId, props.panelId]);

  const [state, setState] = useTamboComponentState<OfferDetailsPanelState>(componentId, {
    ...props,
    currency: props.currency || "INR",
    selectedApplicationId: props.applicationId,
    isSaved: false,
    isSaving: false,
  });

  const applications = useStore((s) => s.applications);
  const addApplication = useStore((s) => s.addApplication);
  const updateApplication = useStore((s) => s.updateApplication);

  const normalizedCompany = state?.company ? sanitizeCompanyName(state.company) : "";

  const companyMatches = useMemo(() => {
    if (!normalizedCompany) return [];
    const normalizedLower = normalizedCompany.toLowerCase();
    return applications.filter(
      (a) => sanitizeCompanyName(a.company).toLowerCase() === normalizedLower
    );
  }, [applications, normalizedCompany]);

  const resolvedApplicationId = useMemo(() => {
    if (!state) return undefined;
    if (state.selectedApplicationId === "__new__") return undefined;
    if (state.selectedApplicationId) return state.selectedApplicationId;
    if (companyMatches.length === 1) return companyMatches[0]?.id;
    return undefined;
  }, [companyMatches, state]);

  const existingApplication = useMemo(() => {
    if (!resolvedApplicationId) return null;
    return applications.find((a) => a.id === resolvedApplicationId) ?? null;
  }, [applications, resolvedApplicationId]);

  const needsApplicationSelection =
    companyMatches.length > 1 &&
    (state?.selectedApplicationId === undefined || state.selectedApplicationId === "");

  const offerDetails = state ? buildOfferDetailsFromState(state) : undefined;
  const offerTotalLabel = formatOfferTotalCTC(offerDetails) ?? "—";

  if (!state) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg max-w-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-2/3 mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!normalizedCompany || state.isSaving || needsApplicationSelection) return;
    setState({ ...state, isSaving: true });

    try {
      const nextOffer = buildOfferDetailsFromState({
        ...state,
        currency: state.currency || "INR",
      });

      if (existingApplication && state.selectedApplicationId !== "__new__") {
        updateApplication(existingApplication.id, {
          status: "offer",
          offerDetails: nextOffer,
        });
      } else {
        const now = new Date().toISOString();
        const application: Application = {
          id: createId(),
          company: normalizedCompany,
          role: "Software Engineer",
          status: "offer",
          applicationDate: now,
          rounds: [],
          notes: "",
          offerDetails: nextOffer,
          createdAt: now,
        };

        addApplication(application);
      }

      setState({ ...state, isSaved: true, isSaving: false });
    } catch (error) {
      console.error("Error saving offer details:", error);
      setState({ ...state, isSaving: false });
    }
  };

  if (state.isSaved) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-lg max-w-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-100 rounded-full">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-green-800">Offer saved</h3>
            <p className="text-sm text-green-700">
              {normalizedCompany} • {offerTotalLabel}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          You can compare offers on the Dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg max-w-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-emerald-100 rounded-full">
          <Briefcase className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-800">Offer details</h3>
          <p className="text-sm text-gray-500">
            Review and save the compensation/perks for comparison
          </p>
        </div>
      </div>

      <div className="text-sm text-emerald-800 mb-4">
        Total CTC: <span className="font-semibold">{offerTotalLabel}</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Building2 className="w-4 h-4" />
            Company
          </label>
          <input
            type="text"
            value={state.company ?? ""}
            onChange={(e) =>
              setState({
                ...state,
                company: e.target.value,
                selectedApplicationId: undefined,
              })
            }
            placeholder="e.g., Google"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
          {existingApplication ? (
            <p className="text-xs text-gray-500 mt-1">
              Saving into existing application: {existingApplication.company}
            </p>
          ) : companyMatches.length > 1 ? (
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Multiple applications found — select one
              </label>
              <select
                value={state.selectedApplicationId ?? ""}
                onChange={(e) =>
                  setState({
                    ...state,
                    selectedApplicationId: e.target.value || undefined,
                  })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
              >
                <option value="">Select…</option>
                {companyMatches.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.role} • {app.status}
                  </option>
                ))}
                <option value="__new__">Create new application</option>
              </select>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <input
              type="text"
              value={state.currency ?? ""}
              onChange={(e) => setState({ ...state, currency: e.target.value })}
              placeholder={getOfferCurrency(offerDetails)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Work mode</label>
            <select
              value={state.workMode ?? ""}
              onChange={(e) =>
                setState({
                  ...state,
                  workMode: e.target.value ? (e.target.value as WorkMode) : undefined,
                })
              }
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-white"
            >
              <option value="">Select…</option>
              <option value="WFH">WFH</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Office">Office</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total CTC</label>
            <input
              type="number"
              value={state.totalCTC ?? ""}
              onChange={(e) => setState({ ...state, totalCTC: parseNumberField(e.target.value) })}
              placeholder="e.g., 18"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              value={state.location ?? ""}
              onChange={(e) => setState({ ...state, location: e.target.value })}
              placeholder="e.g., Bangalore"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Base salary</label>
            <input
              type="number"
              value={state.baseSalary ?? ""}
              onChange={(e) => setState({ ...state, baseSalary: parseNumberField(e.target.value) })}
              placeholder="e.g., 14"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bonus</label>
            <input
              type="number"
              value={state.bonus ?? ""}
              onChange={(e) => setState({ ...state, bonus: parseNumberField(e.target.value) })}
              placeholder="e.g., 2"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Equity</label>
          <input
            type="text"
            value={state.equity === undefined ? "" : String(state.equity)}
            onChange={(e) => setState({ ...state, equity: parseEquityField(e.target.value) })}
            placeholder="e.g., 10k RSUs"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Joining date</label>
            <input
              type="date"
              value={state.joiningDate ?? ""}
              onChange={(e) => setState({ ...state, joiningDate: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notice period</label>
            <input
              type="text"
              value={state.noticePeriod ?? ""}
              onChange={(e) => setState({ ...state, noticePeriod: e.target.value })}
              placeholder="e.g., 30 days"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Benefits</label>
          <textarea
            value={(state.benefits ?? []).join("\n")}
            onChange={(e) =>
              setState({
                ...state,
                benefits: e.target.value
                  .split(/\n|,/)
                  .map((b) => b.trim())
                  .filter(Boolean),
              })
            }
            rows={3}
            placeholder="One per line (or comma-separated)"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={state.notes ?? ""}
            onChange={(e) => setState({ ...state, notes: e.target.value })}
            rows={3}
            placeholder="Any extra context"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!normalizedCompany || state.isSaving || needsApplicationSelection}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {state.isSaving ? "Saving..." : "Save offer details"}
        </button>
      </div>
    </div>
  );
}
