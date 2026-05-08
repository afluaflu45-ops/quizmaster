import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetQuiz,
  getGetQuizQueryKey,
  useUpdateQuiz,
  useAddQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
  getListQuizzesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, Pencil, Plus, Trash2, Check, X, CheckCircle } from "lucide-react";

const CATEGORIES = ["General", "Science", "History", "Technology", "Sports", "Arts", "Geography", "Music", "Film", "Literature"];

const quizSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  category: z.string().min(1, "Please select a category"),
});

const questionSchema = z.object({
  text: z.string().min(3, "Question must be at least 3 characters"),
  choices: z.array(z.string().min(1, "Choice cannot be empty")).min(2, "At least 2 choices required"),
  correctChoiceIndex: z.number().min(0),
});

type QuizFormValues = z.infer<typeof quizSchema>;
type QuestionFormValues = z.infer<typeof questionSchema>;

function AddQuestionForm({ quizId, onSaved }: { quizId: number; onSaved: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const addQuestion = useAddQuestion();
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [text, setText] = useState("");

  function updateChoice(i: number, val: string) {
    setChoices((prev) => prev.map((c, idx) => (idx === i ? val : c)));
  }

  function addChoice() {
    setChoices((prev) => [...prev, ""]);
  }

  function removeChoice(i: number) {
    if (choices.length <= 2) return;
    setChoices((prev) => prev.filter((_, idx) => idx !== i));
    if (correctIndex >= i && correctIndex > 0) setCorrectIndex(correctIndex - 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validChoices = choices.filter(c => c.trim().length > 0);
    if (!text.trim() || validChoices.length < 2) {
      toast({ title: "Invalid", description: "Add a question text and at least 2 choices.", variant: "destructive" });
      return;
    }
    addQuestion.mutate(
      { id: quizId, data: { text, choices: validChoices, correctChoiceIndex: correctIndex } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuizQueryKey(quizId) });
          toast({ title: "Question added!" });
          setText("");
          setChoices(["", "", "", ""]);
          setCorrectIndex(0);
          onSaved();
        },
        onError: () => toast({ title: "Error", description: "Failed to add question.", variant: "destructive" }),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block mb-1.5">Question</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter question text..."
          rows={2}
          data-testid="input-question-text"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground block">
          Choices — click <CheckCircle className="inline h-3.5 w-3.5" /> to mark correct
        </label>
        {choices.map((choice, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrectIndex(i)}
              className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-colors cursor-pointer border-2
                ${correctIndex === i ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary"}`}
              data-testid={`button-correct-${i}`}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <Input
              value={choice}
              onChange={(e) => updateChoice(i, e.target.value)}
              placeholder={`Choice ${i + 1}`}
              className="flex-1"
              data-testid={`input-choice-${i}`}
            />
            <button
              type="button"
              onClick={() => removeChoice(i)}
              className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors cursor-pointer disabled:opacity-30"
              disabled={choices.length <= 2}
              data-testid={`button-remove-choice-${i}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addChoice} className="text-xs font-semibold" data-testid="button-add-choice">
          + Add choice
        </Button>
      </div>
      <Button type="submit" disabled={addQuestion.isPending} className="w-full font-bold uppercase tracking-widest" data-testid="button-save-question">
        {addQuestion.isPending ? "Saving..." : "Add Question"}
      </Button>
    </form>
  );
}

function QuestionRow({ question, quizId }: {
  question: { id: number; text: string; choices: { id: number; text: string }[]; correctChoiceId: number; order: number };
  quizId: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.text);
  const [choices, setChoices] = useState(question.choices.map(c => c.text));
  const [correctIndex, setCorrectIndex] = useState(question.choices.findIndex(c => c.id === question.correctChoiceId));

  function updateChoice(i: number, val: string) {
    setChoices((prev) => prev.map((c, idx) => (idx === i ? val : c)));
  }

  function handleSave() {
    updateQuestion.mutate(
      { id: question.id, data: { text, choices, correctChoiceIndex: correctIndex } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuizQueryKey(quizId) });
          toast({ title: "Question updated!" });
          setEditing(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to update question.", variant: "destructive" }),
      }
    );
  }

  function handleDelete() {
    if (!confirm("Delete this question?")) return;
    deleteQuestion.mutate(
      { id: question.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuizQueryKey(quizId) });
          toast({ title: "Question deleted" });
        },
        onError: () => toast({ title: "Error", description: "Failed to delete question.", variant: "destructive" }),
      }
    );
  }

  if (!editing) {
    return (
      <div className="border rounded-xl px-4 py-3 space-y-2" data-testid={`row-question-${question.id}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm text-foreground">{question.text}</p>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer" data-testid={`button-edit-question-${question.id}`}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={handleDelete} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer" data-testid={`button-delete-question-${question.id}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {question.choices.map((c) => (
            <div
              key={c.id}
              className={`text-xs px-2 py-1 rounded-md font-medium ${c.id === question.correctChoiceId ? "bg-emerald-500/15 text-emerald-700 font-semibold" : "bg-muted text-muted-foreground"}`}
            >
              {c.id === question.correctChoiceId && <Check className="inline h-3 w-3 mr-1" />}
              {c.text}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-primary/40 rounded-xl px-4 py-4 space-y-3 bg-primary/5" data-testid={`row-question-edit-${question.id}`}>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="font-semibold" data-testid="input-edit-question-text" />
      <div className="space-y-1.5">
        {choices.map((choice, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCorrectIndex(i)}
              className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center transition-colors cursor-pointer border-2
                ${correctIndex === i ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary"}`}
            >
              <Check className="h-3 w-3" />
            </button>
            <Input value={choice} onChange={(e) => updateChoice(i, e.target.value)} className="flex-1 h-8 text-xs" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={updateQuestion.isPending} className="font-bold" data-testid="button-save-edit">
          {updateQuestion.isPending ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} data-testid="button-cancel-edit">
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function QuizEdit() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(true);

  const { data: quiz, isLoading } = useGetQuiz(id, {
    query: { enabled: !!id, queryKey: getGetQuizQueryKey(id) },
  });

  const updateQuiz = useUpdateQuiz();

  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    values: {
      title: quiz?.title ?? "",
      description: quiz?.description ?? "",
      category: quiz?.category ?? "",
    },
  });

  function onSubmit(values: QuizFormValues) {
    updateQuiz.mutate(
      { id, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetQuizQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey() });
          toast({ title: "Quiz updated!" });
        },
        onError: () => toast({ title: "Error", description: "Failed to update quiz.", variant: "destructive" }),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
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
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/quizzes/${id}`}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight">Edit Quiz</h1>
      </div>

      {/* Quiz details form */}
      <Card>
        <CardHeader>
          <CardTitle className="font-bold">Quiz Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold uppercase tracking-wider text-xs">Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold uppercase tracking-wider text-xs">Description</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold uppercase tracking-wider text-xs">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3">
                <Button type="submit" disabled={updateQuiz.isPending} className="font-bold uppercase tracking-widest" data-testid="button-save-quiz">
                  {updateQuiz.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Link href={`/quizzes/${id}`}>
                  <Button variant="outline" className="font-semibold" data-testid="button-view-quiz">
                    View Quiz
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-black uppercase tracking-tight">Questions ({quiz.questions.length})</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm((v) => !v)}
            className="font-semibold"
            data-testid="button-toggle-add"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 bg-primary/5">
              <p className="text-xs font-black uppercase tracking-widest text-primary mb-3">New Question</p>
              <AddQuestionForm quizId={id} onSaved={() => setShowAddForm(false)} />
            </div>
          )}

          {quiz.questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-semibold text-sm">No questions yet. Add your first one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quiz.questions.map((q) => (
                <QuestionRow key={q.id} question={q} quizId={id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
