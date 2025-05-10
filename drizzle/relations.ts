import { relations } from "drizzle-orm/relations";
import { feed, episode } from "./schema";

export const episodeRelations = relations(episode, ({one}) => ({
	feed: one(feed, {
		fields: [episode.feedId],
		references: [feed.id]
	}),
}));

export const feedRelations = relations(feed, ({many}) => ({
	episodes: many(episode),
}));