import { pgTable, text, timestamp, uuid, integer, decimal, boolean, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'moderator', 'admin']);
export const recordStatusEnum = pgEnum('record_status', ['pending', 'approved', 'rejected']);
export const waterBodyTypeEnum = pgEnum('water_body_type', ['river', 'lake', 'sea', 'canal', 'reservoir', 'pond', 'other']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebase_uid: text('firebase_uid').notNull().unique(),
  email: text('email').notNull().unique(),
  display_name: text('display_name'),
  photo_url: text('photo_url'),
  phone: text('phone'),
  role: userRoleEnum('role').default('user').notNull(),
  bio: text('bio'),
  location: text('location'),
  website: text('website'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Species table
export const species = pgTable('species', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  common_name_ro: text('common_name_ro'),
  scientific_name: text('scientific_name'),
  description: text('description'),
  image_url: text('image_url'),
  min_weight_kg: decimal('min_weight_kg', { precision: 5, scale: 2 }),
  max_weight_kg: decimal('max_weight_kg', { precision: 5, scale: 2 }),
  habitat: text('habitat'),
  season: text('season'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Water bodies table (polygons)
export const waterBodies = pgTable('water_bodies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: waterBodyTypeEnum('type').notNull(),
  county: text('county'),
  region: text('region'),
  description: text('description'),
  geom: text('geom'), // PostGIS geometry - Polygon, 4326
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Locations table (points)
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  water_body_id: uuid('water_body_id').references(() => waterBodies.id),
  geom: text('geom'), // PostGIS geometry - Point, 4326
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Amenities table (points)
export const amenities = pgTable('amenities', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'parking', 'facilities', 'tackle_shop'
  description: text('description'),
  geom: text('geom'), // PostGIS geometry - Point, 4326
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
  coordinates: text('coordinates'), // PostGIS geometry - Point, 4326
  photo_url: text('photo_url'),
  notes: text('notes'),
  status: recordStatusEnum('status').default('pending').notNull(),
  rejected_reason: text('rejected_reason'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Leaderboards table
export const leaderboards = pgTable('leaderboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  species_id: uuid('species_id').references(() => species.id).notNull(),
  user_id: uuid('user_id').references(() => users.id).notNull(),
  record_id: uuid('record_id').references(() => records.id).notNull(),
  weight_kg: decimal('weight_kg', { precision: 5, scale: 2 }).notNull(),
  rank: integer('rank').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Export schema for drizzle
export const schema = {
  users,
  species,
  waterBodies,
  locations,
  amenities,
  records,
  leaderboards,
};
