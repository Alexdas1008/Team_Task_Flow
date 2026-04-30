import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { useUpdateTask, useDeleteTask, getListProjectTasksQueryKey, getListMyTasksQueryKey, getGetDashboardQueryKey, TaskStatus, TaskPriority, TaskWithProject } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertCircle, CalendarIcon, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { EditTaskDialog } from "./edit-task-dialog";

interface TaskCardProps {
  task: TaskWithProject | any;
  isAdmin?: boolean;
  isAssignee?: boolean;
  showProject?: boolean;
}

export function TaskCard({ task, isAdmin = false, isAssignee = false, showProject = false }: TaskCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const canEdit = isAdmin;
  const canUpdateStatus = isAdmin || isAssignee;

  const handleStatusChange = (status: string) => {
    updateTask.mutate(
      { taskId: task.id, data: { status: status as TaskStatus } },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          queryClient.invalidateQueries({ queryKey: getListProjectTasksQueryKey(task.projectId) });
          queryClient.invalidateQueries({ queryKey: getListMyTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to update status", variant: "destructive" });
        }
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    
    deleteTask.mutate(
      { taskId: task.id },
      {
        onSuccess: () => {
          toast({ title: "Task deleted" });
          queryClient.invalidateQueries({ queryKey: getListProjectTasksQueryKey(task.projectId) });
          queryClient.invalidateQueries({ queryKey: getListMyTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to delete task", variant: "destructive" });
        }
      }
    );
  };

  const priorityColors = {
    [TaskPriority.low]: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    [TaskPriority.medium]: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    [TaskPriority.high]: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };

  const statusOptions = [
    { value: TaskStatus.todo, label: "To Do" },
    { value: TaskStatus.in_progress, label: "In Progress" },
    { value: TaskStatus.done, label: "Done" },
  ];

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && task.status !== TaskStatus.done;

  return (
    <>
      <Card className={`group relative flex flex-col hover-elevate transition-all ${task.status === TaskStatus.done ? 'opacity-70' : ''}`}>
        <CardHeader className="p-4 pb-2 flex-row justify-between items-start space-y-0 gap-2">
          <div className="flex flex-col gap-1.5 overflow-hidden">
            {showProject && task.project && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: task.project.color }}
                />
                <span className="truncate">{task.project.name}</span>
              </div>
            )}
            <h4 className={`font-semibold leading-tight ${task.status === TaskStatus.done ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </h4>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0 pb-3 flex-1">
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {task.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-auto">
            <Badge variant="outline" className={`text-xs border-transparent font-medium ${priorityColors[task.priority as keyof typeof priorityColors]}`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            </Badge>
            {task.dueDate && (
              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-destructive border-destructive/30 bg-destructive/5' : 'text-muted-foreground'}`}>
                {isOverdue ? <AlertCircle className="w-3 h-3" /> : <CalendarIcon className="w-3 h-3" />}
                {format(new Date(task.dueDate), "MMM d")}
              </Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-3 border-t bg-muted/30 flex items-center justify-between mt-auto">
          {canUpdateStatus ? (
            <Select value={task.status} onValueChange={handleStatusChange}>
              <SelectTrigger className={`h-8 text-xs font-medium w-[120px] ${
                task.status === TaskStatus.done ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50' :
                task.status === TaskStatus.in_progress ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50' :
                ''
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary" className="font-medium">
              {statusOptions.find(o => o.value === task.status)?.label}
            </Badge>
          )}
          
          <div className="ml-auto">
            {task.assignee ? (
              <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border/50">
                <AvatarImage src={task.assignee.imageUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {task.assignee.name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border/50 bg-muted flex items-center justify-center">
                <AvatarFallback className="text-[10px] bg-transparent text-muted-foreground border-dashed border-2 border-muted-foreground/30">
                  +
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </CardFooter>
      </Card>

      {isAdmin && (
        <EditTaskDialog 
          task={task} 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen} 
        />
      )}
    </>
  );
}
