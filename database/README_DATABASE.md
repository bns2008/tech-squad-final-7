# Database Setup Guide

## What Gets Created
7 tables in PostgreSQL, all visible in pgAdmin:

| Table | What it stores |
|---|---|
| `users` | All registered accounts |
| `images` | Every ER diagram image uploaded |
| `conversions` | Every generated SQL script |
| `user_activity` | Full audit log — logins, uploads, exports |
| `payments` | Razorpay payment history |
| `api_usage` | Every Mistral AI API call |
| `export_logs` | Every time a user downloads/copies SQL |

---

## Step 1 — pgAdmin: Create the Database

1. Open **pgAdmin**
2. Right-click **Databases** → **Create** → **Database**
3. Name it: `er_ai_studio`
4. Click **Save**

---

## Step 2 — Run the Schema SQL in pgAdmin

1. Click on `er_ai_studio` in the left panel
2. Click **Tools** → **Query Tool**
3. Click the folder icon (Open File) and select `database/schema.sql`
4. Press **F5** (or click Execute)
5. You should see: *"Query returned successfully"*

---

## Step 3 — Verify Tables Exist

In the pgAdmin Query Tool, run:

```sql
-- See all 7 tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output:
```
api_usage
conversions
export_logs
images
payments
user_activity
users
```

---

## Step 4 — See Sample Data (already seeded)

```sql
-- See the 2 demo users
SELECT id, full_name, email, role, plan, created_at FROM users;

-- See activity logs
SELECT a.id, u.full_name, a.activity_type, a.description, a.timestamp
FROM user_activity a JOIN users u ON a.user_id = u.id
ORDER BY a.timestamp DESC;
```

---

## Step 5 — Install Python dependencies and run backend

```bash
cd tech-squad-final-7
pip install -r requirements.txt
python database/init_db.py
uvicorn app:app --reload --port 8000
```

---

## Useful pgAdmin Queries

### See all users
```sql
SELECT id, full_name, email, role, plan, is_active, last_login,
       conversions_used_this_month
FROM users;
```

### See all uploaded images
```sql
SELECT i.id, u.full_name, i.original_filename, i.upload_timestamp,
       i.processing_status, i.file_size_bytes
FROM images i
JOIN users u ON i.user_id = u.id
ORDER BY i.upload_timestamp DESC;
```

### See all generated SQL scripts
```sql
SELECT c.id, u.full_name, i.original_filename, c.dialect,
       c.success, c.tables_count, c.conversion_timestamp,
       LEFT(c.generated_ddl, 100) AS ddl_preview
FROM conversions c
JOIN users u ON c.user_id = u.id
JOIN images i ON c.image_id = i.id
ORDER BY c.conversion_timestamp DESC;
```

### Full activity log
```sql
SELECT a.id, u.full_name, a.activity_type, a.description,
       a.ip_address, a.timestamp
FROM user_activity a
JOIN users u ON a.user_id = u.id
ORDER BY a.timestamp DESC
LIMIT 100;
```

### Per-user stats summary
```sql
SELECT
    u.full_name,
    u.plan,
    COUNT(DISTINCT i.id)  AS total_uploads,
    COUNT(DISTINCT c.id)  AS total_conversions,
    COUNT(DISTINCT e.id)  AS total_exports,
    u.conversions_used_this_month
FROM users u
LEFT JOIN images i      ON u.id = i.user_id
LEFT JOIN conversions c ON u.id = c.user_id
LEFT JOIN export_logs e ON u.id = e.user_id
GROUP BY u.id, u.full_name, u.plan, u.conversions_used_this_month;
```

### Payment history
```sql
SELECT p.id, u.full_name, p.amount_paise / 100.0 AS amount_rupees,
       p.plan_purchased, p.status, p.created_at
FROM payments p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC;
```

---

## Using on Another Computer

Just copy `database/schema.sql` to the other machine and run:

```bash
psql -U postgres -d er_ai_studio -f schema.sql
```

No Python needed — it's pure SQL.
