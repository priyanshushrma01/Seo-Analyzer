"use client";
import { inputSchema } from "@/schema/inputSchema";
import { FormProvider, useForm } from "react-hook-form";
import * as z from "zod";
import {
  FormField,
  FormItem,
  FormMessage,
} from "./ui/form";
import { Textarea } from "./ui/textarea";
import { useState } from "react";
import { Button } from "./ui/button";
import { Book, CheckCircle, Globe, Hash, Loader2, Type, Sparkles } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";

const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "Italian", value: "it" },
  { label: "German", value: "de" },
  { label: "Spanish", value: "es" },
];

type Replacement = { value: string; };
export type Match = {
  message: string;
  shortMessage: string;
  replacements: Replacement[];
  offset: number;
  length: number;
  context: { text: string; };
};
type LanguageData = {
  name: string;
  code: string;
  detectedLanguage?: {
    name: string;
    code: string;
    confidence: number;
    source: string;
  };
};
type Corrections = {
  matches: Match[];
  language: LanguageData;
  sentenceRanges?: number[][];
};
type ReadabilityResponse = {
  success: boolean;
  message?: string;
  corrections?: Corrections;
  error?: string;
};

const countSyllables = (word: string): number => {
  word = word.toLowerCase();
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const syllableCount = word.match(/[aeiouy]{1,2}/g);
  return syllableCount ? syllableCount.length : 1;
};
const calculateReadabilityScore = (text: string): number => {
  if (!text.trim()) return 0;
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const words = text.trim().split(/\s+/);
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const wordsPerSentence = words.length / sentences.length;
  const syllablesPerWord = totalSyllables / words.length;
  const score = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
  return Number(score.toFixed(1));
};
const getReadabilityLevel = (score: number): { level: string; color: string } => {
  if (score >= 90) return { level: 'Very Easy', color: 'text-emerald-500' };
  if (score >= 80) return { level: 'Easy', color: 'text-teal-500' };
  if (score >= 70) return { level: 'Fairly Easy', color: 'text-cyan-500' };
  if (score >= 60) return { level: 'Standard', color: 'text-yellow-500' };
  if (score >= 50) return { level: 'Fairly Difficult', color: 'text-orange-500' };
  if (score >= 30) return { level: 'Difficult', color: 'text-red-500' };
  return { level: 'Very Difficult', color: 'text-red-600' };
};

const InputContent: React.FC = () => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<ReadabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixedMatches, setFixedMatches] = useState<Record<string, boolean>>({});

  const form = useForm<z.infer<typeof inputSchema>>({
    resolver: zodResolver(inputSchema),
    defaultValues: { content: "", language: "en" },
  });

  const { handleSubmit, control, setValue, watch } = form;
  const selectedLang = watch("language");

  const calculateWordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

  const onsubmit = async (data: z.infer<typeof inputSchema>) => {
    setIsSubmitting(true);
    setFixedMatches({});
    try {
      const response = await axios.post<ReadabilityResponse>("/api/analyze", data);
      if (response.data.success) {
        toast.success("Analysis complete", {
          description: response.data.message,
          duration: 4000,
        });
        setResults(response.data);
      } else {
        setResults({ success: false, error: 'Failed to analyze content' });
        toast.error("Failed", {
          description: response.data.message ?? "Unknown error",
          duration: 4000,
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError<ReadabilityResponse>;
      setResults({ success: false, error: 'Failed to analyze content' });
      toast.error("Error", {
        description: axiosError?.response?.data?.message ?? "Failed to analyze content",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFix = async (match: Match, replacement: string) => {
    if (!results?.corrections) return;
    setLoading(true);
    try {
      const response = await axios.post('/api/insert-keyword', { match, replacement, content });
      toast.success("Inserted!", { description: response.data.message, duration: 2000 });
      setContent(response.data.newContent);
      setValue('content', response.data.newContent);
      const matchKey = `${match.offset}-${match.length}-${match.message.substring(0, 20)}`;
      setFixedMatches(prev => ({ ...prev, [matchKey]: true }));
    } catch {
      toast.error("Error", { description: "Failed to insert the suggestion", duration: 2000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onsubmit)} className="space-y-8">
          <div className="rounded-3xl shadow-2xl border border-cyan-200 dark:border-cyan-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg p-8 mt-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent tracking-tight">
                  SEO Analyzer
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                  Paste your content below to get instant readability and grammar feedback.
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="rounded-full px-5 py-2 border border-cyan-200 dark:border-cyan-700 shadow-sm bg-white/60 dark:bg-gray-800/60 hover:bg-cyan-50 dark:hover:bg-cyan-900/40 text-base font-medium">
                    {LANGUAGES.find((l) => l.value === selectedLang)?.label || "Select Language"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl shadow-lg border w-44">
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.value}
                      onClick={() => setValue("language", lang.value)}
                      className="cursor-pointer text-base"
                    >
                      {lang.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <FormField
              control={control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <Textarea
                    className="min-h-[160px] text-lg p-5 rounded-2xl border-2 border-cyan-200 dark:border-cyan-700 focus:border-teal-400 dark:focus:border-teal-600 transition-all bg-white/70 dark:bg-gray-900/70 shadow-inner"
                    placeholder="Write or paste your content here..."
                    {...field}
                    value={field.value}
                    onChange={(e) => {
                      field.onChange(e);
                      setContent(e.target.value);
                    }}
                  />
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            <div className="flex justify-end mt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-2 text-lg shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </FormProvider>

      {results && (
        <div className="mt-10">
          {!results.success ? (
            <div className="text-red-500 p-4 bg-red-50 rounded-xl border border-red-200 shadow">
              Error: {results.error || 'Unknown error'}
            </div>
          ) : (
            <div className="rounded-3xl shadow-2xl border border-cyan-200 dark:border-cyan-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg p-8">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent mb-8">
                Analysis Results
              </h2>

              {/* Info Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 flex items-center gap-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl px-5 py-4 shadow-sm">
                  <Type className="h-5 w-5 text-teal-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200">Words:</span>
                  <span className="text-xl font-bold">{calculateWordCount(content)}</span>
                </div>
                <div className="flex-1 flex items-center gap-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl px-5 py-4 shadow-sm">
                  <Hash className="h-5 w-5 text-teal-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200">Characters:</span>
                  <span className="text-xl font-bold">{content.length}</span>
                </div>
                <div className="flex-1 flex items-center gap-3 bg-cyan-50 dark:bg-cyan-900/30 rounded-xl px-5 py-4 shadow-sm">
                  <Globe className="h-5 w-5 text-teal-500" />
                  <span className="font-semibold text-gray-700 dark:text-gray-200">Language:</span>
                  <span className="text-xl font-bold">
                    {results.corrections?.language?.detectedLanguage?.name || 'Unknown'}
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-start justify-center bg-cyan-50 dark:bg-cyan-900/30 rounded-xl px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Book className="h-5 w-5 text-teal-500" />
                    <span className="font-semibold text-gray-700 dark:text-gray-200">Readability:</span>
                  </div>
                  <span className="text-xl font-bold">{calculateReadabilityScore(content)}</span>
                  <span className={`text-xs mt-1 ${getReadabilityLevel(calculateReadabilityScore(content)).color}`}>
                    {getReadabilityLevel(calculateReadabilityScore(content)).level}
                  </span>
                </div>
              </div>

              {/* Sentence Structure */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2 text-teal-700 dark:text-teal-300">Content Structure</h3>
                <div className="bg-cyan-50 dark:bg-gray-800/60 rounded-xl p-4 border border-cyan-100 dark:border-cyan-700 shadow-inner">
                  <div className="space-y-2">
                    {results.corrections?.sentenceRanges?.map((range, index) => (
                      <div key={index} className="text-sm text-gray-700 dark:text-gray-200 p-2 border-b last:border-0 border-cyan-200 dark:border-cyan-700">
                        <span className="font-medium text-teal-600 dark:text-teal-300">
                          Sentence {index + 1}:
                        </span>{' '}
                        {content.slice(range[0], range[1])}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-teal-700 dark:text-teal-300">Suggestions</h3>
                <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  Click a suggestion below to insert it into your content instantly.
                </p>
                {results.corrections?.matches && results.corrections.matches.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {results.corrections.matches.map((match, idx) =>
                      match.replacements.map((r, ridx) => {
                        const matchKey = `${match.offset}-${match.length}-${match.message.substring(0, 20)}`;
                        return (
                          <Button
                            key={matchKey + ridx}
                            variant={fixedMatches[matchKey] ? "secondary" : "outline"}
                            size="sm"
                            disabled={fixedMatches[matchKey] || loading}
                            onClick={() => handleFix(match, r.value)}
                            className={`rounded-full px-4 py-1 text-base transition-all ${
                              fixedMatches[matchKey]
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-white dark:bg-gray-900/60 hover:bg-cyan-50 dark:hover:bg-cyan-800/60"
                            }`}
                          >
                            {r.value}
                            {fixedMatches[matchKey] && <CheckCircle className="ml-2 h-4 w-4 inline text-emerald-500" />}
                          </Button>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mt-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">No issues found! Your text looks great.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InputContent;