import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const monitors = pgTable('monitors', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const checks = pgTable('checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  monitorId: uuid('monitor_id').references(() => monitors.id, { onDelete: 'cascade' }).notNull(),
  statusCode: integer('status_code'),
  responseTimeMs: integer('response_time_ms'),
  isFailure: boolean('is_failure').default(false).notNull(),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});

export const incidents = pgTable('incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  monitorId: uuid('monitor_id').references(() => monitors.id, { onDelete: 'cascade' }).notNull(),
  startedAt: timestamp('started_at').notNull(),
  resolvedAt: timestamp('resolved_at'),
  cause: text('cause'),
});
