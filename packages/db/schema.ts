import { pgTable, text, timestamp, uuid, integer, decimal, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'moderator', 'admin']);
export const recordStatusEnum = pgEnum('record_status', ['pending', 'approved', 'rejected']);
export const waterBodyTypeEnum = pgEnum('water_body_type', ['river', 'lake', 'sea', 'canal', 'reservoir', 'pond', 'other']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebase_uid: text('firebase_uid').notNull().unique(),
  email: text('email').notNull(),
  display_name: text('display_name'),
  phone: text('phone'),
  location: text('location'),
  bio: text('bio'),
  role: userRoleEnum('role').default('user').notNull(),
  email_notifications: boolean('email_notifications').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Species table
export const species = pgTable('species', {
  id: uuid('id').primaryKey().defaultRandom(),
  scientific_name: text('scientific_name').notNull(),
  common_name_ro: text('common_name_ro').notNull(),
  common_name_en: text('common_name_en'),
  description: text('description'),
  habitat_flags: text('habitat_flags').array(), // ['river', 'lake', 'sea']
  photo_url: text('photo_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Water bodies table (polygons)
export const waterBodies = pgTable('water_bodies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: waterBodyTypeEnum('type').notNull(),
  county: text('county'),
  region: text('region'),
  description: text('description'),
  geom: sql`geometry(Polygon, 4326)`.notNull(), // PostGIS geometry
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Locations table (points)
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  water_body_id: uuid('water_body_id').references(() => waterBodies.id),
  geom: sql`geometry(Point, 4326)`.notNull(), // PostGIS geometry
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Amenities table (points)
export const amenities = pgTable('amenities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'parking', 'facilities', 'tackle_shop'
  description: text('description'),
  geom: sql`geometry(Point, 4326)`.notNull(), // PostGIS geometry
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Records table (catches)
export const records = pgTable('records', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  species_id: uuid('species_id').references(() => species.id).notNull(),
  water_body_id: uuid('water_body_id').references(() => waterBodies.id),
  location_id: uuid('location_id').references(() => locations.id),
  weight_kg: decimal('weight_kg', { precision: 5, scale: 2 }).notNull(),
  length_cm: decimal('length_cm', { precision: 5, scale: 1 }),
  captured_at: timestamp('captured_at').notNull(),
  coordinates: sql`geometry(Point, 4326)`.notNull(), // PostGIS geometry
  photo_url: text('photo_url'),
  notes: text('notes'),
  status: recordStatusEnum('status').default('pending').notNull(),
  rejected_reason: text('rejected_reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  action: text('action').notNull(), // 'approve_record', 'reject_record', 'edit_water_body'
  table_name: text('table_name').notNull(),
  record_id: uuid('record_id'),
  old_values: text('old_values'), // JSON string
  new_values: text('new_values'), // JSON string
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Species = typeof species.$inferSelect;
export type NewSpecies = typeof species.$inferInsert;
export type WaterBody = typeof waterBodies.$inferSelect;
export type NewWaterBody = typeof waterBodies.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type Amenity = typeof amenities.$inferSelect;
export type NewAmenity = typeof amenities.$inferInsert;
export type Record = typeof records.$inferSelect;
export type NewRecord = typeof records.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
