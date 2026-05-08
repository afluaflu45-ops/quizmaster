import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateQuiz, getListQuizzesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const CATEGORIES = ["General", "Science", "History", "Technology", "Sports", "Arts", "Geography", "Music", "Film", "Literature"];

const schema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  category: z.string().min(1, "Please select a category"),
});

type FormValues = z.infer<typeof schema>;

export function QuizCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createQuiz = useCreateQuiz();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", category: "" },
  });

  function onSubmit(values: FormValues) {
    createQuiz.mutate(
      { data: values },
      {
        onSuccess: (quiz) => {
          queryClient.invalidateQueries({ queryKey: getListQuizzesQueryKey() });
          toast({ title: "Quiz created!", description: "Now add some questions." });
          setLocation(`/quizzes/${quiz.id}/edit`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create quiz.", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-black uppercase tracking-tight">New Quiz</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-bold">Quiz Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold uppercase tracking-wider text-xs">Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. World Geography" {...field} data-testid="input-title" />
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
                      <Textarea placeholder="What is this quiz about?" rows={3} {...field} data-testid="input-description" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
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
              <Button
                type="submit"
                className="w-full font-bold uppercase tracking-widest"
                disabled={createQuiz.isPending}
                data-testid="button-submit-create"
              >
                {createQuiz.isPending ? "Creating..." : "Create Quiz & Add Questions"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
