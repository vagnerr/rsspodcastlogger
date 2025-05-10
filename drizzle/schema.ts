import { sqliteTable, AnySQLiteColumn, integer, text, numeric, foreignKey } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const feed = sqliteTable("feed", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	title: text().notNull(),
	topic: text(),
	link: text().notNull(),
	earliest: numeric().notNull(),
	lastCheck: numeric(),
});

export const episode = sqliteTable("episode", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	feedId: integer().notNull().references(() => feed.id),
	title: text().notNull(),
	link: text().notNull(),
	guid: text().notNull(),
	pubDate: numeric().notNull(),
	duration: integer(),
	recorded: numeric(),
});

export const newFeed = sqliteTable("__new_feed", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	title: text().notNull(),
	topic: text(),
	link: text().notNull(),
	earliest: numeric().notNull(),
	lastCheck: numeric(),
	dataOverride: text(),
});

