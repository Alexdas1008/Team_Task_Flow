import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateTask, 
  useListProjectMembers,
  getListProjectMembersQueryKey,
  getListProjectTasksQueryKey,
  getListMyTasksQueryKey,
  getGetDashboardQueryKey,
  TaskPriority,
  TaskStatus,
  ProjectMember
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(140),
  description: z.string().max(2000).optional(),
  status: z.enum([TaskStatus.todo, TaskStatus.in_progress, TaskStatus.done]),
  priority: z.enum([TaskPriority.low, TaskPriority.medium, TaskPriority.high]),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

interface CreateTaskDialogProps {
  projectId: string;
  initialStatus?: TaskStatus;
  trigger?: React.ReactNode;
}

export function CreateTaskDialog({ projectId, initialStatus = TaskStatus.todo, trigger }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const { data: members = [] } = useListProjectMembers(projectId, {
    query: { enabled: open, queryKey: getListProjectMembersQueryKey(projectId) }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      status: initialStatus,
      priority: TaskPriority.medium,
      assigneeId: null,
      dueDate: null,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createTask.mutate(
      { 
        projectId, 
        data: {
          ...values,
          assigneeId: values.assigneeId === "unassigned" ? null : values.assigneeId,
        } 
      },
      {
        onSuccess: () => {
          toast({ title: "Task created" });
          queryClient.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) });
          queryClient.invalidateQueries({ queryKey: getListMyTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setOpen(false);
          form.reset({ ...form.getValues(), title: "", description: "" });
        },
        onError: () => {
          toast({ title: "Failed to create task", variant: "destructive" });
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="hover-elevate">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>
            Add a new task to the project.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Update landing page copy" {...field} />
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add more details about this task..."
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TaskStatus.todo}>To Do</SelectItem>
                        <SelectItem value={TaskStatus.in_progress}>In Progress</SelectItem>
                        <SelectItem value={TaskStatus.done}>Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TaskPriority.low}>Low</SelectItem>
                        <SelectItem value={TaskPriority.medium}>Medium</SelectItem>
                        <SelectItem value={TaskPriority.high}>High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || "unassigned"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((member: ProjectMember) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
