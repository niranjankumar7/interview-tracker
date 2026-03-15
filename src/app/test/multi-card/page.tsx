"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, CheckCircle, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/layout/AppHeader";

interface TestResult {
  prompt: string;
  success: boolean;
  cardsCreated: number;
  counters?: {
    promptsSent: number;
    kanbanCardsCreated: number;
    cardsCreatedThisPrompt: number;
    remainingApplications: number;
  };
  companies?: string[];
  message: string;
  error?: string;
  truncated?: boolean;
  limitExceeded?: boolean;
}

const TEST_PROMPTS = [
  {
    name: "Single Application",
    prompt: "I applied for Software Engineer at Google",
    expectedCards: 1,
  },
  {
    name: "Three Companies",
    prompt: "Applied to Google, Amazon, and Microsoft as SDE",
    expectedCards: 3,
  },
  {
    name: "Five Companies (Max)",
    prompt: "Just applied to Meta, Netflix, Apple, Uber, and Airbnb",
    expectedCards: 5,
  },
  {
    name: "Six Companies (Should Limit)",
    prompt: "Applied to Google, Amazon, Microsoft, Meta, Netflix, and Apple",
    expectedCards: 5,
    shouldTruncate: true,
  },
  {
    name: "Different Roles",
    prompt: "Applied for SWE at Google, PM at Meta, Data at Netflix, DevOps at Amazon, and ML at Microsoft",
    expectedCards: 5,
  },
  {
    name: "Numbered List",
    prompt: "1. Google - SWE\n2. Amazon - Backend\n3. Microsoft - Full Stack",
    expectedCards: 3,
  },
  {
    name: "With Extra Words",
    prompt: "Hey! I just wanted to let you know that I applied to Flipkart and Swiggy yesterday, and also Zomato today!",
    expectedCards: 3,
  },
  {
    name: "Edge Case - No Companies",
    prompt: "I had a great day today and ate pizza",
    expectedCards: 0,
  },
  {
    name: "Edge Case - Applied Only",
    prompt: "Applied",
    expectedCards: 0,
  },
];

export default function MultiCardTestPage() {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [runningAll, setRunningAll] = useState(false);

  const sendPrompt = async (prompt: string): Promise<TestResult> => {
    try {
      const response = await fetch("/api/chat/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          prompt,
          success: false,
          cardsCreated: 0,
          message: data.message || data.error || "Request failed",
          error: data.error,
        };
      }

      const successCount = data.action?.results?.filter((r: any) => r.success).length || 0;
      const companies = data.action?.results
        ?.filter((r: any) => r.success)
        .map((r: any) => r.company);

      return {
        prompt,
        success: true,
        cardsCreated: successCount,
        counters: data.counters,
        companies,
        message: data.message,
        truncated: data.limits?.truncated,
        limitExceeded: data.limits?.limitExceeded,
      };
    } catch (error) {
      return {
        prompt,
        success: false,
        cardsCreated: 0,
        message: error instanceof Error ? error.message : "Network error",
        error: "Network error",
      };
    }
  };

  const handleCustomTest = async () => {
    if (!customPrompt.trim()) return;
    setIsLoading(true);
    const result = await sendPrompt(customPrompt);
    setResults((prev) => [result, ...prev]);
    setIsLoading(false);
  };

  const runAllTests = async () => {
    setRunningAll(true);
    setResults([]);
    
    for (const test of TEST_PROMPTS) {
      const result = await sendPrompt(test.prompt);
      setResults((prev) => [...prev, result]);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Small delay between tests
    }
    
    setRunningAll(false);
  };

  const clearResults = () => setResults([]);

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-background">
      <AppHeader />

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Multi-Card Creation Test</h1>
            <p className="text-muted-foreground">
              Test the multi-card feature: Create up to 5 kanban cards from a single prompt
            </p>
          </div>

          {/* Info Card */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Feature Overview:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Create up to 5 kanban cards per prompt</li>
                  <li>Counters track: Prompts sent vs Kanban cards created</li>
                  <li>Supports multiple formats: comma-separated, numbered lists, natural language</li>
                  <li>Respects plan limits (Free: 5 total applications)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Custom Test */}
          <div className="border rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-3">Custom Test</h2>
            <div className="space-y-3">
              <Textarea
                placeholder="Type a prompt to test... (e.g., 'Applied to Google, Amazon, Microsoft, Meta, Netflix, and Apple')"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCustomTest}
                  disabled={isLoading || !customPrompt.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Test Prompt
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={runAllTests}
                  disabled={runningAll}
                >
                  {runningAll ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running All...
                    </>
                  ) : (
                    "Run All Test Cases"
                  )}
                </Button>
                <Button variant="ghost" onClick={clearResults}>
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {/* Test Prompts Reference */}
          <div className="border rounded-lg p-4 mb-6">
            <h2 className="font-semibold mb-3">Test Cases</h2>
            <div className="grid gap-2">
              {TEST_PROMPTS.map((test, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                >
                  <div>
                    <span className="font-medium">{test.name}</span>
                    <span className="text-muted-foreground ml-2">({test.expectedCards} cards)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomPrompt(test.prompt);
                    }}
                  >
                    Use
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Results ({results.length})</h2>
              
              {results.map((result, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 ${
                    result.success
                      ? result.cardsCreated > 0
                        ? "bg-green-500/5 border-green-500/20"
                        : "bg-yellow-500/5 border-yellow-500/20"
                      : "bg-red-500/5 border-red-500/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success ? (
                      result.cardsCreated > 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                      ) : (
                        <Info className="w-5 h-5 text-yellow-500 mt-0.5" />
                      )
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1">{result.prompt}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          result.success
                            ? result.cardsCreated > 0
                              ? "bg-green-500/10 text-green-600"
                              : "bg-yellow-500/10 text-yellow-600"
                            : "bg-red-500/10 text-red-600"
                        }`}>
                          {result.success
                            ? `${result.cardsCreated} card${result.cardsCreated !== 1 ? "s" : ""} created`
                            : "Failed"}
                        </span>
                        
                        {result.truncated && (
                          <span className="text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-600">
                            Truncated to 5
                          </span>
                        )}
                        {result.limitExceeded && (
                          <span className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-600">
                            Limit Reached
                          </span>
                        )}
                      </div>
                      
                      {result.companies && result.companies.length > 0 && (
                        <p className="text-sm text-muted-foreground mb-2">
                          Companies: {result.companies.join(", ")}
                        </p>
                      )}
                      
                      {result.counters && (
                        <div className="text-xs text-muted-foreground bg-muted rounded p-2 mb-2">
                          <div className="grid grid-cols-2 gap-2">
                            <span>Prompts sent: {result.counters.promptsSent}</span>
                            <span>Total cards: {result.counters.kanbanCardsCreated}</span>
                            <span>This prompt: {result.counters.cardsCreatedThisPrompt}</span>
                            <span>Remaining: {result.counters.remainingApplications}</span>
                          </div>
                        </div>
                      )}
                      
                      <p className="text-sm">{result.message}</p>
                      
                      {result.error && (
                        <p className="text-xs text-red-500 mt-1">{result.error}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
