import { useListMyTasks, TaskStatus, TaskWithProject } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { RequireAuth } from "@/components/require-auth";
import { TaskCard } from "@/components/task-card";
import { Skeleton } from "@/components/ui/skeleton";
import { isPast, isToday } from "date-fns";
import { CheckSquare, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export function MyTasks() {
  const { data: tasks, isLoading } = useListMyTasks();
  const [filter, setFilter] = useState("all");

  const overdueTasks = tasks?.filter(t => 
    t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== TaskStatus.done
  ) || [];

  const todoTasks = tasks?.filter(t => t.status === TaskStatus.todo) || [];
  const inProgressTasks = tasks?.filter(t => t.status === TaskStatus.in_progress) || [];
  const doneTasks = tasks?.filter(t => t.status === TaskStatus.done) || [];

  // Determine which groups to show based on filter
  const showOverdue = (filter === "all" || filter === "overdue") && overdueTasks.length > 0;
  const showTodo = (filter === "all" || filter === "todo") && todoTasks.length > 0;
  const showInProgress = (filter === "all" || filter === "in_progress") && inProgressTasks.length > 0;
  const showDone = (filter === "all" || filter === "done") && doneTasks.length > 0;

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex flex-col gap-8 pb-8 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
              <p className="text-muted-foreground mt-1">All tasks assigned to you across projects.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter tasks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="overdue">Overdue Only</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
                </div>
              </div>
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-10">
              {showOverdue && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <h2 className="text-lg font-bold text-destructive">Overdue</h2>
                    <span className="text-muted-foreground text-sm font-medium ml-2">{overdueTasks.length}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {overdueTasks.map(task => (
                      <TaskCard key={task.id} task={task} showProject isAssignee />
                    ))}
                  </div>
                </section>
              )}

              {showInProgress && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400">In Progress</h2>
                    <span className="text-muted-foreground text-sm font-medium ml-2">{inProgressTasks.length}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {inProgressTasks.map(task => (
                      <TaskCard key={task.id} task={task} showProject isAssignee />
                    ))}
                  </div>
                </section>
              )}

              {showTodo && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <div className="w-3 h-3 rounded-full bg-slate-400" />
                    <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">To Do</h2>
                    <span className="text-muted-foreground text-sm font-medium ml-2">{todoTasks.length}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {todoTasks.map(task => (
                      <TaskCard key={task.id} task={task} showProject isAssignee />
                    ))}
                  </div>
                </section>
              )}

              {showDone && (
                <section className="space-y-4 opacity-70">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <h2 className="text-lg font-bold text-green-700 dark:text-green-400">Completed</h2>
                    <span className="text-muted-foreground text-sm font-medium ml-2">{doneTasks.length}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {doneTasks.map(task => (
                      <TaskCard key={task.id} task={task} showProject isAssignee />
                    ))}
                  </div>
                </section>
              )}
              
              {!showOverdue && !showInProgress && !showTodo && !showDone && (
                <div className="text-center py-12 text-muted-foreground">
                  No tasks match the selected filter.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] text-center border-2 border-dashed rounded-xl p-8 bg-muted/20">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <CheckSquare className="h-8 w-8 text-primary opacity-80" />
              </div>
              <h3 className="font-bold text-2xl tracking-tight">No tasks assigned</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                You don't have any tasks assigned to you right now. When you do, they will appear here.
              </p>
            </div>
          )}
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
