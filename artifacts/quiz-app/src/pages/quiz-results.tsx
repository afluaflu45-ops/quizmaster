import { Link, useParams } from "wouter";
import { useGetQuiz, getGetQuizQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, XCircle, Trophy, RotateCcw, Home } from "lucide-react";
import { useState, useEffect } from "react";

function ScoreRing({ percentage }: { percentage: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percentage / 100) * circ;
  const color = percentage >= 80 ? "#10b981" : percentage >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/30" />
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black" style={{ color }}>{Math.round(percentage)}%</div>
      </div>
    </div>
  );
}

interface StoredResult {
  id: number;
  quizId: number;
  playerName: string;
  score: number;
  total: number;
  percentage: number;
  completedAt: string;
  answers: Array<{
    questionId: number;
    questionText: string;
    choiceId: number;
    choiceText: string;
    correctChoiceId: number;
    correctChoiceText: string;
    isCorrect: boolean;
  }>;
}

export function QuizResults() {
  const params = useParams<{ id: string; attemptId: string }>();
  const quizId = parseInt(params.id ?? "0", 10);
  const attemptId = parseInt(params.attemptId ?? "0", 10);

  const { data: quiz, isLoading: quizLoading } = useGetQuiz(quizId, {
    query: { enabled: !!quizId, queryKey: getGetQuizQueryKey(quizId) },
  });

  const [result, setResult] = useState<StoredResult | null>(null);

  // Read result from sessionStorage (set by quiz-play after submit)
  useEffect(() => {
    const key = `attempt_result_${attemptId}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      setResult(JSON.parse(stored));
    }
  }, [attemptId]);

  if (quizLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-24 text-muted-foreground max-w-md mx-auto space-y-4">
        <Trophy className="mx-auto h-12 w-12 opacity-30" />
        <p className="text-xl font-bold">Results not available</p>
        <p className="text-sm">Results are only shown right after completing a quiz.</p>
        <Link href={`/quizzes/${quizId}`}>
          <Button className="font-bold">Back to Quiz</Button>
        </Link>
      </div>
    );
  }

  const { score, total, percentage, answers, playerName } = result;
  const scoreLabel = percentage >= 80 ? "Excellent!" : percentage >= 50 ? "Good job!" : "Keep practicing!";

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Score summary */}
      <Card className="text-center" data-testid="card-result-summary">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="text-lg font-black text-muted-foreground uppercase tracking-widest">{playerName}</div>
          <ScoreRing percentage={percentage} />
          <div>
            <div className="text-4xl font-black text-foreground" data-testid="text-score">{score} / {total}</div>
            <div className="text-xl font-bold text-muted-foreground mt-1">{scoreLabel}</div>
          </div>
          {quiz && (
            <Badge variant="secondary" className="font-semibold uppercase tracking-wider">{quiz.title}</Badge>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/quizzes/${quizId}/play`} className="flex-1">
          <Button variant="outline" className="w-full font-bold" data-testid="button-retry">
            <RotateCcw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button variant="outline" className="w-full font-bold" data-testid="button-home">
            <Home className="h-4 w-4 mr-2" /> Home
          </Button>
        </Link>
      </div>

      {/* Per-question breakdown */}
      {answers && answers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-black uppercase tracking-tight">Review</h2>
          {answers.map((a, i) => (
            <Card
              key={a.questionId}
              className={`border-2 ${a.isCorrect ? "border-emerald-500/30" : "border-destructive/30"}`}
              data-testid={`card-answer-${a.questionId}`}
            >
              <CardHeader className="pb-2 pt-4 px-5">
                <div className="flex items-start gap-3">
                  {a.isCorrect
                    ? <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  }
                  <CardTitle className="font-bold text-sm leading-snug">
                    <span className="text-muted-foreground mr-1">{i + 1}.</span> {a.questionText}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-1.5 pt-0">
                <div className={`text-sm font-semibold px-3 py-2 rounded-lg ${a.isCorrect ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                  Your answer: {a.choiceText}
                </div>
                {!a.isCorrect && (
                  <div className="text-sm font-semibold px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-700">
                    Correct: {a.correctChoiceText}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
