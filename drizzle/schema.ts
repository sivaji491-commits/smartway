import { pgTable, text, uuid, timestamp, integer } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name').notNull().default(''),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  loginDuration: text('login_duration').notNull().default('01:00:00'),
  assignedDuration: text('assigned_duration').notNull().default('01:00:00'),
  durationSeconds: integer('duration_seconds').notNull().default(3600),
  status: text('status').notNull().default('ACTIVE'),
  timerStatus: text('timer_status').notNull().default('active'),
  sessionStartTime: timestamp('session_start_time', { withTimezone: true }),
  sessionExpireTime: timestamp('session_expire_time', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  remainingTimeSeconds: integer('remaining_time_seconds'),
  disableReason: text('disable_reason'),
  disabledAt: timestamp('disabled_at', { withTimezone: true }),
  lastLoginTime: timestamp('last_login_time', { withTimezone: true }),
  reEnabledAt: timestamp('re_enabled_at', { withTimezone: true }),
  reEnabledBy: text('re_enabled_by'),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

export const earningOpportunities = pgTable('earning_opportunities', {
  id: text('id').primaryKey().default('source-structure-config'),
  heading: text('heading').notNull().default('Source Structure'),
  subtitle: text('subtitle').notNull().default('IG Infra rewards your efforts with a multi-layered system built for financial freedom.'),
  items: text('items').notNull().default('[]'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by').notNull().default('sivaji491@gmail.com'),
});

export type EarningOpportunitiesRecord = typeof earningOpportunities.$inferSelect;
export type NewEarningOpportunitiesRecord = typeof earningOpportunities.$inferInsert;
