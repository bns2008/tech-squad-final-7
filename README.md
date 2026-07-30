# ER AI Studio

ER AI Studio is a SaaS workspace for turning ER diagram images into clean, executable PostgreSQL DDL. It includes a fast single-image conversion flow and multi-image project workspaces with generated SQL, TXT, and JSON outputs.

## Web application

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` after the development server starts.

Create `frontend/.env.local` with the server-only conversion credential:

```text
MISTRAL_API_KEY=your_key_here
```

The application does not provide a fallback credential. Keep this value out of client-exposed environment variables and source control.

## Folder pipeline

The optional Python watcher processes images placed in `incoming_images` and writes generated text files to `results`. Successful originals move to `processed_images`; invalid or failed files move to `failed_images`.

```powershell
pip install -r requirements.txt
python main.py
```

The watcher settings are configured through environment variables in `config.py`, including `WATCH_FOLDER`, `RESULTS_FOLDER`, `REQUEST_TIMEOUT`, and `MISTRAL_API_KEY`.

## Product flows

- **Quick Convert** accepts one image at a time without creating a project.
- **Projects** organize multiple images and process them sequentially.
- **Free** includes 5 monthly conversions, 3 projects, and 5 images per project.
- **Pro** is ₹199/month with 50 monthly conversions, 25 projects, 25 images per project, priority processing, version history, advanced exports, ZIP export, and priority support.

The current subscription and authentication state is local to the browser. A production deployment should connect these flows to a server-side identity, database, billing provider, and persistent file storage before accepting real customer data.
