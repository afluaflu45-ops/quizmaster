import { Link } from "wouter";
import { useListQuizzes, useGetSummaryStats, getGetSummaryStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Zap, BookOpen, ChevronRight, Clock } from "lucide-react";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatPercent(n: number) {
  return `${Math.round(n)}%`;
}

export function Home() {
  const { data: quizzes, isLoading: quizzesLoading } = useListQuizzes();
  const { data: stats, isLoading: statsLoading } = useGetSummaryStats({
    query: { queryKey: getGetSummaryStatsQueryKey() },
  });

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 pt-4">
        <h1 className="text-5xl font-black tracking-tight leading-tight text-foreground">
          Test your knowledge.<br />
          <span className="text-primary">Beat the scoreboard.</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Create quizzes, challenge friends, and climb the ranks. Every question counts.
        </p>
        <Link href="/quizzes/new">
          <Button size="lg" className="font-bold uppercase tracking-widest text-base mt-2 px-8" data-testid="button-create-quiz-hero">
            Create a Quiz
          </Button>
        </Link>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {statsLoading ? (
          [0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <Card className="text-center" data-testid="stat-total-quizzes">
              <CardContent className="pt-6 pb-4">
                <BookOpen className="mx-auto mb-2 text-primary h-6 w-6" />
                <div className="text-3xl font-black text-foreground">{stats?.totalQuizzes ?? 0}</div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-1">Quizzes</div>
              </CardContent>
            </Card>
            <Card className="text-center" data-testid="stat-total-attempts">
              <CardContent className="pt-6 pb-4">
                <Zap className="mx-auto mb-2 text-secondary h-6 w-6" />
                <div className="text-3xl font-black text-foreground">{stats?.totalAttempts ?? 0}</div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-1">Attempts</div>
              </CardContent>
            </Card>
            <Card className="text-center" data-testid="stat-total-players">
              <CardContent className="pt-6 pb-4">
                <Users className="mx-auto mb-2 text-accent-foreground h-6 w-6" />
                <div className="text-3xl font-black text-foreground">{stats?.totalPlayers ?? 0}</div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mt-1">Players</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quiz list */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black uppercase tracking-tight">All Quizzes</h2>
          <Link href="/quizzes/new">
            <Button variant="outline" size="sm" className="font-semibold" data-testid="button-create-quiz-list">
              + New Quiz
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzesLoading
            ? [0,1,2].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)
            : quizzes && quizzes.length > 0
              ? quizzes.map((quiz) => (
                  <Link key={quiz.id} href={`/quizzes/${quiz.id}`} data-testid={`card-quiz-${quiz.id}`}>
                    <Card className="h-full cursor-pointer hover:border-primary transition-all duration-200 hover:shadow-md group">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-lg font-black leading-tight group-hover:text-primary transition-colors">
                            {quiz.title}
                          </CardTitle>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
                        </div>
                        <Badge variant="secondary" className="w-fit text-xs font-semibold uppercase tracking-wider">
                          {quiz.category}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold">
                          <span data-testid={`text-question-count-${quiz.id}`}>{quiz.questionCount} questions</span>
                          <span data-testid={`text-attempt-count-${quiz.id}`}>{quiz.attemptCount} attempts</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))
              : (
                <div className="col-span-3 text-center py-16 text-muted-foreground">
                  <BookOpen className="mx-auto mb-3 h-12 w-12 opacity-30" />
                  <p className="font-semibold">No quizzes yet. Create the first one!</p>
                </div>
              )
          }
        </div>
      </div>

      {/* Recent activity */}
      {!statsLoading && stats && stats.recentAttempts.length > 0 && (
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {stats.recentAttempts.map((attempt, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors" data-testid={`row-recent-attempt-${i}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Trophy className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{attempt.playerName}</p>
                        <p className="text-xs text-muted-foreground">{attempt.quizTitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-black text-sm" data-testid={`text-attempt-score-${i}`}>{attempt.score}/{attempt.total}</p>
                        <p className="text-xs text-muted-foreground">{formatPercent(attempt.percentage)}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(attempt.completedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
