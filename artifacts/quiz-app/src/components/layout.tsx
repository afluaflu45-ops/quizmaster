import { Link } from "wouter";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-primary transition-transform hover:scale-105" data-testid="link-home">
            <Zap className="h-6 w-6 fill-primary" />
            <span className="uppercase italic text-2xl mt-1">QuizBolt</span>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link href="/quizzes/new">
              <Button variant="default" className="font-bold uppercase tracking-wider" data-testid="button-create-quiz-nav">
                Create Quiz
              </Button>
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {children}
      </main>
      
      <footer className="border-t py-8 mt-16 bg-card text-center text-sm text-muted-foreground">
        <div className="container mx-auto">
          <p className="font-medium tracking-tight">QuizBolt &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
