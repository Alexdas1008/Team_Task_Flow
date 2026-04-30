import { useListProjects } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { RequireAuth } from "@/components/require-auth";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { CalendarIcon, CheckCircle2, FolderKanban, Users } from "lucide-react";
import { format } from "date-fns";

export function Projects() {
  const { data: projects, isLoading } = useListProjects();

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex flex-col gap-6 h-full pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
              <p className="text-muted-foreground mt-1">Manage and organize your team's work.</p>
            </div>
            <CreateProjectDialog />
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {projects.map((project) => {
                const completionPercentage = project.totalTasks > 0 
                  ? Math.round((project.doneCount / project.totalTasks) * 100) 
                  : 0;

                return (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <Card className="h-full flex flex-col hover-elevate cursor-pointer border-border/50 hover:border-primary/50 transition-all overflow-hidden group">
                      <div className="h-2 w-full" style={{ backgroundColor: project.color }} />
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                            {project.name}
                          </CardTitle>
                          {project.myRole === 'admin' && (
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold bg-primary/5 text-primary border-primary/20 shrink-0">
                              Admin
                            </Badge>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                            {project.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-end gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 
                              Progress
                            </span>
                            <span className="font-semibold">{completionPercentage}%</span>
                          </div>
                          <Progress value={completionPercentage} className="h-1.5" />
                        </div>
                      </CardContent>
                      <CardFooter className="p-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            <span>{project.memberCount}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>{project.doneCount}/{project.totalTasks}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>{format(new Date(project.createdAt), "MMM yyyy")}</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[400px] text-center border-2 border-dashed rounded-xl p-8 bg-muted/20">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FolderKanban className="h-8 w-8 text-primary opacity-80" />
              </div>
              <h3 className="font-bold text-2xl tracking-tight">No projects yet</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto mb-6">
                Projects are where your team organizes tasks. Create your first project to get started.
              </p>
              <CreateProjectDialog />
            </div>
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  );
}

// Needed to fix unresolved import in this file
import { CheckSquare } from "lucide-react";
