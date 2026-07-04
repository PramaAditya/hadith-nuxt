import { pgTable, varchar, text, integer, boolean, jsonb, customType, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define the custom pgvector type for Drizzle as specified in the PRD
export const pgVector = customType<{ data: number[] }>({
  dataType() { return 'vector(768)'; },
  toDriver(value: number[]) { return JSON.stringify(value); },
  fromDriver(value: unknown) {
    if (typeof value === 'string') {
      return value.replace('[', '').replace(']', '').split(',').map(Number);
    }
    return value as number[];
  }
});

// Books table (maps to DB: 'books')
export const Books = pgTable('books', {
  bookid: varchar('bookid', { length: 100 }).primaryKey(),
  bookname: text('bookname').notNull(),
  bookdescription: text('bookdescription'),
  bookcover: text('bookcover'),
  englishname: text('englishname'),
  translator: text('translator'),
  author: text('author'),
  idrangemin: integer('idrangemin'),
  idrangemax: integer('idrangemax'),
  volume: integer('volume')
});

// Hadiths table (maps to DB: 'hadiths')
export const Hadiths = pgTable('hadiths', {
  hadithid: integer('hadithid').primaryKey(),
  bookid: varchar('bookid', { length: 100 }).notNull().references(() => Books.bookid, { onDelete: 'cascade' }),
  hadithidinbook: integer('hadithidinbook').notNull(),
  volume: integer('volume'),
  category: text('category'),
  categoryid: integer('categoryid'),
  chapter: text('chapter'),
  chapterincategoryid: integer('chapterincategoryid'),
  arabictext: text('arabictext'),
  englishtext: text('englishtext'),
  arabicsanad: text('arabicsanad').array(), // Text array for raw narrator names
  matnar: text('matnar'),
  englishsanad: text('englishsanad'),
  matnen: text('matnen'),
  matnid: text('matnid'),
  primaryspeaker: text('primaryspeaker'),
  semantictagsid: text('semantictagsid').array(),
  semantictagsen: text('semantictagsen').array(),
  onelinersummaryid: text('onelinersummaryid'),
  onelinersummaryen: text('onelinersummaryen'),
  searchkeywordsid: text('searchkeywordsid').array(),
  searchkeywordsen: text('searchkeywordsen').array(),
  scholarlyconsensusid: text('scholarlyconsensusid'),
  scholarlyconsensusen: text('scholarlyconsensusen'),
  consolidatedgradinglevel: integer('consolidatedgradinglevel'),
  scholargradings: jsonb('scholargradings'),
  gradingsfull: jsonb('gradingsfull'),
  url: text('url'),
  embedding: pgVector('embedding')
});

// Narrators table (maps to DB: 'narrators')
export const Narrators = pgTable('narrators', {
  narratorid: integer('narratorid').primaryKey(),
  standardnamear: text('standardnamear').notNull().unique(),
  standardnameen: text('standardnameen'),
  kunya: text('kunya'),
  reliability: text('reliability'),
  thabaqat: integer('thabaqat'),
  birthhijri: integer('birthhijri'),
  deathhijri: integer('deathhijri'),
  biographicalsummaryid: text('biographicalsummaryid'),
  biographicalsummaryen: text('biographicalsummaryen'),
  nisbah: varchar('nisbah', { length: 150 }),
  haswrittenbooks: boolean('haswrittenbooks').default(false),
  aliases: text('aliases').array(),
  schoolorsect: varchar('schoolorsect', { length: 100 }).default('Unknown')
});

// HadithNarrators junction table (maps to DB: 'hadithnarrators')
export const HadithNarrators = pgTable('hadithnarrators', {
  hadithid: integer('hadithid').notNull().references(() => Hadiths.hadithid, { onDelete: 'cascade' }),
  narratorid: integer('narratorid').notNull().references(() => Narrators.narratorid, { onDelete: 'cascade' }),
  narratorposition: integer('narratorposition').notNull(),
  aireasoning: text('aireasoning')
}, (table) => [
  primaryKey({ columns: [table.hadithid, table.narratorid, table.narratorposition] })
]);

// Drizzle relations for easy deep-joining
export const BooksRelations = relations(Books, ({ many }) => ({
  hadiths: many(Hadiths)
}));

export const HadithsRelations = relations(Hadiths, ({ one, many }) => ({
  book: one(Books, {
    fields: [Hadiths.bookid],
    references: [Books.bookid]
  }),
  hadithNarrators: many(HadithNarrators)
}));

export const NarratorsRelations = relations(Narrators, ({ many }) => ({
  hadithNarrators: many(HadithNarrators)
}));

export const HadithNarratorsRelations = relations(HadithNarrators, ({ one }) => ({
  hadith: one(Hadiths, {
    fields: [HadithNarrators.hadithid],
    references: [Hadiths.hadithid]
  }),
  narrator: one(Narrators, {
    fields: [HadithNarrators.narratorid],
    references: [Narrators.narratorid]
  })
}));
