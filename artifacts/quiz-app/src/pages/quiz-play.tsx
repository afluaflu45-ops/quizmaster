import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetQuiz, getGetQuizQueryKey, useSubmitAttempt } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Send, User } from "lucide-react";

export function QuizPlay() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();

  const { data: quiz, isLoading } = useGetQuiz(id, {
    query: { enabled: !!id, queryKey: getGetQuizQueryKey(id) },
  });

  const submitAttempt = useSubmitAttempt();

  const [step, setStep] = useState<"name" | "quiz" | "submitting">("name");
  const [playerName, setPlayerName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  function handleNameSubmit() {
    if (!playerName.trim()) return;
    setStep("quiz");
  }

  function handleChoiceSelect(choiceId: number) {
    const question = quiz!.questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [question.id]: choiceId }));
  }

  function handleNext() {
    if (currentIndex < (quiz?.questions.length ?? 0) - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }

  function handleSubmit() {
    if (!quiz) return;
    setStep("submitting");
    const answersList = quiz.questions.map((q) => ({
      questionId: q.id,
      choiceId: answers[q.id] ?? 0,
    }));
    submitAttempt.mutate(
      { id, data: { playerName, answers: answersList } },
      {
        onSuccess: (result) => {
          sessionStorage.setItem(`attempt_result_${result.id}`, JSON.stringify(result));
          setLocation(`/quizzes/${id}/results/${result.id}`);
        },
        onError: () => {
          setStep("quiz");
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
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

  if (quiz.questions.length === 0) {
    return (
      <div className="text-center py-24 text-muted-foreground max-w-md mx-auto">
        <p className="text-xl font-bold">No questions yet</p>
        <p className="text-sm mt-1">Add questions to this quiz before playing.</p>
        <Link href={`/quizzes/${id}/edit`}>
          <Button className="mt-4 font-bold">Edit Quiz</Button>
        </Link>
      </div>
    );
  }

  // Name entry
  if (step === "name") {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/quizzes/${id}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight">{quiz.title}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-black text-center text-xl">What's your name?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                className="pl-9"
                autoFocus
                data-testid="input-player-name"
              />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {quiz.questions.length} questions — good luck!
            </p>
            <Button
              className="w-full font-black uppercase tracking-widest"
              onClick={handleNameSubmit}
              disabled={!playerName.trim()}
              data-testid="button-start"
            >
              Let's Go!
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = quiz.questions[currentIndex];
  const selectedChoiceId = answers[question.id];
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100;
  const isLast = currentIndex === quiz.questions.length - 1;
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-muted-foreground">
            Question {currentIndex + 1} of {quiz.questions.length}
          </span>
          <span className="font-bold text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" data-testid="quiz-progress" />
      </div>

      {/* Question */}
      <Card className="border-2">
        <CardContent className="pt-8 pb-8 px-6">
          <p className="text-xl font-black text-foreground leading-snug text-center" data-testid="text-question">
            {question.text}
          </p>
        </CardContent>
      </Card>

      {/* Choices */}
      <div className="grid gap-3">
        {question.choices.map((choice) => {
          const isSelected = selectedChoiceId === choice.id;
          return (
            <button
              key={choice.id}
              onClick={() => handleChoiceSelect(choice.id)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 font-semibold text-sm transition-all duration-150 cursor-pointer
                ${isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40"
                }`}
              data-testid={`button-choice-${choice.id}`}
            >
              {choice.text}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="font-semibold"
          data-testid="button-prev"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {isLast ? (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || step === "submitting"}
            className="font-black uppercase tracking-widest flex-1"
            data-testid="button-submit"
          >
            <Send className="h-4 w-4 mr-2" />
            {step === "submitting" ? "Submitting..." : "Submit Answers"}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!selectedChoiceId}
            className="font-semibold flex-1"
            data-testid="button-next"
          >
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Answer progress dots */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {quiz.questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(i)}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-200 cursor-pointer
              ${i === currentIndex ? "w-5 bg-primary" : answers[q.id] ? "bg-primary/50" : "bg-muted"}`}
            data-testid={`dot-question-${i}`}
          />
        ))}
      </div>
    </div>
  );
}
