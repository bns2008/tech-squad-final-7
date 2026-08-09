/**
 * schemaAnalyzer.ts
 * Pure local SQL schema analysis — no API, no external deps.
 * Reuses parseSQLSchema from the existing sqlParser.ts.
 *
 * Detects:
 *  Errors   – hard design problems (missing PKs, broken FK refs, duplicate cols)
 *  Warnings – likely issues (FK column not indexed, suspicious nullable, isolated tables)
 *  Suggestions – best-practice improvements (naming, indexes, normalization hints)
 */

import { parseSQLSchema, type Schema, type Table, type Column } from "./sqlParser";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type FindingSeverity = "error" | "warning" | "suggestion";

export interface AnalysisFinding {
  id: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
  table?: string;          // which table this relates to (optional)
  column?: string;         // which column this relates to (optional)
  fixHint?: string;        // short actionable hint shown in the UI
}

export interface AnalysisResult {
  errors:      AnalysisFinding[];
  warnings:    AnalysisFinding[];
  suggestions: AnalysisFinding[];
  tableCount:  number;
  columnCount: number;
  fkCount:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

let _seq = 0;
function id(prefix: string) { return `${prefix}-${++_seq}`; }

/** Column names that are almost always nullable by accident */
const SUSPICIOUS_NULLABLE_PATTERNS = [
  /^(email|username|user_name|login|password|name|title|status)$/i,
];

/** Prefixes/suffixes that hint at a FK column */
const FK_HINT_SUFFIX = /_id$/i;
const FK_HINT_PREFIX = /^(fk_|ref_)/i;

/** Common snake_case → camelCase inconsistency signal */
const CAMEL_CASE_RE = /[a-z][A-Z]/;
const SNAKE_CASE_RE = /_/;

function tableNames(schema: Schema): Set<string> {
  return new Set(schema.tables.map(t => t.name.toLowerCase()));
}

function hasPK(table: Table): boolean {
  return table.columns.some(c => c.isPrimaryKey);
}

function colNames(table: Table): string[] {
  return table.columns.map(c => c.name.toLowerCase());
}

/** True if the column type hints it can be NULL (no NOT NULL in type string) */
function looksNullable(col: Column): boolean {
  // parseSQLSchema stores the raw type string which may include modifiers like NOT NULL
  // Check both the type field and treat absence of NOT NULL as potentially nullable
  return !/NOT\s*NULL/i.test(col.type) && !col.isPrimaryKey;
}

function isFKByNamingConvention(col: Column): boolean {
  return FK_HINT_SUFFIX.test(col.name) || FK_HINT_PREFIX.test(col.name);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main analyser
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeSchema(sql: string): AnalysisResult {
  _seq = 0; // reset id counter so results are deterministic per call

  const errors:      AnalysisFinding[] = [];
  const warnings:    AnalysisFinding[] = [];
  const suggestions: AnalysisFinding[] = [];

  // Guard: nothing to parse
  if (!sql || !sql.trim()) {
    errors.push({
      id: id("e"),
      severity: "error",
      title: "No schema provided",
      detail: "Create or load a database schema first. Use Quick Convert, Generate, or the SQL Playground.",
      fixHint: "Load a schema",
    });
    return { errors, warnings, suggestions, tableCount: 0, columnCount: 0, fkCount: 0 };
  }

  const schema = parseSQLSchema(sql);

  if (schema.tables.length === 0) {
    errors.push({
      id: id("e"),
      severity: "error",
      title: "No tables found",
      detail: "The schema text was parsed but no CREATE TABLE statements were detected. Check for syntax errors.",
      fixHint: "Check SQL syntax",
    });
    return { errors, warnings, suggestions, tableCount: 0, columnCount: 0, fkCount: 0 };
  }

  const knownTableNames = tableNames(schema);
  const fkCount = schema.relationships.length;
  const columnCount = schema.tables.reduce((s, t) => s + t.columns.length, 0);

  // Track naming style across all tables for consistency check
  const nameStyles = { snake: 0, camel: 0 };

  for (const table of schema.tables) {
    // ── Style detection ─────────────────────────────────────────────────────
    for (const col of table.columns) {
      if (SNAKE_CASE_RE.test(col.name)) nameStyles.snake++;
      if (CAMEL_CASE_RE.test(col.name)) nameStyles.camel++;
    }

    // ─────────────────────────────────────────────────────────────────────
    // ERROR: Missing primary key
    // ─────────────────────────────────────────────────────────────────────
    if (!hasPK(table)) {
      errors.push({
        id: id("e"),
        severity: "error",
        title: `Missing PRIMARY KEY on "${table.name}"`,
        detail: `Table "${table.name}" has no primary key. Every table should have a primary key for unique row identification and efficient joins.`,
        table: table.name,
        fixHint: `Add id ${table.name.toLowerCase()}_id PRIMARY KEY`,
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ERROR: Duplicate column names within a table
    // ─────────────────────────────────────────────────────────────────────
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const col of table.columns) {
      const lower = col.name.toLowerCase();
      if (seen.has(lower)) dupes.add(lower);
      seen.add(lower);
    }
    for (const dupe of dupes) {
      errors.push({
        id: id("e"),
        severity: "error",
        title: `Duplicate column "${dupe}" in "${table.name}"`,
        detail: `Column "${dupe}" appears more than once in table "${table.name}". This will cause a runtime error when the schema is executed.`,
        table: table.name,
        column: dupe,
        fixHint: "Remove or rename the duplicate column",
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // ERROR: FK references a table that doesn't exist in the schema
    // ─────────────────────────────────────────────────────────────────────
    for (const col of table.columns) {
      if (col.isForeignKey && col.references) {
        const refTable = col.references.table.toLowerCase();
        if (!knownTableNames.has(refTable)) {
          errors.push({
            id: id("e"),
            severity: "error",
            title: `FK "${col.name}" references unknown table "${col.references.table}"`,
            detail: `Column "${table.name}.${col.name}" has a FOREIGN KEY to "${col.references.table}" but that table is not defined in this schema.`,
            table: table.name,
            column: col.name,
            fixHint: `Create table "${col.references.table}" or check the reference`,
          });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // WARNING: Column looks like a FK by naming but has no FK constraint
    // ─────────────────────────────────────────────────────────────────────
    for (const col of table.columns) {
      if (!col.isForeignKey && isFKByNamingConvention(col) && !col.isPrimaryKey) {
        warnings.push({
          id: id("w"),
          severity: "warning",
          title: `"${table.name}.${col.name}" looks like an FK but has no constraint`,
          detail: `The column name "${col.name}" suggests a foreign key relationship but no FOREIGN KEY constraint is declared. This can lead to orphan rows and broken relationships.`,
          table: table.name,
          column: col.name,
          fixHint: `ADD CONSTRAINT fk_${table.name.toLowerCase()}_${col.name} FOREIGN KEY (${col.name}) REFERENCES …`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // WARNING: FK column likely has no index
    // ─────────────────────────────────────────────────────────────────────
    for (const col of table.columns) {
      if (col.isForeignKey && !col.isPrimaryKey) {
        warnings.push({
          id: id("w"),
          severity: "warning",
          title: `No index on FK column "${table.name}.${col.name}"`,
          detail: `Foreign key columns are used in JOIN conditions and should be indexed. "${table.name}.${col.name}" has no explicit index, which can slow down queries significantly.`,
          table: table.name,
          column: col.name,
          fixHint: `CREATE INDEX idx_${table.name.toLowerCase()}_${col.name} ON ${table.name}(${col.name});`,
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // WARNING: Suspicious nullable on critical columns
    // ─────────────────────────────────────────────────────────────────────
    for (const col of table.columns) {
      if (looksNullable(col)) {
        if (SUSPICIOUS_NULLABLE_PATTERNS.some(p => p.test(col.name))) {
          warnings.push({
            id: id("w"),
            severity: "warning",
            title: `"${table.name}.${col.name}" may be unintentionally nullable`,
            detail: `Columns like "${col.name}" are almost always required. Marking it NOT NULL prevents invalid data and makes intent explicit.`,
            table: table.name,
            column: col.name,
            fixHint: `ALTER TABLE ${table.name} ALTER COLUMN ${col.name} SET NOT NULL;`,
          });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // SUGGESTION: Table with no relationships (isolated table)
    // ─────────────────────────────────────────────────────────────────────
    if (schema.tables.length > 1) {
      const tableNameLower = table.name.toLowerCase();
      const isConnected = schema.relationships.some(
        r => r.fromTable.toLowerCase() === tableNameLower ||
             r.toTable.toLowerCase() === tableNameLower
      );
      if (!isConnected) {
        suggestions.push({
          id: id("s"),
          severity: "suggestion",
          title: `Table "${table.name}" has no relationships`,
          detail: `"${table.name}" is not linked to any other table. If this is intentional (e.g. a lookup/config table), you can ignore this. Otherwise, consider adding foreign keys.`,
          table: table.name,
          fixHint: "Review and add FOREIGN KEY constraints if needed",
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // SUGGESTION: Table with many columns (normalization hint)
    // ─────────────────────────────────────────────────────────────────────
    if (table.columns.length > 12) {
      suggestions.push({
        id: id("s"),
        severity: "suggestion",
        title: `"${table.name}" has ${table.columns.length} columns — consider splitting`,
        detail: `Tables with many columns can be a sign of poor normalization. Consider splitting "${table.name}" into related sub-tables (e.g. separating address, profile, or settings data).`,
        table: table.name,
        fixHint: "Review for normalization opportunities (2NF / 3NF)",
      });
    }
  }

  // ── SUGGESTION: Mixed naming conventions ──────────────────────────────────
  if (nameStyles.snake > 0 && nameStyles.camel > 0) {
    suggestions.push({
      id: id("s"),
      severity: "suggestion",
      title: "Mixed naming conventions detected",
      detail: `Some columns use snake_case and others use camelCase. Consistent naming improves readability and prevents subtle bugs in ORMs.`,
      fixHint: "Standardise on snake_case (SQL convention) or camelCase (ORM convention)",
    });
  }

  // ── SUGGESTION: No foreign keys at all ───────────────────────────────────
  if (schema.tables.length > 1 && fkCount === 0) {
    suggestions.push({
      id: id("s"),
      severity: "suggestion",
      title: "No foreign key constraints defined",
      detail: `The schema has ${schema.tables.length} tables but no FOREIGN KEY constraints. Without FKs the database cannot enforce referential integrity automatically.`,
      fixHint: "Add FOREIGN KEY constraints between related tables",
    });
  }

  return {
    errors,
    warnings,
    suggestions,
    tableCount: schema.tables.length,
    columnCount,
    fkCount,
  };
}
