import { db, projectMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type ProjectRole = "admin" | "member";

export async function getProjectRole(
  projectId: string,
  userId: string,
): Promise<ProjectRole | null> {
  const [m] = await db
    .select({ role: projectMembersTable.role })
    .from(projectMembersTable)
    .where(
      and(
        eq(projectMembersTable.projectId, projectId),
        eq(projectMembersTable.userId, userId),
      ),
    );
  return (m?.role as ProjectRole | undefined) ?? null;
}
