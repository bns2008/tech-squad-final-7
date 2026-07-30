import { NextRequest, NextResponse } from "next/server";

const MISTRAL_MODEL   = "mistral-small-latest";
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? "";
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const REQUEST_TIMEOUT = 120_000;

// ─────────────────────────────────────────────────────────────────────────────
// DIALECT SQL RULES (same as /api/analyze for consistency)
// ─────────────────────────────────────────────────────────────────────────────
const DIALECT_RULES: Record<string, string> = {
  postgresql: `TARGET DIALECT: PostgreSQL
- Default column type: VARCHAR(255)
- PK: column-level PRIMARY KEY (no SERIAL unless annotated)
- FK layout: Section 1 = CREATE TABLE (no FKs), Section 2 = ALTER TABLE … ADD CONSTRAINT fk_<name> FOREIGN KEY
- Quote reserved words with double-quotes
- No ENGINE, no CHARSET`,

  mysql: `TARGET DIALECT: MySQL 8
- Default column type: VARCHAR(255)
- Backtick quoting for reserved words
- FK: INLINE inside CREATE TABLE using CONSTRAINT fk_<name> FOREIGN KEY
- Add ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci after each );`,

  sqlite: `TARGET DIALECT: SQLite 3
- First line: PRAGMA foreign_keys = ON;
- Default column type: TEXT (never VARCHAR)
- FK: INLINE inside CREATE TABLE, no CONSTRAINT keyword, no ALTER TABLE ADD CONSTRAINT
- Quote reserved words with double-quotes`,

  mssql: `TARGET DIALECT: Microsoft SQL Server (T-SQL)
- Default column type: NVARCHAR(255)
- Square-bracket quoting for reserved words
- FK layout: Section 1 = CREATE TABLE, Section 2 = ALTER TABLE … ADD CONSTRAINT`,

  oracle: `TARGET DIALECT: Oracle Database
- Default column type: VARCHAR2(255)
- Double-quote reserved words
- FK layout: Section 1 = CREATE TABLE, Section 2 = ALTER TABLE … ADD CONSTRAINT`,
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt(dialect: string): string {
  const rules = DIALECT_RULES[dialect] ?? DIALECT_RULES.postgresql;

  return `You are an expert database architect. The user will describe a database in plain English.
Your job is to produce TWO outputs from that description:

1. A Mermaid erDiagram — a valid Mermaid.js entity-relationship diagram
2. Executable ${dialect.toUpperCase()} DDL SQL — following the dialect rules below

════════════════════════════════════════════════════════════════
DIALECT RULES
════════════════════════════════════════════════════════════════
${rules}

════════════════════════════════════════════════════════════════
OUTPUT FORMAT — you MUST return ONLY valid JSON, nothing else.
No markdown, no explanation, no prose, no code fences.
════════════════════════════════════════════════════════════════

Return exactly this JSON structure:
{
  "mermaid": "<full mermaid erDiagram block as a string>",
  "sql": "<full DDL SQL as a string>",
  "tables": ["table1", "table2"],
  "relationships": [{"from": "TableA", "to": "TableB", "type": "one-to-many", "label": "has"}]
}

════════════════════════════════════════════════════════════════
MERMAID RULES
════════════════════════════════════════════════════════════════
- Start with: erDiagram
- Use standard Mermaid relationship syntax:
    ||--o{  = one-to-many
    ||--||  = one-to-one
    }o--o{  = many-to-many
- Each entity block lists its attributes with type and name:
    ENTITY {
        type column_name PK
        type column_name FK
        type column_name
    }
- Use simple lowercase types: varchar, int, text, boolean, timestamp
- Entity names: SCREAMING_SNAKE_CASE
- Relationships must have a quoted label string

Example of valid mermaid output:
erDiagram
    STUDENT {
        varchar student_id PK
        varchar name
        varchar email
    }
    COURSE {
        varchar course_id PK
        varchar title
        int credits
    }
    ENROLLMENT {
        varchar enrollment_id PK
        varchar student_id FK
        varchar course_id FK
        timestamp enrolled_at
    }
    STUDENT ||--o{ ENROLLMENT : "enrolls in"
    COURSE ||--o{ ENROLLMENT : "has"

════════════════════════════════════════════════════════════════
SQL RULES
════════════════════════════════════════════════════════════════
- Infer sensible primary keys (id columns), foreign keys, and cardinalities from the description
- Use the dialect rules above strictly
- Add realistic columns beyond just IDs (name, email, created_at etc.) based on the entity type
- Keep it clean, realistic, and immediately executable

Now generate the diagram and SQL for the user's description.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    if (!MISTRAL_API_KEY) {
      return NextResponse.json({ error: "Generation service is not configured" }, { status: 503 });
    }

    const body = await req.json();
    const description: string = (body.description ?? "").trim();
    const dialect: string = (body.dialect ?? "postgresql").toLowerCase();

    if (!description) {
      return NextResponse.json({ error: "No description provided" }, { status: 400 });
    }
    if (description.length > 2000) {
      return NextResponse.json({ error: "Description too long (max 2000 characters)" }, { status: 400 });
    }

    const prompt = buildPrompt(dialect);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
    const t0 = Date.now();

    const mistralPayload = {
      model: MISTRAL_MODEL,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nUser description: ${description}`,
        },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mistralPayload),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Mistral API error ${res.status}: ${txt.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content?.trim() ?? "";

    if (!raw) {
      return NextResponse.json({ error: "Empty response from AI" }, { status: 500 });
    }

    // Parse the JSON response from the model
    let parsed: { mermaid: string; sql: string; tables: string[]; relationships: unknown[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fallback: try to extract JSON from the raw string
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
      }
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.mermaid || !parsed.sql) {
      return NextResponse.json({ error: "AI response missing required fields" }, { status: 500 });
    }

    return NextResponse.json({
      mermaid: parsed.mermaid,
      sql: parsed.sql,
      tables: parsed.tables ?? [],
      relationships: parsed.relationships ?? [],
      dialect,
      processingTime: Date.now() - t0,
    });

  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ error: "Request timed out (120s)" }, { status: 408 });
    }
    console.error("generate route error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
