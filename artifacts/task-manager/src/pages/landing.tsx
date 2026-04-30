import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { basePath } from "@/lib/clerk";
import { CheckCircle2, CheckSquare, Layout, Users, Zap } from "lucide-react";

export function LandingPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background selection:bg-primary/20">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border/40 backdrop-blur sticky top-0 z-50 bg-background/80">
        <Link href="/" className="flex items-center justify-center gap-2">
          <img src={`${basePath}/logo.svg`} alt="Logo" className="h-6 w-6" />
          <span className="font-bold tracking-tight">Team Task Manager</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Sign In
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="rounded-full shadow-sm hover-elevate">Get Started</Button>
          </Link>
        </nav>
      </header>
      
      <main className="flex-1">
        <section className="w-full py-24 md:py-32 lg:py-48 xl:py-56 relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4 max-w-[800px]">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl/none text-balance">
                  Align your team, <br className="hidden sm:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                    hit your deadlines.
                  </span>
                </h1>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  A clean, productivity-focused workspace where small teams create projects, assign tasks, and track status with zero friction.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link href="/sign-up">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-md hover-elevate rounded-full">
                    Start for free
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base rounded-full hover:bg-secondary">
                    Sign in to your team
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-20 md:py-32 bg-secondary/30 border-y border-border/40">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <div className="inline-block rounded-full bg-primary/10 px-3 py-1 text-sm text-primary font-medium tracking-tight">
                Everything you need
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Simplicity meets power.
              </h2>
            </div>
            
            <div className="mx-auto grid max-w-5xl items-start gap-8 md:grid-cols-2 lg:gap-12">
              <div className="grid gap-2 border bg-card p-8 rounded-2xl shadow-sm hover-elevate transition-all">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Layout className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Projects & Teams</h3>
                <p className="text-muted-foreground">
                  Organize work into distinct projects. Add your team members and collaborate in shared spaces.
                </p>
              </div>
              
              <div className="grid gap-2 border bg-card p-8 rounded-2xl shadow-sm hover-elevate transition-all">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Role-Based Access</h3>
                <p className="text-muted-foreground">
                  Project admins have full control. Members focus on updating the status of tasks assigned to them.
                </p>
              </div>
              
              <div className="grid gap-2 border bg-card p-8 rounded-2xl shadow-sm hover-elevate transition-all">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <CheckSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Status Tracking</h3>
                <p className="text-muted-foreground">
                  Visual kanban boards and clean lists make it instantly clear what's happening and what's next.
                </p>
              </div>
              
              <div className="grid gap-2 border bg-card p-8 rounded-2xl shadow-sm hover-elevate transition-all">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Productivity Dashboard</h3>
                <p className="text-muted-foreground">
                  Your personal command center. See upcoming tasks, overdue items, and a real-time activity feed.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4 md:px-6">
          <div className="flex items-center gap-2">
            <img src={`${basePath}/logo.svg`} alt="Logo" className="h-5 w-5 grayscale opacity-70" />
            <p className="text-sm leading-loose text-muted-foreground font-medium">
              Team Task Manager
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for focused teams.
          </p>
        </div>
      </footer>
    </div>
  );
}
