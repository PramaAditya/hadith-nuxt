-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop tables if they exist (clean teardown)
DROP TABLE IF EXISTS HadithNarrators;
DROP TABLE IF EXISTS Narrators;
DROP TABLE IF EXISTS Hadiths;
DROP TABLE IF EXISTS Books;

-- Books table to store metadata from BookNames.json (PascalCase, Plural)
CREATE TABLE Books (
    BookId VARCHAR(100) NOT NULL,
    BookName TEXT NOT NULL,
    BookDescription TEXT,
    BookCover TEXT,
    EnglishName TEXT,
    Translator TEXT,
    Author TEXT,
    IdRangeMin INT,
    IdRangeMax INT,
    Volume INT,
    CONSTRAINT PK_Books PRIMARY KEY (BookId)
);

-- Hadiths table to store details of every hadith with translations, enrichments, and embeddings (PascalCase, Plural)
CREATE TABLE Hadiths (
    HadithId SERIAL NOT NULL,
    BookId VARCHAR(100) NOT NULL,
    HadithIdInBook INT NOT NULL,
    Volume INT,
    Category TEXT,
    CategoryId INT,
    Chapter TEXT,
    ChapterInCategoryId INT,
    ArabicText TEXT,               -- Original unified text
    EnglishText TEXT,              -- Original unified text
    ArabicSanad TEXT[],            -- Fallback raw text list
    MatnAr TEXT,                   -- Clean Arabic body (parsed)
    EnglishSanad TEXT,             -- Clean English narrator chain (parsed)
    MatnEn TEXT,                   -- Clean English body (parsed)
    MatnId TEXT,                   -- [AI GENERATED] Clean Indonesian translated body (parsed)
    
    -- Enriched Metadata Fields
    PrimarySpeaker TEXT,   -- [AI ENRICHED] Standardized 14 Masumeen / general speaker name
    SemanticTagsId TEXT[],         -- [AI ENRICHED] Thematic tags array (Indonesian)
    SemanticTagsEn TEXT[],         -- [AI ENRICHED] Thematic tags array (English)
    OneLinerSummaryId TEXT,        -- [AI ENRICHED] Concise 1-sentence summary (Indonesian)
    OneLinerSummaryEn TEXT,        -- [AI ENRICHED] Concise 1-sentence summary (English)
    SearchKeywordsId TEXT[],       -- [AI ENRICHED] Keywords and synonyms for search indexing (Indonesian)
    SearchKeywordsEn TEXT[],       -- [AI ENRICHED] Keywords and synonyms for search indexing (English)
    ScholarlyConsensusId TEXT,     -- [AI ENRICHED] Indonesian synthesis of gradings (Majlisi, Behbudi, Mohseni)
    ScholarlyConsensusEn TEXT,     -- [AI ENRICHED] English synthesis of gradings
    ConsolidatedGradingLevel INT,  -- [AI ENRICHED] Standardized authenticity tier: 1=Authentic, 2=Good, 3=Weak, 0=Unknown
    
    -- Traditional Scholar Gradings
    ScholarGradings JSONB,         -- {"majlisi": "صحيح", "behbudi": "...", "mohseni": "..."}
    GradingsFull JSONB,            -- Complete raw scholar evaluations array with references

    Url TEXT,
    Embedding VECTOR(768),         -- [AI GENERATED] Multilingual embedding of (Indo + Eng + Arabic) Matn + Enriched context
    
    CONSTRAINT PK_Hadiths PRIMARY KEY (HadithId),
    CONSTRAINT FK_Hadiths_Books FOREIGN KEY (BookId) REFERENCES Books(BookId) ON DELETE CASCADE
);

-- Narrators table to store standardized master data of narrators (PascalCase, Plural)
CREATE TABLE Narrators (
    NarratorId SERIAL NOT NULL,
    StandardNameAr TEXT NOT NULL, -- [AI GENERATED] Standard canonical Arabic name (Kutub al-Rijal)
    StandardNameEn TEXT,          -- [AI GENERATED] Standard canonical English name
    Kunya TEXT,                   -- [AI GENERATED] Kunya (e.g. Abu Ja'far)
    Reliability TEXT,             -- [AI GENERATED] Thiqah, Dhaif, Majhul, Ma'sum, etc.
    Thabaqat INT,                         -- [AI GENERATED] Generasi perawi (skala 1 s/d 12)
    BirthHijri INT,                       -- [AI GENERATED] Tahun lahir Hijriyah perawi
    DeathHijri INT,                       -- [AI GENERATED] Tahun wafat Hijriyah perawi
    BiographicalSummaryId TEXT,           -- [AI GENERATED] Ulasan biografi ringkas 3-4 kalimat berbahasa Indonesia
    BiographicalSummaryEn TEXT,           -- [AI GENERATED] Ulasan biografi ringkas 3-4 kalimat berbahasa Inggris
    Nisbah VARCHAR(150),                  -- [AI GENERATED] Gelar geografis/klan utama perawi (e.g., 'Al-Kufi')
    HasWrittenBooks BOOLEAN DEFAULT FALSE, -- [AI GENERATED] Apakah perawi tercatat memiliki karya tulisan sendiri seperti Kitab atau Asl
    Aliases TEXT[],                       -- [AI GENERATED] Daftar variasi nama panggilan (kunya) atau nama alternatif
    SchoolOrSect VARCHAR(100) DEFAULT 'Unknown', -- [AI GENERATED] Afiliasi teologi perawi (Imami, Waqifi, Fathi, Zaydi, Ammi, etc.)
    CONSTRAINT PK_Narrators PRIMARY KEY (NarratorId),
    CONSTRAINT UQ_Narrators_StandardNameAr UNIQUE (StandardNameAr)
);

-- HadithNarrators junction table representing the exact chain of transmission with AI Reasoning (PascalCase, Plural)
CREATE TABLE HadithNarrators (
    HadithId INT NOT NULL,
    NarratorId INT NOT NULL,
    NarratorPosition INT NOT NULL,       -- Position in the chain (1 = first narrator, 2 = second, etc.)
    AiReasoning TEXT,                    -- [AI GENERATED] Rijal justification explaining narrator resolution reasoning
    CONSTRAINT PK_HadithNarrators PRIMARY KEY (HadithId, NarratorId, NarratorPosition),
    CONSTRAINT FK_HadithNarrators_Hadiths FOREIGN KEY (HadithId) REFERENCES Hadiths(HadithId) ON DELETE CASCADE,
    CONSTRAINT FK_HadithNarrators_Narrators FOREIGN KEY (NarratorId) REFERENCES Narrators(NarratorId) ON DELETE CASCADE
);

-- Index for HNSW Vector Cosine Similarity
CREATE INDEX IF NOT EXISTS IX_Hadiths_Embedding 
ON Hadiths USING hnsw (Embedding vector_cosine_ops);

-- GIN Indexes for Full-Text Search (Using 100% Immutable expressions compatible with PostgreSQL)
CREATE INDEX IF NOT EXISTS IX_Hadiths_FtsEn 
ON Hadiths USING gin (to_tsvector('english', coalesce(MatnEn, '')));

CREATE INDEX IF NOT EXISTS IX_Hadiths_FtsId 
ON Hadiths USING gin (to_tsvector('indonesian', coalesce(MatnId, '')));

CREATE INDEX IF NOT EXISTS IX_Hadiths_FtsSummary 
ON Hadiths USING gin (to_tsvector('indonesian', coalesce(OneLinerSummaryId, '')));

CREATE INDEX IF NOT EXISTS IX_Hadiths_FtsAr 
ON Hadiths USING gin (to_tsvector('simple', coalesce(MatnAr, '')));

-- Indexes for rapid filtering by primary speaker, tags, and consolidated grading levels
CREATE INDEX IF NOT EXISTS IX_Hadiths_PrimarySpeaker ON Hadiths (PrimarySpeaker);
CREATE INDEX IF NOT EXISTS IX_Hadiths_SemanticTagsId ON Hadiths USING gin (SemanticTagsId);
CREATE INDEX IF NOT EXISTS IX_Hadiths_SemanticTagsEn ON Hadiths USING gin (SemanticTagsEn);
CREATE INDEX IF NOT EXISTS IX_Hadiths_ConsolidatedGradingLevel ON Hadiths (ConsolidatedGradingLevel);
CREATE INDEX IF NOT EXISTS IX_Hadiths_ScholarGradings ON Hadiths USING gin (ScholarGradings);

-- Indexes for Narrator and Junction Queries
CREATE INDEX IF NOT EXISTS IX_Narrators_StandardNameAr ON Narrators (StandardNameAr);
CREATE INDEX IF NOT EXISTS IX_HadithNarrators_NarratorId ON HadithNarrators (NarratorId);
CREATE INDEX IF NOT EXISTS IX_HadithNarrators_HadithId ON HadithNarrators (HadithId);
