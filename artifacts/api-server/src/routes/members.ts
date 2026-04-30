import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  projectMembersTable,
  projectsTable,
  usersTable,
  activityTable,
} from "@workspace/db";
import {
  AddProjectMemberBody,
  UpdateProjectMemberBody,
  ListProjectMembersResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { getProjectRole } from "../lib/projectAuth";

const router: IRouter = Router();

router.get(
  "/projects/:projectId/members",
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
        member: projectMembersTable,
        user: usersTable,
      })
      .from(projectMembersTable)
      .innerJoin(usersTable, eq(projectMembersTable.userId, usersTable.id))
      .where(eq(projectMembersTable.projectId, projectId));
    const members = rows.map(({ member, user }) => ({ ...member, user }));
    res.json(ListProjectMembersResponse.parse(members));
  },
);

router.post(
  "/projects/:projectId/members",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const projectId = String(req.params.projectId);
    const role = await getProjectRole(projectId, userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    const parsed = AddProjectMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, parsed.data.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const [member] = await db
      .insert(projectMembersTable)
      .values({
        projectId,
        userId: parsed.data.userId,
        role: parsed.data.role,
      })
      .onConflictDoUpdate({
        target: [projectMembersTable.projectId, projectMembersTable.userId],
        set: { role: parsed.data.role },
      })
      .returning();
    if (!member) {
      res.status(500).json({ error: "Failed to add member" });
      return;
    }
    await db.insert(activityTable).values({
      kind: "member_added",
      projectId,
      actorId: userId,
      message: `added ${user.name} to ${project.name}`,
    });
    res.status(201).json({ ...member, user });
  },
);

router.patch(
  "/projects/:projectId/members/:memberId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const projectId = String(req.params.projectId);
    const memberId = String(req.params.memberId);
    const role = await getProjectRole(projectId, userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    const parsed = UpdateProjectMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [updated] = await db
      .update(projectMembersTable)
      .set({ role: parsed.data.role })
      .where(
        and(
          eq(projectMembersTable.id, memberId),
          eq(projectMembersTable.projectId, projectId),
        ),
      )
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updated.userId));
    res.json({ ...updated, user });
  },
);

router.delete(
  "/projects/:projectId/members/:memberId",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.userId!;
    const projectId = String(req.params.projectId);
    const memberId = String(req.params.memberId);
    const role = await getProjectRole(projectId, userId);
    if (role !== "admin") {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    const [target] = await db
      .select()
      .from(projectMembersTable)
      .where(
        and(
          eq(projectMembersTable.id, memberId),
          eq(projectMembersTable.projectId, projectId),
        ),
      );
    if (!target) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId));
    if (target.userId === project?.ownerId) {
      res.status(400).json({ error: "Cannot remove the project owner" });
      return;
    }
    await db
      .delete(projectMembersTable)
      .where(eq(projectMembersTable.id, memberId));
    res.sendStatus(204);
  },
);

export default router;
