import { Link, useParams } from "wouter";
import {
  useGetQuiz,
  getGetQuizQueryKey,
  useGetQuizStats,
  getGetQuizStatsQueryKey,
  useListAttempts,
  getListAttemptsQueryKey,
  useDeleteQuiz,
  getListQuizzesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Trophy, Users, Target, Pencil, Trash2, ArrowLeft, Play, Medal
} from "lucide-react";

function formatPercent(n: number) {
  return `${Math.round(n)}%`;
}

function rankEmoji(i: number) {
  if (i === 0) return <Medal className="h-4 w-4 text-yellow-500" />;
  if (i === 1) return <Medal className="h-4 w-4 text-slate-400" />;
  if (i === 2) return <Medal className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>;
}

export function QuizDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quiz, isLoading: quizLoading } = useGetQuiz(id, {
    query: { enabled: !!id, queryKey: getGetQuizQueryKey(id) },
  });
  const { data: stats, isLoading: statsLoading } = useGetQuizStats(id, {
    query: { enabled: !!id, queryKey: getGetQuizStatsQueryKey(id) },
  });
  const { data: attempts, isLoading: attemptsLoading } = useListAttempts(id, {
    query: { enabled: !!id, queryKey: getListAttemptsQueryKey(id) },
  });

  const deleteQuiz = useDeleteQuiz();

  function handleDelete() {
    if (!confirm("Delete this quiz and all its data?")) return;
    deleteQuiz.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey() });
          toast({ title: "Quiz deleted" });
          setLocation("/");
        },
      }
    );
  }

  if (quizLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p className="text-xl font-bold">Quiz not found</p>
        <Link href="/"><Button variant="link" className="mt-3">Go home</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-black uppercase tracking-tight leading-none" data-testid="text-quiz-title">{quiz.title}</h1>
              <Badge variant="secondary" className="font-semibold uppercase tracking-wider text-xs">{quiz.category}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-sm" data-testid="text-quiz-description">{quiz.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/quizzes/${id}/edit`}>
            <Button variant="outline" size="sm" className="font-semibold" data-testid="button-edit">
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            className="font-semibold"
            onClick={handleDelete}
            disabled={deleteQuiz.isPending}
            data-testid="button-delete"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </div>
      </div>

      {/* Start quiz CTA */}
      {quiz.questions.length > 0 && (
        <Link href={`/quizzes/${id}/play`}>
          <Button size="lg" className="w-full font-black uppercase tracking-widest text-lg py-7 shadow-lg hover:shadow-xl transition-all" data-testid="button-start-quiz">
            <Play className="h-6 w-6 mr-2 fill-current" /> Start Quiz
          </Button>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card data-testid="stat-total-questions">
          <CardContent className="pt-5 pb-4 text-center">
            <Target className="mx-auto mb-1 h-5 w-5 text-primary" />
            <div className="text-2xl font-black">{quiz.questions.length}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Questions</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-attempts">
          <CardContent className="pt-5 pb-4 text-center">
            <Users className="mx-auto mb-1 h-5 w-5 text-secondary" />
            <div className="text-2xl font-black">{statsLoading ? "..." : (stats?.totalAttempts ?? 0)}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Attempts</div>
          </CardContent>
        </Card>
        <Card data-testid="stat-avg-score">
          <CardContent className="pt-5 pb-4 text-center">
            <Trophy className="mx-auto mb-1 h-5 w-5 text-accent-foreground" />
            <div className="text-2xl font-black">{statsLoading ? "..." : formatPercent(stats?.averageScore ?? 0)}</div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Avg Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Questions preview */}
      <Card>
        <CardHeader>
          <CardTitle className="font-black uppercase tracking-tight">Questions ({quiz.questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {quiz.questions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground px-6">
              <p className="font-semibold">No questions yet.</p>
              <Link href={`/quizzes/${id}/edit`}>
                <Button variant="link" className="mt-1 font-bold">Add questions</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {quiz.questions.map((q, i) => (
                <div key={q.id} className="px-5 py-3 flex items-start gap-3" data-testid={`row-question-${q.id}`}>
                  <span className="text-xs font-black text-primary bg-primary/10 rounded-full h-6 w-6 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm font-medium text-foreground">{q.text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leaderboard */}
      {!attemptsLoading && attempts && attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-black uppercase tracking-tight">Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {attempts.map((attempt, i) => (
                <div key={attempt.id} className="flex items-center justify-between px-5 py-3" data-testid={`row-leaderboard-${i}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 flex items-center justify-center">
                      {rankEmoji(i)}
                    </div>
                    <span className="font-bold text-sm">{attempt.playerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm" data-testid={`text-score-${attempt.id}`}>{attempt.score}/{attempt.total}</span>
                    <span className="text-xs text-muted-foreground ml-2">{formatPercent(attempt.percentage)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
