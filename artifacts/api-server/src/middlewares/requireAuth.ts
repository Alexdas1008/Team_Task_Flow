import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  const userId =
    (auth?.sessionClaims as { userId?: string } | undefined)?.userId ??
    auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.userId = userId;

  // Upsert the user record so we always have name/email available for joins.
  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    if (!existing) {
      const cu = await clerkClient.users.getUser(userId);
      const email =
        cu.emailAddresses.find((e) => e.id === cu.primaryEmailAddressId)
          ?.emailAddress ??
        cu.emailAddresses[0]?.emailAddress ??
        `${userId}@unknown`;
      const name =
        [cu.firstName, cu.lastName].filter(Boolean).join(" ") ||
        cu.username ||
        email;
      await db
        .insert(usersTable)
        .values({
          id: userId,
          email,
          name,
          imageUrl: cu.imageUrl ?? null,
        })
        .onConflictDoNothing();
    }
  } catch (err) {
    req.log.error({ err }, "Failed to upsert user from Clerk");
  }

  next();
}
