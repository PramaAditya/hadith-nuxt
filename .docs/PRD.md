# Product Requirements Document (PRD): Fullstack Nuxt 4 Shia Hadith RAG & Platform

## 1. Goal
Remake the entire classical Shia Hadith Relational Knowledge, RAG, and Model Context Protocol (MCP) platform into a single unified, high-performance, and high-concurrency Fullstack Nuxt 4 application. This replaces the decoupled Python FastAPI + separate Nuxt backend architecture, consolidating all data layers, AI orchestration, standalone MCP SSE server, and UI layouts under a single elite TS/JS fullstack codebase.

---

## 2. Tech Stack & Required Skills

The future agent executing this PRD **MUST** read and apply best practices from the following active skills:
*   **`nuxt-4`:** Enforce Nuxt 4 directory structures (`app/`, `server/`, `shared/`), shallowRef defaults, SWR caching on Nitro, and BFF proxying patterns.
*   **`ai-sdk`:** Master Vercel AI SDK integration (`ai`, `@ai-sdk/google`, and `@ai-sdk/vue`) to implement text generation, streaming, dynamic tool-calling (Function Calling), and metadata-bound message annotations.
*   **`nuxt-ui`:** Use Nuxt UI (latest stable/Tailwind-based) to construct a premium, dark-glassmorphic, minimalist, and responsive dashboard UI without boilerplate.

---

## 3. Core Capabilities & Architecture

### A. Database Layer (Drizzle ORM & pgvector)
*   **⚠️ Strict Read-Only Environment (Pre-Configured):** The `POSTGRES_URL` connection string provided in the `.env` file uses a restricted user role (`hadith_readonly`). It has been strictly verified to block all mutating operations (`INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE`, `DROP`, etc.). It only possesses `SELECT` rights on tables and `EXECUTE` rights on stored functions (meaning our vector function `hybrid_search_hadiths` is fully executable!). Do not write any writing/updating APIs as they will fail natively.
*   **Drizzle ORM Mapping:** Re-implement database queries using **Drizzle ORM** with a `postgres` connection pool. Since the database is already fully populated, map Drizzle schemas directly to the **existing** PascalCase table names and database constraints defined in `.docs/database/schema.sql` (copied to your `.docs/` directory as a reference).
*   **Defining the Custom pgvector Type in Drizzle:**
    Because pgvector is not natively in standard SQL, declare the custom `vector(768)` data type inside your Drizzle schema definition file (`server/database/schema.ts`):
    ```typescript
    import { customType } from 'drizzle-orm/pg-core';
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
    ```
*   **Relational Schema Mapping Requirements:**
    *   `books` table -> Maps to drizzle `Books` table (PascalCase in DB: `books` as SQL table name). Column `bookid` is PK (varchar), `bookname` (text), `englishname` (text), `author` (text), `translator` (text), `volume` (int).
    *   `hadiths` table -> Maps to drizzle `Hadiths` table (SQL table name: `hadiths`). Column `hadithid` is PK (serial), `bookid` is FK to `books.bookid`, `embedding` column uses the custom `pgVector` type, `consolidatedgradinglevel` (int), etc.
    *   `narrators` table -> Maps to drizzle `Narrators` table (SQL table name: `narrators`). Column `narratorid` is PK (serial), `standardnameen` (text), `standardnamear` (text), `thabaqat` (int), etc.
    *   `hadithnarrators` table -> Maps to drizzle `HadithNarrators` table (SQL table name: `hadithnarrators`). Composite FK `hadithid` and `narratorid`, plus `narratorposition` (int).
*   **Executing Hybrid Search in Drizzle:**
    Use Drizzle's `db.execute(sql...)` block to query the high-performance pre-existing `hybrid_search_hadiths` function, binding query parameters cleanly.
    ```typescript
    import { sql } from 'drizzle-orm';
    const res = await db.execute(sql`
      SELECT s.hadithid, s.bookid, h.MatnId as indonesian_matn, s.rrfscore
      FROM hybrid_search_hadiths(${queryText}, ${queryVector}::vector, ${limit}) s
      JOIN hadiths h ON s.hadithid = h.HadithId
    `);
    ```

### B. Business Logic Services (`server/utils/`)
Write pure TypeScript modules inside the Nitro server directory:
1.  `searchHadithsLogic(db, q, filters, limit)`: Performs FTS + Vector hybrid matching.
2.  `checkHadithIntegrityLogic(db, hadithId)`: Runs silsilah narrator continuity checks:
    *   Generational (`thabaqat`) difference anomalies.
    *   Chronological lifespan overlaps & year-of-death gaps (Mursal checks).
3.  `queryHadithInsightsLogic(db, query)`: Execute secure read-only `SELECT` queries for custom analytics, counting speaker statistics, etc. (Enforcing forbidden keyword scrubbing like `INSERT/UPDATE` and banning slow `ILIKE` operators in favor of pg_trgm `%` similarity).

### C. The Grounded AI Assistant Agent (BFF)
*   **Agentic Tool Loop:** Implement a robust ReAct (Reasoning and Action) loop inside `server/api/chat.post.ts` using the Vercel AI SDK.
*   **Gemini Core Client:** Connect via `@ai-sdk/google` (using `gemini-3.1-flash-lite` with high thinking level) loading the `GEMINI_API_KEY` from `.env`.
*   **Dynamic Function Calling:** Register our three core logic services (`searchHadiths`, `checkHadithIntegrity`, and `queryHadithInsights`) as native Gemini tools.
*   **Citations Annotations:** Format and return the assistant response with rich hadith source arrays appended inside the message's `metadata` property.

### D. Zero-Configuration MCP Server via `@nuxtjs/mcp-toolkit`
*   Instead of manually configuring raw SSE connections or SSE transports, utilize the official first-party Nuxt module: **`@nuxtjs/mcp-toolkit`**.
*   **Zero-Config Auto-Discovery:** Add `@nuxtjs/mcp-toolkit` to the `modules` array in `nuxt.config.ts`. The module automatically scans and discovers MCP components defined inside the `server/mcp/` directory.
*   **Implementation Steps:**
    1. Define the tools under `server/mcp/tools/` (e.g. `searchHadiths.ts`, `checkHadithIntegrity.ts`, `queryHadithInsights.ts`).
    2. Use the toolkit's native primitives: `defineMcpTool` and return helpers like `jsonResult(data)` or `errorResult(message)`.
    *   Example Tool Definition:
        ```typescript
        // server/mcp/tools/searchHadiths.ts
        export default defineMcpTool({
          name: 'search_hadiths',
          description: 'Search for Shia hadiths using bilingual hybrid search.',
          schema: z.object({ q: z.string(), limit: z.number().optional() }),
          handler(args) {
            // Call our central Nitro server utility directly!
            const results = await searchHadithsLogic(useDatabase(), args.q, { limit: args.limit });
            return jsonResult(results);
          }
        })
        ```

### E. Frontend Presentation UI & Premium UX Specification (`nuxt-ui`)
Build a beautiful, minimalist, dark-glassmorphic desktop/mobile layout matching high-end design systems. The interface must implement the following **User-Facing Behavioral Features**:

1.  **Semantic Search Dashboard with Prompt Suggestions (Fogg Prompt Trigger):**
    *   **Cold Start Solution:** Render a horizontal scrollable row of **Suggested Search Pills** directly under the search bar (e.g., `"Akal & Kebodohan"`, `"Tauhid"`, `"Aturan Sholat"`, `"Karakter Ahlul Bayt"`). Clicking a pill triggers the search instantly.
    *   **Precise Filter Sliders/Dropdowns:** Collapsible advanced panel using `UCollapse` containing dropdowns for specific books (`USelect`), volume sliders, and grading level checkboxes.

2.  **The "Interactive Silsilah" (Transmission Chain Visualizer):**
    *   **Relational Graph Timeline:** Each searched hadith must render its transmission path as an interactive vertical timeline or node-link graph using **Cytoscape.js** or Nuxt UI's timeline layout.
    *   **Narrator Biography Slide-Over Drawer:** Clicking on any narrator's name in the chain must open a sliding side panel (`USlideover`) displaying their Rijal biography (standard names, kunya, thabaqat, birth/death hijri, and reliability grading like *"Thiqah" (Trustworthy)* or *"Dha'if" (Weak)*).

3.  **Grounded Chatbot with Interactive Metadata Badges:**
    *   **Message-Bound Citation Badges:** Instead of a single static citation box, each assistant message must render a grid of small link badges at the bottom. Clicking a badge opens a modal (`UModal`) showing the full Arabic text, English/Indonesian translations, and its exact grading.
    *   **Streaming Status Indicator:** Show a modern, custom typewriter loading status while the AI agent runs its background tool-calling loop (e.g., *"Searching database..."* -> *"Checking chain integrity..."* -> *"Synthesizing answer..."*).

4.  **Dynamic Footnote & Interactive Tooltips (Level 0 Disclaimers):**
    *   **Visual Warning Cue:** Any hadith with `ConsolidatedGradingLevel = 0` (Unverified) must carry a trailing `*` in red/amber.
    *   **Explaining Unverified Status:** Hovering over or tapping the `*` opens a beautiful micro-popover (`UPopover`) explaining clearly and politely: *"This narration is historically recorded in classical literature but has not undergone a formal evaluation of its sanad authenticity by classical critics (Majlisi/Behbudi)."* This balances scholarly transparency with historical preservation.

5.  **Bilingual Language Toggle (Dynamic Context Swapper):**
    *   A clean navigation toggle (`ID` / `EN`) that immediately translates the application UI, search placeholder text, and dynamically requests English or Indonesian hadith translations from the backend.

6.  **Scholarly Sharing Actions:**
    *   Include a single-click **Copy Citation** button (`UButton`) that copies the hadith to the clipboard in academic Chicago-style citation format, including the exact book name, volume, page, grading, and a shortened `Thaqalayn` hyperlink.

### F. Complete Fullstack REST API Endpoints Reference
To ensure absolute backward compatibility and a seamless cutover, the fullstack Nuxt app **MUST** replicate the following exact REST API pathways, query parameters, and response structures in Nitro server routes:

1.  **🔍 Hadith Hybrid Search (`GET /api/v1/hadiths/search`)**
    *   **File Pathway:** `server/api/v1/hadiths/search.get.ts`
    *   **Params:** `q` (string, required), `book_ids` (comma-separated string, optional), `volume` (int, optional), `grading_level` (int, optional), `limit` (int, default 10), `offset` (int, default 0).
    *   **Logic:** Executes FTS + Vektor hybrid RRF search.
    *   **Response:** `{"status": "success", "total": number, "results": [...]}`

2.  **📖 Detailed Hadith Matn (`GET /api/v1/hadiths/[id]`)**
    *   **File Pathway:** `server/api/v1/hadiths/[id].get.ts`
    *   **Logic:** Fetch full matn (AR/EN/ID), arabicsanad, and scholastic gradings.

3.  **🔗 Original Thaqalayn URL Matcher (`GET /hadith/[...path]`)**
    *   **File Pathway:** `server/routes/hadith/[...path].get.ts` (Placed directly under `server/routes/` to omit the `/api` prefix!).
    *   **Logic:** Intercepts path formats like `1/1/0/1` (matching Thaqalayn layout), parses the parts to resolve the corresponding hadith, and returns the detailed hadith JSON directly.

4.  **👤 Narrator Biography (`GET /api/v1/narrators/[id]`)**
    *   **File Pathway:** `server/api/v1/narrators/[id].get.ts`
    *   **Logic:** Retrieves standard names (AR/EN), kunya, reliability status, thabaqat, lifetimes, and biographical summaries.

5.  **🕸️ Narrator Transmission Graph Network (`GET /api/v1/narrators/[id]/network`)**
    *   **File Pathway:** `server/api/v1/narrators/[id]/network.get.ts`
    *   **Params:** `min_weight` (int, default 1) to filter noise.
    *   **Logic:** Generates nodes and edges arrays for guru-murid connections, fully styled for **Cytoscape.js** compatibility:
        `{"nodes": [{"id": 1, "name": "...", "type": "target", "reliability": "..."}, ...], "edges": [{"source": 2, "target": 1, "weight": 3811, "type": "transmitted_to"}]}`

6.  **🩺 Sanad Gap & Integrity Analysis (`GET /api/v1/hadiths/[id]/integrity`)**
    *   **File Pathway:** `server/api/v1/hadiths/[id]/integrity.get.ts`
    *   **Logic:** Returns silsilah continuous status, analysis paragraphs, and detailed gaps array.

7.  **💬 Grounded Theological Agent Chat (`POST /api/v1/assistant/chat` / `/api/chat`)**
    *   **File Pathway:** `server/api/v1/assistant/chat.post.ts` and `server/api/chat.post.ts`
    *   **Logic:** Run the Vercel AI SDK autonomous tool-calling loops returning grounded answer text and citation metadata.
---

## 4. Test-Driven Development (TDD) Approach

The future agent **MUST** follow a strict **TDD (Test-Driven Development)** cycle:
1.  **Scaffold Test Suites first:** Install **`vitest`** as the testing framework.
2.  **Write Tests before Implementation:**
    *   `tests/database.test.ts`: Verify PostgreSQL connection pool, hybrid search sql execution, and pgvector return formats.
    *   `tests/integrity.test.ts`: Verify chronological gap detection and thabaqat mismatch logic.
    *   `tests/chat.test.ts`: Test the Nitro chat handler, mock Gemini tool calls, and ensure Vercel AI SDK message parts are compiled correctly.
3.  **Red-Green-Refactor:** Watch tests fail (`Red`), write minimal logic to make them compile & pass (`Green`), then refactor for performance, caching, and clean type-safety.
4.  **UI Integration:** Build frontend components only *after* the backend services and API endpoints are 100% verified and green.

---

## 5. Local Execution & Dependency Checklist
Instruct the running agent to install required fullstack modules and run tests:
```bash
# Install core database ORM modules
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Add testing and Nuxt UI + MCP toolkit modules
npm install -D vitest @nuxt/test-utils
npx nuxi module add mcp-toolkit
npx nuxi module add ui

# Run test suite to verify green light before building UI
npx vitest run
```
