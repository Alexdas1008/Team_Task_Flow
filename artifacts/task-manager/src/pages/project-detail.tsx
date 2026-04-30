import { useState } from "react";
import { useRoute } from "wouter";
import { 
  useGetProject, 
  getGetProjectQueryKey,
  useListProjectTasks,
  getListProjectTasksQueryKey,
  useGetMe,
  TaskStatus,
  TaskPriority
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { RequireAuth } from "@/components/require-auth";
import { TaskCard } from "@/components/task-card";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { ManageMembers } from "@/components/manage-members";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LayoutList, Columns3, Users, Settings, Filter } from "lucide-react";

export function ProjectDetail() {
  const [, params] = useRoute("/projects/:projectId");
  const projectId = params?.projectId || "";
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  const { data: me } = useGetMe();
  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });
  const { data: tasks = [], isLoading: isTasksLoading } = useListProjectTasks(projectId, {
    query: { enabled: !!projectId, queryKey: getListProjectTasksQueryKey(projectId) }
  });

  const isAdmin = project?.myRole === "admin";
  const isLoading = isProjectLoading || isTasksLoading;

  if (isLoading && !project) {
    return (
      <RequireAuth>
        <AppLayout>
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-8 w-full max-w-md" />
            <div className="grid grid-cols-3 gap-6">
              <Skeleton className="h-64 col-span-1" />
              <Skeleton className="h-64 col-span-1" />
              <Skeleton className="h-64 col-span-1" />
            </div>
          </div>
        </AppLayout>
      </RequireAuth>
    );
  }

  if (!project) return null;

  const filteredTasks = filterAssignee === "all" 
    ? tasks 
    : filterAssignee === "me" 
      ? tasks.filter(t => t.assigneeId === me?.id)
      : tasks.filter(t => t.assigneeId === filterAssignee);

  const todoTasks = filteredTasks.filter(t => t.status === TaskStatus.todo);
  const inProgressTasks = filteredTasks.filter(t => t.status === TaskStatus.in_progress);
  const doneTasks = filteredTasks.filter(t => t.status === TaskStatus.done);

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex flex-col gap-6 h-[calc(100vh-6rem)]">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-md shadow-sm" 
                  style={{ backgroundColor: project.color }}
                />
                <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
                {isAdmin && (
                  <Badge variant="outline" className="uppercase tracking-wider font-semibold bg-primary/5 text-primary border-primary/20">
                    Admin
                  </Badge>
                )}
              </div>
              {project.description && (
                <p className="text-muted-foreground max-w-3xl">{project.description}</p>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button variant="outline" onClick={() => setIsEditOpen(true)} className="hover-elevate">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              )}
              {isAdmin && <CreateTaskDialog projectId={project.id} />}
            </div>
          </div>

          <Tabs defaultValue="board" className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between border-b pb-2 shrink-0">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="board" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Columns3 className="w-4 h-4 mr-2" /> Board
                </TabsTrigger>
                <TabsTrigger value="list" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <LayoutList className="w-4 h-4 mr-2" /> List
                </TabsTrigger>
                <TabsTrigger value="members" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Users className="w-4 h-4 mr-2" /> Members ({project.members.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="board" className="flex-1 mt-6 h-full overflow-hidden focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
                {/* To Do Column */}
                <div className="flex flex-col bg-muted/30 rounded-xl border border-border/50 h-full overflow-hidden">
                  <div className="p-4 border-b border-border/50 bg-background/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-300">To Do</h3>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">{todoTasks.length}</Badge>
                  </div>
                  <div className="p-3 overflow-y-auto flex-1 space-y-3">
                    {todoTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        isAdmin={isAdmin} 
                        isAssignee={task.assigneeId === me?.id} 
                      />
                    ))}
                    {isAdmin && (
                      <CreateTaskDialog 
                        projectId={project.id} 
                        initialStatus={TaskStatus.todo}
                        trigger={
                          <Button variant="ghost" className="w-full border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5">
                            + Add Task
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>

                {/* In Progress Column */}
                <div className="flex flex-col bg-muted/30 rounded-xl border border-border/50 h-full overflow-hidden">
                  <div className="p-4 border-b border-border/50 bg-background/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <h3 className="font-semibold text-sm uppercase tracking-wider text-blue-700 dark:text-blue-400">In Progress</h3>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">{inProgressTasks.length}</Badge>
                  </div>
                  <div className="p-3 overflow-y-auto flex-1 space-y-3">
                    {inProgressTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        isAdmin={isAdmin} 
                        isAssignee={task.assigneeId === me?.id} 
                      />
                    ))}
                  </div>
                </div>

                {/* Done Column */}
                <div className="flex flex-col bg-muted/30 rounded-xl border border-border/50 h-full overflow-hidden">
                  <div className="p-4 border-b border-border/50 bg-background/50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <h3 className="font-semibold text-sm uppercase tracking-wider text-green-700 dark:text-green-400">Done</h3>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">{doneTasks.length}</Badge>
                  </div>
                  <div className="p-3 overflow-y-auto flex-1 space-y-3">
                    {doneTasks.map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        isAdmin={isAdmin} 
                        isAssignee={task.assigneeId === me?.id} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="list" className="flex-1 mt-6 h-full overflow-y-auto focus-visible:outline-none">
              <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/30 text-sm font-semibold text-muted-foreground">
                  <div className="col-span-5 sm:col-span-6">Task</div>
                  <div className="col-span-3 sm:col-span-2 hidden sm:block">Assignee</div>
                  <div className="col-span-4 sm:col-span-2">Status</div>
                  <div className="col-span-3 sm:col-span-2 hidden sm:block text-right">Priority</div>
                </div>
                <div className="divide-y">
                  {tasks.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No tasks found</div>
                  ) : (
                    tasks.map(task => (
                      <div key={task.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/10 transition-colors">
                        <div className="col-span-8 sm:col-span-6 font-medium">
                          {task.title}
                        </div>
                        <div className="col-span-4 sm:col-span-2 hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                          {task.assignee ? task.assignee.name : "Unassigned"}
                        </div>
                        <div className="col-span-4 sm:col-span-2">
                          <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                            {task.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="col-span-3 sm:col-span-2 hidden sm:flex justify-end">
                          <Badge variant="outline" className={`text-[10px] uppercase font-semibold border-transparent ${
                            task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            task.priority === 'medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="members" className="flex-1 mt-6 h-full overflow-y-auto focus-visible:outline-none">
              <div className="max-w-4xl mx-auto">
                <ManageMembers project={project} isAdmin={isAdmin} />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {isAdmin && (
          <EditProjectDialog 
            project={project} 
            open={isEditOpen} 
            onOpenChange={setIsEditOpen} 
          />
        )}
      </AppLayout>
    </RequireAuth>
  );
}
