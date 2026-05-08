import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { Layout } from "@/components/layout";
import { Home } from "@/pages/home";
import { QuizCreate } from "@/pages/quiz-create";
import { QuizEdit } from "@/pages/quiz-edit";
import { QuizDetail } from "@/pages/quiz-detail";
import { QuizPlay } from "@/pages/quiz-play";
import { QuizResults } from "@/pages/quiz-results";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/quizzes/new" component={QuizCreate} />
      <Route path="/quizzes/:id/edit" component={QuizEdit} />
      <Route path="/quizzes/:id/play" component={QuizPlay} />
      <Route path="/quizzes/:id/results/:attemptId" component={QuizResults} />
      <Route path="/quizzes/:id" component={QuizDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
