import { Router, type IRouter } from "express";
import { and, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectMembersTable,
  tasksTable,
  usersTable,
  activityTable,
} from "@workspace/db";
import {
  GetDashboardResponse,
  GetRecentActivityResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const memberships = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));
  const projectIds = memberships.map((m) => m.projectId);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (projectIds.length === 0) {
    res.json(
      GetDashboardResponse.parse({
        totalProjects: 0,
        totalTasks: 0,
        myOpenTasks: 0,
        myOverdueTasks: 0,
        myCompletedThisWeek: 0,
        statusBreakdown: [
          { status: "todo", count: 0 },
          { status: "in_progress", count: 0 },
          { status: "done", count: 0 },
        ],
        upcomingTasks: [],
        overdueTasks: [],
      }),
    );
    return;
  }

  const allTasks = await db
    .select()
    .from(tasksTable)
    .where(inArray(tasksTable.projectId, projectIds));

  const myTasks = allTasks.filter((t) => t.assigneeId === userId);

  const statusCounts: Record<string, number> = {
    todo: 0,
    in_progress: 0,
    done: 0,
  };
  for (const t of allTasks) statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;

  const myOpenTasks = myTasks.filter((t) => t.status !== "done").length;
  const myOverdueTasks = myTasks.filter(
    (t) => t.status !== "done" && t.dueDate && t.dueDate < now,
  ).length;
  const myCompletedThisWeek = myTasks.filter(
    (t) => t.status === "done" && t.updatedAt >= weekAgo,
  ).length;

  const upcomingRaw = await db
    .select({
      task: tasksTable,
      assignee: usersTable,
      project: projectsTable,
    })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(
      and(
        inArray(tasksTable.projectId, projectIds),
        eq(tasksTable.assigneeId, userId),
        isNotNull(tasksTable.dueDate),
        gte(tasksTable.dueDate, now),
        lt(tasksTable.dueDate, weekAhead),
      ),
    )
    .orderBy(tasksTable.dueDate)
    .limit(8);

  const overdueRaw = await db
    .select({
      task: tasksTable,
      assignee: usersTable,
      project: projectsTable,
    })
    .from(tasksTable)
    .leftJoin(usersTable, eq(tasksTable.assigneeId, usersTable.id))
    .innerJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
    .where(
      and(
        inArray(tasksTable.projectId, projectIds),
        eq(tasksTable.assigneeId, userId),
        isNotNull(tasksTable.dueDate),
        lt(tasksTable.dueDate, now),
      ),
    )
    .orderBy(desc(tasksTable.dueDate))
    .limit(8);

  const mapTask = (row: {
    task: typeof tasksTable.$inferSelect;
    assignee: typeof usersTable.$inferSelect | null;
    project: typeof projectsTable.$inferSelect;
  }) => ({
    ...row.task,
    assignee: row.assignee ?? null,
    project: row.project,
  });

  const upcomingTasks = upcomingRaw
    .filter((r) => r.task.status !== "done")
    .map(mapTask);
  const overdueTasks = overdueRaw
    .filter((r) => r.task.status !== "done")
    .map(mapTask);

  res.json(
    GetDashboardResponse.parse({
      totalProjects: projectIds.length,
      totalTasks: allTasks.length,
      myOpenTasks,
      myOverdueTasks,
      myCompletedThisWeek,
      statusBreakdown: [
        { status: "todo", count: statusCounts.todo ?? 0 },
        { status: "in_progress", count: statusCounts.in_progress ?? 0 },
        { status: "done", count: statusCounts.done ?? 0 },
      ],
      upcomingTasks,
      overdueTasks,
    }),
  );
});

router.get("/activity", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;
  const memberships = await db
    .select({ projectId: projectMembersTable.projectId })
    .from(projectMembersTable)
    .where(eq(projectMembersTable.userId, userId));
  const projectIds = memberships.map((m) => m.projectId);
  if (projectIds.length === 0) {
    res.json(GetRecentActivityResponse.parse([]));
    return;
  }
  const rows = await db
    .select({
      activity: activityTable,
      actor: usersTable,
      project: projectsTable,
    })
    .from(activityTable)
    .innerJoin(usersTable, eq(activityTable.actorId, usersTable.id))
    .innerJoin(projectsTable, eq(activityTable.projectId, projectsTable.id))
    .where(inArray(activityTable.projectId, projectIds))
    .orderBy(desc(activityTable.createdAt))
    .limit(30);
  const out = rows.map(({ activity, actor, project }) => ({
    id: activity.id,
    kind: activity.kind,
    projectId: activity.projectId,
    projectName: project.name,
    actorId: actor.id,
    actorName: actor.name,
    targetTaskId: activity.targetTaskId,
    targetTaskTitle: activity.targetTaskTitle,
    message: activity.message,
    createdAt: activity.createdAt,
  }));
  res.json(GetRecentActivityResponse.parse(out));
});

export default router;
