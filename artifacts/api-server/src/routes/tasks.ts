import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  tasksTable,
  projectsTable,
  projectMembersTable,
  usersTable,
  activityTable,
} from "@workspace/db";
import {
  CreateTaskBody,
  UpdateTaskBody,
  ListProjectTasksResponse,
  GetTaskResponse,
  UpdateTaskResponse,
  ListMyTasksResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getProjectRole } from "../lib/projectAuth";

const router: IRouter = Router();

async function loadTaskWithAssignee(taskId: string) {
  const rows = await db
    .select({
      task: tasksTable,
      assignee: usersTable,
    })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .where(eq(tasksTable.id, taskId));
  if (rows.length === 0) return null;
  const { task, assignee } = rows[0]!;
  return { ...task, assignee: assignee ?? null };
}

router.get(
  "/projects/:projectId/tasks",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const projectId = String(req.params.projectId);
    const role = await getProjectRole(projectId, userId);
    if (!role) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const rows = await db
      .select({
        task: tasksTable,
        assignee: usersTable,
      })
      .from(tasksTable)
      .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
      .where(eq(tasksTable.projectId, projectId))
      .orderBy(desc(tasksTable.createdAt));
    const tasks = rows.map(({ task, assignee }) => ({
      ...task,
      assignee: assignee ?? null,
    }));
    res.json(ListProjectTasksResponse.parse(tasks));
  },
);

router.post(
  "/projects/:projectId/tasks",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const projectId = String(req.params.projectId);
    const role = await getProjectRole(projectId, userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    const parsed = CreateTaskBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (parsed.data.assigneeId) {
      const assigneeRole = await getProjectRole(
        projectId,
        parsed.data.assigneeId,
      );
      if (!assigneeRole) {
        res.status(400).json({ error: "Assignee is not a project member" });
        return;
      }
    }
    const [task] = await db
      .insert(tasksTable)
      .values({
        projectId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assigneeId: parsed.data.assigneeId ?? null,
        dueDate: parsed.data.dueDate ?? null,
        createdById: userId,
      })
      .returning();
    if (!task) {
      res.status(500).json({ error: "Failed to create task" });
      return;
    }
    await db.insert(activityTable).values({
      kind: "task_created",
      projectId,
      actorId: userId,
      targetTaskId: task.id,
      targetTaskTitle: task.title,
      message: `created task "${task.title}"`,
    });
    if (task.assigneeId) {
      const [assignee] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, task.assigneeId));
      await db.insert(activityTable).values({
        kind: "task_assigned",
        projectId,
        actorId: userId,
        targetTaskId: task.id,
        targetTaskTitle: task.title,
        message: `assigned "${task.title}" to ${assignee?.name ?? "a member"}`,
      });
    }
    const full = await loadTaskWithAssignee(task.id);
    res.status(201).json(GetTaskResponse.parse(full));
  },
);

router.get("/tasks/:taskId", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const taskId = String(req.params.taskId);
  const full = await loadTaskWithAssignee(taskId);
  if (!full) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const role = await getProjectRole(full.projectId, userId);
  if (!role) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(GetTaskResponse.parse(full));
});

router.patch(
  "/tasks/:taskId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const taskId = String(req.params.taskId);
    const existing = await loadTaskWithAssignee(taskId);
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const role = await getProjectRole(existing.projectId, userId);
    if (!role) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const parsed = UpdateTaskBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const isAssignee = existing.assigneeId === userId;
    if (role !== "admin") {
      // Members may only update status, and only on tasks assigned to them.
      const allowedKeys = ["status"];
      const requestedKeys = Object.keys(parsed.data);
      const onlyStatus = requestedKeys.every((k) => allowedKeys.includes(k));
      if (!onlyStatus || !isAssignee) {
        res
          .status(403)
          .json({ error: "Only the assignee can change task status; only admins can edit other fields." });
        return;
      }
    }
    if (
      parsed.data.assigneeId !== undefined &&
      parsed.data.assigneeId !== null
    ) {
      const assigneeRole = await getProjectRole(
        existing.projectId,
        parsed.data.assigneeId,
      );
      if (!assigneeRole) {
        res.status(400).json({ error: "Assignee is not a project member" });
        return;
      }
    }
    const updates: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.priority !== undefined)
      updates.priority = parsed.data.priority;
    if (parsed.data.assigneeId !== undefined)
      updates.assigneeId = parsed.data.assigneeId;
    if (parsed.data.dueDate !== undefined) updates.dueDate = parsed.data.dueDate;

    const [updated] = await db
      .update(tasksTable)
      .set(updates)
      .where(eq(tasksTable.id, taskId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    if (
      parsed.data.status !== undefined &&
      parsed.data.status !== existing.status
    ) {
      await db.insert(activityTable).values({
        kind: "task_status_changed",
        projectId: existing.projectId,
        actorId: userId,
        targetTaskId: updated.id,
        targetTaskTitle: updated.title,
        message: `moved "${updated.title}" to ${updated.status.replace("_", " ")}`,
      });
    }
    if (
      parsed.data.assigneeId !== undefined &&
      parsed.data.assigneeId !== existing.assigneeId &&
      parsed.data.assigneeId !== null
    ) {
      const [assignee] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, parsed.data.assigneeId));
      await db.insert(activityTable).values({
        kind: "task_assigned",
        projectId: existing.projectId,
        actorId: userId,
        targetTaskId: updated.id,
        targetTaskTitle: updated.title,
        message: `assigned "${updated.title}" to ${assignee?.name ?? "a member"}`,
      });
    }

    const full = await loadTaskWithAssignee(taskId);
    res.json(UpdateTaskResponse.parse(full));
  },
);

router.delete(
  "/tasks/:taskId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const taskId = String(req.params.taskId);
    const existing = await loadTaskWithAssignee(taskId);
    if (!existing) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const role = await getProjectRole(existing.projectId, userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
    res.sendStatus(204);
  },
);

router.get("/my-tasks", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const rows = await db
    .select({
      task: tasksTable,
      assignee: usersTable,
      project: projectsTable,
    })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(eq(tasksTable.assigneeId, userId))
    .orderBy(desc(tasksTable.createdAt));
  const tasks = rows.map(({ task, assignee, project }) => ({
    ...task,
    assignee: assignee ?? null,
    project,
  }));
  res.json(ListMyTasksResponse.parse(tasks));
});

export default router;
