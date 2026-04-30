import { Router, type IRouter } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  projectsTable,
  projectMembersTable,
  tasksTable,
  usersTable,
  activityTable,
} from "@workspace/db";
import {
  CreateProjectBody,
  UpdateProjectBody,
  ListProjectsResponse,
  GetProjectResponse,
  UpdateProjectResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getProjectRole } from "../lib/projectAuth";

const router: IRouter = Router();

async function buildProjectSummaries(userId: string) {
  const memberships = await db
    .select({
      project: projectsTable,
      role: projectMembersTable.role,
    })
    .from(projectMembersTable)
    .innerJoin(
      projectsTable,
      eq(projectMembersTable.projectId, projectsTable.id),
    )
    .where(eq(projectMembersTable.userId, userId))
    .orderBy(projectsTable.createdAt);

  if (memberships.length === 0) return [];

  const projectIds = memberships.map((m) => m.project.id);

  const memberCounts = await db
    .select({
      projectId: projectMembersTable.projectId,
      count: sql<number>`count(*)::int`,
    })
    .from(projectMembersTable)
    .where(inArray(projectMembersTable.projectId, projectIds))
    .groupBy(projectMembersTable.projectId);

  const taskRows = await db
    .select({
      projectId: tasksTable.projectId,
      status: tasksTable.status,
      dueDate: tasksTable.dueDate,
    })
    .from(tasksTable)
    .where(inArray(tasksTable.projectId, projectIds));

  const memberCountMap = new Map(
    memberCounts.map((m) => [m.projectId, m.count]),
  );
  const now = new Date();

  return memberships.map(({ project, role }) => {
    let total = 0,
      todo = 0,
      inp = 0,
      done = 0,
      overdue = 0;
    for (const t of taskRows) {
      if (t.projectId !== project.id) continue;
      total++;
      if (t.status === "todo") todo++;
      else if (t.status === "in_progress") inp++;
      else if (t.status === "done") done++;
      if (t.status !== "done" && t.dueDate && t.dueDate < now) overdue++;
    }
    return {
      ...project,
      myRole: role,
      memberCount: memberCountMap.get(project.id) ?? 0,
      totalTasks: total,
      todoCount: todo,
      inProgressCount: inp,
      doneCount: done,
      overdueCount: overdue,
    };
  });
}

router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const summaries = await buildProjectSummaries(req.userId!);
  res.json(ListProjectsResponse.parse(summaries));
});

router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = req.userId!;
  const [project] = await db
    .insert(projectsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color,
      ownerId: userId,
    })
    .returning();
  if (!project) {
    res.status(500).json({ error: "Failed to create project" });
    return;
  }
  await db.insert(projectMembersTable).values({
    projectId: project.id,
    userId,
    role: "admin",
  });
  await db.insert(activityTable).values({
    kind: "project_created",
    projectId: project.id,
    actorId: userId,
    message: `created project "${project.name}"`,
  });
  res.status(201).json(project);
});

router.get(
  "/projects/:projectId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const projectId = String(req.params.projectId);
    const role = await getProjectRole(projectId, userId);
    if (!role) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const summaries = await buildProjectSummaries(userId);
    const summary = summaries.find((s) => s.id === projectId);
    if (!summary) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const memberRows = await db
      .select({
        member: projectMembersTable,
        user: usersTable,
      })
      .from(projectMembersTable)
      .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
      .where(eq(projectMembersTable.projectId, projectId));
    const members = memberRows.map(({ member, user }) => ({
      ...member,
      user,
    }));
    res.json(GetProjectResponse.parse({ ...summary, members }));
  },
);

router.patch(
  "/projects/:projectId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const projectId = String(req.params.projectId);
    const role = await getProjectRole(projectId, userId);
    if (!role) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    const parsed = UpdateProjectBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined)
      updates.description = parsed.data.description;
    if (parsed.data.color !== undefined) updates.color = parsed.data.color;
    if (Object.keys(updates).length === 0) {
      const [existing] = await db
        .select()
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId));
      res.json(UpdateProjectResponse.parse(existing));
      return;
    }
    const [updated] = await db
      .update(projectsTable)
      .set(updates)
      .where(eq(projectsTable.id, projectId))
      .returning();
    res.json(UpdateProjectResponse.parse(updated));
  },
);

router.delete(
  "/projects/:projectId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const projectId = String(req.params.projectId);
    const role = await getProjectRole(projectId, userId);
    if (!role) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    if (role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
    res.sendStatus(204);
  },
);

export default router;
