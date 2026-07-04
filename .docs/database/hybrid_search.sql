-- SQL Function for Multilingual Hybrid Search (Vector + Full-Text Search) using Reciprocal Rank Fusion (RRF)
-- RRF merges different ranking methods by scoring documents based on their positional rank in each search method.

CREATE OR REPLACE FUNCTION hybrid_search_hadiths(
    query_text TEXT,
    query_vector VECTOR(768),
    match_limit INT DEFAULT 20,
    k INT DEFAULT 60
)
RETURNS TABLE (
    HadithId INT,
    BookId VARCHAR(100),
    HadithIdInBook INT,
    Volume INT,
    Category VARCHAR(255),
    Chapter VARCHAR(255),
    ArabicSanad TEXT[],
    ArabicMatn TEXT,
    EnglishSanad TEXT,
    EnglishMatn TEXT,
    IndonesianMatn TEXT,
    Url TEXT,
    VectorRank INT,
    FtsRank INT,
    RrfScore FLOAT
) AS $$
WITH vector_search AS (
    -- Get top semantic matches based on HNSW Vector Cosine Distance
    SELECT 
        h.HadithId,
        ROW_NUMBER() OVER (ORDER BY h.Embedding <=> query_vector) as rank
    FROM Hadiths h
    ORDER BY h.Embedding <=> query_vector
    LIMIT match_limit * 3
),
fts_search AS (
    -- Get top keyword matches across English, Indonesian, and Arabic Matn using ts_rank_cd
    SELECT 
        h.HadithId,
        ROW_NUMBER() OVER (
            ORDER BY (
                ts_rank_cd(to_tsvector('indonesian', coalesce(h.MatnId, '')), plainto_tsquery('indonesian', query_text)) +
                ts_rank_cd(to_tsvector('indonesian', coalesce(h.OneLinerSummaryId, '')), plainto_tsquery('indonesian', query_text)) +
                ts_rank_cd(to_tsvector('english', coalesce(h.MatnEn, '')), plainto_tsquery('english', query_text)) +
                ts_rank_cd(to_tsvector('simple', coalesce(h.MatnAr, '')), plainto_tsquery('simple', query_text))
            ) DESC
        ) as rank
    FROM Hadiths h
    WHERE 
        to_tsvector('indonesian', coalesce(h.MatnId, '')) @@ plainto_tsquery('indonesian', query_text) OR
        to_tsvector('indonesian', coalesce(h.OneLinerSummaryId, '')) @@ plainto_tsquery('indonesian', query_text) OR
        to_tsvector('english', coalesce(h.MatnEn, '')) @@ plainto_tsquery('english', query_text) OR
        to_tsvector('simple', coalesce(h.MatnAr, '')) @@ plainto_tsquery('simple', query_text)
    LIMIT match_limit * 3
)
-- Combine and sort by RRF Score: 1 / (k + rank_vector) + 1 / (k + rank_fts)
SELECT 
    h.HadithId,
    h.BookId,
    h.HadithIdInBook,
    h.Volume,
    h.Category::character varying,
    h.Chapter::character varying,
    h.ArabicSanad,
    h.MatnAr,
    h.EnglishSanad,
    h.MatnEn,
    h.MatnId,
    h.Url,
    coalesce(v.rank, 999999)::INT as VectorRank,
    coalesce(f.rank, 999999)::INT as FtsRank,
    (
        coalesce(1.0 / (k + v.rank), 0.0) + 
        coalesce(1.0 / (k + f.rank), 0.0)
    )::FLOAT as RrfScore
FROM Hadiths h
LEFT JOIN vector_search v ON h.HadithId = v.HadithId
LEFT JOIN fts_search f ON h.HadithId = f.HadithId
WHERE v.HadithId IS NOT NULL OR f.HadithId IS NOT NULL
ORDER BY RrfScore DESC
LIMIT match_limit;
$$ LANGUAGE SQL;
