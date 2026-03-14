"use client";

import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import type { InterviewRoundType, RoleType } from "@/types";
import { format, parseISO } from "date-fns";
import { 
  Sparkles, 
  Globe, 
  FileText, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  ExternalLink,
  Lightbulb,
  Target
} from "lucide-react";

// Types for scraped data
interface ScrapedRoundInfo {
  roundType: string;
  description: string;
  topics: string[];
  tips: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

interface ScrapedCompanyData {
  company: string;
  role: string;
  rounds: ScrapedRoundInfo[];
  generalTips: string[];
  source: string;
  fetchedAt: string;
}

interface RoundPrepInput {
  roundNumber: number;
  roundType: InterviewRoundType;
  scheduledDate?: string;
  hrInfo?: string;
  focusAreas?: string[];
}

interface PrepRecommendation {
  type: 'hr_provided' | 'scraped' | 'resume_based' | 'generic';
  title: string;
  description: string;
  resources?: string[];
  topics?: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface RoundSpecificPrepPanelProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RoundSpecificPrepPanel({ 
  applicationId, 
  isOpen, 
  onClose 
}: RoundSpecificPrepPanelProps) {
  const application = useStore((s) =>
    s.applications.find((a) => a.id === applicationId)
  );
  const createInterviewRoundAPI = useStore((s) => s.createInterviewRoundAPI);

  const [step, setStep] = useState<'input' | 'loading' | 'results'>('input');
  const [roundInput, setRoundInput] = useState<RoundPrepInput>({
    roundNumber: 1,
    roundType: 'TechnicalRound1',
  });
  const [hrNotes, setHrNotes] = useState('');
  const [resumeFocus, setResumeFocus] = useState<string[]>([]);
  const [scrapedData, setScrapedData] = useState<ScrapedCompanyData | null>(null);
  const [recommendations, setRecommendations] = useState<PrepRecommendation[]>([]);
  const [isScraping, setIsScraping] = useState(false);

  // Initialize round number based on existing rounds
  useEffect(() => {
    if (!application) return;
    const existingRounds = application.rounds?.length || 0;
    setRoundInput(prev => ({
      ...prev,
      roundNumber: existingRounds + 1,
    }));
  }, [application]);

  const scrapeCompanyData = useCallback(async () => {
    if (!application) return;
    
    setIsScraping(true);
    try {
      // Use the DuckDuckGo scraper service
      const { getCompanyPrepData } = await import('@/services/scraper/duckduckgo');
      
      const roleType: RoleType = (application.roleType as RoleType) || 'SDE';
      
      // Scrape for the specific round if we know it
      const data = await getCompanyPrepData(
        application.company,
        application.role,
        roleType,
        roundInput.roundType
      );

      // Transform scraped data into our format
      const transformed: ScrapedCompanyData = {
        company: application.company,
        role: application.role,
        rounds: [{
          roundType: roundInput.roundType,
          description: `Interview round for ${application.role}`,
          topics: data.recentQuestions.length > 0 
            ? ['Previous Questions Available', 'Company-Specific Tips']
            : ['General Prep Recommended'],
          tips: data.companyTips,
          difficulty: 'Medium',
        }],
        generalTips: data.companyTips,
        source: data.source,
        fetchedAt: data.fetchedAt,
      };

      setScrapedData(transformed);
    } catch (error) {
      console.error('Scraping failed:', error);
    } finally {
      setIsScraping(false);
    }
  }, [application, roundInput.roundType]);

  const generateRecommendations = useCallback(async () => {
    if (!application) return;

    const recs: PrepRecommendation[] = [];

    // 1. HR-provided info (highest priority)
    if (hrNotes.trim()) {
      recs.push({
        type: 'hr_provided',
        title: 'Based on HR Information',
        description: hrNotes,
        confidence: 'high',
      });
    }

    // 2. Resume-based focus areas
    if (resumeFocus.length > 0) {
      recs.push({
        type: 'resume_based',
        title: 'Resume-Based Preparation',
        description: `Focus on these areas from your resume: ${resumeFocus.join(', ')}`,
        topics: resumeFocus,
        confidence: 'high',
      });
    }

    // 3. Scraped company data
    if (scrapedData?.rounds[0]) {
      const round = scrapedData.rounds[0];
      recs.push({
        type: 'scraped',
        title: `Company Insights: ${application.company}`,
        description: `Found ${round.tips.length} tips from ${scrapedData.source}`,
        topics: round.topics,
        resources: round.tips,
        confidence: 'medium',
      });
    }

    // 4. Generic fallback based on round type
    const roundTypeRecs: Record<string, PrepRecommendation> = {
      'TechnicalRound1': {
        type: 'generic',
        title: 'Technical Round 1: DSA Focus',
        description: 'Typically focuses on data structures and algorithms',
        topics: ['Arrays', 'Strings', 'Hash Maps', 'Two Pointers', 'Sliding Window'],
        confidence: 'medium',
      },
      'TechnicalRound2': {
        type: 'generic',
        title: 'Technical Round 2: Advanced DSA',
        description: 'Usually harder problems, may include trees/graphs',
        topics: ['Trees', 'Graphs', 'Dynamic Programming', 'Backtracking'],
        confidence: 'medium',
      },
      'SystemDesign': {
        type: 'generic',
        title: 'System Design Round',
        description: 'Design scalable distributed systems',
        topics: ['Load Balancing', 'Caching', 'Databases', 'API Design', 'Scalability'],
        confidence: 'high',
      },
      'HR': {
        type: 'generic',
        title: 'HR/Behavioral Round',
        description: 'Culture fit and behavioral questions',
        topics: ['STAR Method', 'Leadership Principles', 'Conflict Resolution', 'Career Goals'],
        confidence: 'high',
      },
      'Managerial': {
        type: 'generic',
        title: 'Hiring Manager Round',
        description: 'Team fit, project discussion, and behavioral',
        topics: ['Project Deep Dive', 'Team Collaboration', 'System Design Basics'],
        confidence: 'medium',
      },
    };

    const genericRec = roundTypeRecs[roundInput.roundType];
    if (genericRec) {
      recs.push(genericRec);
    }

    setRecommendations(recs);
  }, [application, hrNotes, resumeFocus, scrapedData, roundInput.roundType]);

  const handleGeneratePrep = async () => {
    setStep('loading');
    
    // Scrape in parallel
    await scrapeCompanyData();
    
    // Generate recommendations
    await generateRecommendations();
    
    setStep('results');
  };

  const handleSaveRound = async () => {
    if (!application) return;

    await createInterviewRoundAPI(applicationId, {
      roundNumber: roundInput.roundNumber,
      roundType: roundInput.roundType,
      scheduledDate: roundInput.scheduledDate,
      notes: hrNotes,
    });

    onClose();
  };

  if (!isOpen || !application) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Round-Specific Prep</h2>
            <p className="text-sm text-muted-foreground">
              {application.company} — {application.role}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {step === 'input' && (
            <>
              {/* Round Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Which round is this?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'TechnicalRound1', label: 'Technical Round 1', icon: '💻' },
                    { value: 'TechnicalRound2', label: 'Technical Round 2', icon: '💻' },
                    { value: 'SystemDesign', label: 'System Design', icon: '🏗️' },
                    { value: 'HR', label: 'HR/Behavioral', icon: '👥' },
                    { value: 'Managerial', label: 'Hiring Manager', icon: '👔' },
                    { value: 'Assignment', label: 'Take-home', icon: '📝' },
                    { value: 'Final', label: 'Final Round', icon: '🎯' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setRoundInput(prev => ({ ...prev, roundType: option.value as InterviewRoundType }))}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        roundInput.roundType === option.value
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'border-border hover:border-indigo-300'
                      }`}
                    >
                      <span className="mr-2">{option.icon}</span>
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* HR Info */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  What did HR tell you? (optional)
                </label>
                <textarea
                  value={hrNotes}
                  onChange={(e) => setHrNotes(e.target.value)}
                  placeholder="E.g., 'This will be a coding round focusing on algorithms' or 'Questions will be based on your resume'..."
                  className="w-full px-3 py-2 border border-border rounded-lg min-h-[100px] resize-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Resume Focus */}
              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Key resume areas to highlight (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['System Design', 'React', 'Node.js', 'Python', 'AWS', 'ML/AI', 'Distributed Systems'].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        setResumeFocus(prev => 
                          prev.includes(topic) 
                            ? prev.filter(t => t !== topic)
                            : [...prev, topic]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        resumeFocus.includes(topic)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-3">
                <label className="text-sm font-medium">When is the round?</label>
                <input
                  type="datetime-local"
                  value={roundInput.scheduledDate || ''}
                  onChange={(e) => setRoundInput(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-lg"
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGeneratePrep}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Prep Plan
              </button>
            </>
          )}

          {step === 'loading' && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              <p className="text-muted-foreground">
                {isScraping ? `Searching for ${application.company} interview data...` : 'Building your prep plan...'}
              </p>
            </div>
          )}

          {step === 'results' && (
            <>
              {/* Data Source Indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                <Globe className="w-4 h-4" />
                <span>
                  {scrapedData 
                    ? `Found insights from ${scrapedData.source}`
                    : 'Using general prep guidelines'
                  }
                </span>
              </div>

              {/* Recommendations */}
              <div className="space-y-4">
                {recommendations.map((rec, idx) => (
                  <div 
                    key={idx}
                    className={`p-4 rounded-lg border ${
                      rec.type === 'hr_provided' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                        : rec.type === 'scraped'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium flex items-center gap-2">
                        {rec.type === 'hr_provided' && <Target className="w-4 h-4 text-green-600" />}
                        {rec.type === 'scraped' && <Globe className="w-4 h-4 text-blue-600" />}
                        {rec.type === 'resume_based' && <FileText className="w-4 h-4 text-purple-600" />}
                        {rec.type === 'generic' && <Lightbulb className="w-4 h-4 text-amber-600" />}
                        {rec.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        rec.confidence === 'high' 
                          ? 'bg-green-100 text-green-700'
                          : rec.confidence === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {rec.confidence} confidence
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {rec.description}
                    </p>
                    {rec.topics && rec.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {rec.topics.map((topic) => (
                          <span 
                            key={topic}
                            className="px-2 py-1 bg-background rounded text-xs border"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                    {rec.resources && rec.resources.length > 0 && (
                      <div className="space-y-1">
                        {rec.resources.map((resource, ridx) => (
                          <div key={ridx} className="text-sm flex items-start gap-2">
                            <span className="text-muted-foreground">•</span>
                            <span>{resource}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSaveRound}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  Save Round
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
