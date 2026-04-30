import { useGetDashboard } from "@workspace/api-client-react";
import { AppLayout } from "@/components/app-layout";
import { RequireAuth } from "@/components/require-auth";
import { TaskCard } from "@/components/task-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertCircle, CheckSquare, Clock, FolderKanban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

const COLORS = ["#0EA5E9", "#F59E0B", "#10B981"]; // todo, in_progress, done

export function Dashboard() {
  const { data, isLoading } = useGetDashboard();

  return (
    <RequireAuth>
      <AppLayout>
        <div className="flex flex-col gap-8 pb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your work and team activity.</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
            </div>
          ) : data ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card className="hover-elevate transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalProjects}</div>
                </CardContent>
              </Card>
              <Card className="hover-elevate transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">My Open Tasks</CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.myOpenTasks}</div>
                </CardContent>
              </Card>
              <Card className="hover-elevate transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{data.myOverdueTasks}</div>
                </CardContent>
              </Card>
              <Card className="hover-elevate transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed This Week</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-500">{data.myCompletedThisWeek}</div>
                </CardContent>
              </Card>
              <Card className="hover-elevate transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalTasks}</div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  My Priorities
                </CardTitle>
                <CardDescription>
                  Tasks needing your attention soon.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                  </div>
                ) : data?.upcomingTasks.length === 0 && data?.overdueTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center border-2 border-dashed rounded-xl p-8 bg-muted/20">
                    <CheckSquare className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                    <h3 className="font-semibold text-lg">You're all caught up!</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      No upcoming or overdue tasks assigned to you. Enjoy the breather.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {data && data.overdueTasks.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 uppercase tracking-wider">
                          <AlertCircle className="w-4 h-4" /> Overdue
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {data.overdueTasks.slice(0, 4).map(task => (
                            <TaskCard key={task.id} task={task} showProject />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {data && data.upcomingTasks.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {data.upcomingTasks.slice(0, 4).map(task => (
                            <TaskCard key={task.id} task={task} showProject />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 flex flex-col">
              <CardHeader>
                <CardTitle>Task Status</CardTitle>
                <CardDescription>
                  Overall completion across all projects.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center min-h-[300px]">
                {isLoading ? (
                  <Skeleton className="w-full h-full rounded-full max-w-[250px] max-h-[250px] mx-auto" />
                ) : data && data.totalTasks > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.statusBreakdown.map(item => ({
                            name: item.status.replace("_", " ").toUpperCase(),
                            value: item.count
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {data.statusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8">
                    <PieChart className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
                    <p className="text-sm text-muted-foreground">No tasks created yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    </RequireAuth>
  );
}
