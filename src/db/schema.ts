import { boolean } from "drizzle-orm/gel-core";
import { timestamp } from "drizzle-orm/mysql-core";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";



// Feed
//   id: int
//   title: string
//   topic: string     (e.g. security, devops, cloud etc)
//   link: string
//   earliest: date
//   lastCheck: date
//  dataOverride: string  Json string of fields changes from rss data to store in db
//   (e.g. {link: "enclosure.url"} = read link from there instead of feed.link)

export const feedTable = sqliteTable("feed", {
  id: integer("id").primaryKey({autoIncrement: true}),
  title: text("title").notNull(),
  topic: text("topic"),
  link: text("link").notNull(),
  earliest: timestamp("earliest").notNull(),
  lastCheck: timestamp("lastCheck"),
  dataOverride: text("dataOverride")
});



// Episode
//   id: int
//   feedId: int
//   title: string
//   link: string     (need to find source of this)
//   guid: string
//   pubDate: date    (use isoDate)
//   duration: int   (in seconds)  (do we want to store H:MM:SS as well?)
//   recorded: bool   ( have we recorded in learning log?)

export const episodeTable = sqliteTable("episode", {
  id: integer("id").primaryKey({autoIncrement: true}),
  feedId: integer("feedId").notNull().references(() => feedTable.id),
  title: text("title").notNull(),
  link: text("link").notNull(),
  guid: text("guid").notNull(),
  pubDate: timestamp("pubDate").notNull(),
  duration: integer("duration"),
  recorded: boolean("recorded")
});

export const feedRelations = relations(feedTable, ({ many }) => ({
  episodes: many(episodeTable)
}));
export const episodeRelations = relations(episodeTable, ({ one }) => ({
  feed: one(feedTable, {
    fields: [episodeTable.feedId],
    references: [feedTable.id]
  })
}));


export type Feed = typeof feedTable.$inferSelect;
export type Episode = typeof episodeTable.$inferSelect;
export type FeedInsert = typeof feedTable.$inferInsert;
export type EpisodeInsert = typeof episodeTable.$inferInsert;
