# Default Columns Feature

## Overview
A new customizable feature that allows users to specify default columns that will be automatically added to every generated table across all tools (analyze, generate, migrate).

## Features

### 1. Settings > Customization Tab
- New "Customization" tab added to Settings page
- Toggle switch to enable/disable the default columns feature
- User-friendly interface to add, edit, and remove default columns

### 2. Default Column Configuration
Each default column can be configured with:
- **Column Name** (required): The name of the column
- **Data Type** (required): The SQL data type (e.g., VARCHAR(255), TIMESTAMP, UUID)
- **Constraints** (optional): Column constraints (e.g., NOT NULL, UNIQUE)
- **Default Value** (optional): Default value for the column (e.g., CURRENT_TIMESTAMP, NULL)
- **Description / Relation** (optional): Documentation or notes about the column's purpose

### 3. Integration with All Tools

#### Analyze Tool (ER Diagram to SQL)
- Default columns are automatically appended to every CREATE TABLE statement
- Placed after diagram-derived columns, before foreign key constraints
- Adapts to the target SQL dialect

#### Generate Tool (Text Description to SQL)
- Default columns are included in all generated tables
- Works with all diagram types: ER, Flowchart, DFD Level 0, DFD Level 1, Class Diagram
- Appears in both Mermaid diagrams and SQL output

#### Quick Convert
- Default columns are applied when converting ER diagrams
- Seamlessly integrated into the conversion workflow

#### Projects
- Default columns are added to all tables when processing project images
- Works with both queue processing and regeneration

## Usage

### Enabling Default Columns
1. Navigate to Settings → Customization tab
2. Toggle "Enable Default Columns" to ON
3. Click "Add Column" to create your first default column

### Common Examples
- **Audit Columns**: `created_at`, `updated_at`, `created_by`, `modified_by`
- **Soft Delete**: `is_active`, `deleted_at`
- **UUID Support**: `uuid` with type `UUID` and default `gen_random_uuid()`
- **Timestamps**: `created_at` with type `TIMESTAMP` and default `CURRENT_TIMESTAMP`

### Example Configuration
```
Column Name: created_at
Data Type: TIMESTAMP
Constraints: NOT NULL
Default Value: CURRENT_TIMESTAMP
Description: Tracks when the record was created

Column Name: updated_at
Data Type: TIMESTAMP
Constraints: NOT NULL
Default Value: CURRENT_TIMESTAMP
Description: Tracks when the record was last updated

Column Name: is_active
Data Type: BOOLEAN
Constraints: NOT NULL
Default Value: TRUE
Description: Soft delete flag
```

## Technical Implementation

### Frontend Changes

#### Store (lib/store.ts)
- Added `defaultColumnsEnabled: boolean` state
- Added `defaultColumns: DefaultColumn[]` array
- Added setters: `setDefaultColumnsEnabled`, `setDefaultColumns`
- Persisted to localStorage via zustand persist middleware

#### Settings Page
- New "Customization" tab with Settings icon
- Dynamic form to add/edit/remove default columns
- Real-time validation (requires name and type)
- Responsive UI with card-based column editor

#### API Integration
All frontend pages that call analysis/generation APIs now include:
```typescript
if (defaultColumnsEnabled && defaultColumns.length > 0) {
  const validColumns = defaultColumns.filter(col => col.name && col.type);
  if (validColumns.length > 0) {
    form.append("defaultColumns", JSON.stringify(validColumns));
    // or for JSON APIs:
    payload.defaultColumns = validColumns;
  }
}
```

Updated pages:
- `QuickConvertPage.tsx`
- `ProjectDetailPage.tsx`
- `HomePage.tsx`
- `GeneratePage.tsx`

### Backend Changes

#### Analyze Route (app/api/analyze/route.ts)
- Updated `buildPrompt()` function to accept optional `defaultColumns` parameter
- Adds a new section to the AI prompt instructing it to include default columns
- Parses `defaultColumns` from FormData

#### Generate Route (app/api/generate/route.ts)
- Updated `buildPrompt()` for all diagram types to include default columns
- Parses `defaultColumns` from JSON request body
- Works with ER, Flowchart, DFD, and Class diagrams

### Prompt Engineering
The AI is instructed to:
1. Add default columns to EVERY CREATE TABLE statement
2. Place them AFTER all domain-specific columns
3. Place them BEFORE foreign key constraint declarations
4. Adapt data types to match the target SQL dialect
5. Preserve constraints and default values

## Benefits
1. **Consistency**: All tables follow the same schema conventions
2. **Time-Saving**: No need to manually add common columns
3. **Flexibility**: Can be toggled on/off per user preference
4. **Customization**: Each user can define their own standards
5. **Cross-Tool Support**: Works seamlessly across all schema generation tools

## Testing Checklist
- [ ] Toggle default columns on/off in Settings
- [ ] Add multiple default columns with various configurations
- [ ] Test with Analyze tool (upload ER diagram)
- [ ] Test with Generate tool (all diagram types)
- [ ] Test with Quick Convert
- [ ] Test with Projects (batch processing)
- [ ] Verify columns appear in correct order in SQL output
- [ ] Test with different SQL dialects (PostgreSQL, MySQL, SQLite, etc.)
- [ ] Verify constraints and default values are preserved
- [ ] Test persistence (refresh page, columns should remain)

## Future Enhancements
- Column templates (e.g., "Audit Columns", "Soft Delete")
- Import/export default column configurations
- Share configurations across team members
- Dialect-specific default columns
- Order customization (drag and drop)
