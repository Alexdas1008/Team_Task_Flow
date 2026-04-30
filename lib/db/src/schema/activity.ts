import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const activityTable = pgTable("activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind", {
    enum: [
      "task_created",
      "task_status_changed",
      "task_assigned",
      "project_created",
      "member_added",
    ],
  }).notNull(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  actorId: text("actor_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  targetTaskId: uuid("target_task_id"),
  targetTaskTitle: text("target_task_title"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Activity = typeof activityTable.$inferSelect;
