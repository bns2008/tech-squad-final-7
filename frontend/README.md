# ER AI Studio – Frontend

## Quick Start

1. Open a terminal (Windows CMD or PowerShell — **not Kiro's terminal**):
   ```
   cd "C:\Users\Darshan\Desktop\1\process image\frontend"
   npm install
   npm run dev
   ```

2. Open http://localhost:3000

## Environment

Create `.env.local` with the server-side conversion credential:
```
MISTRAL_API_KEY=your_key_here
```
The service fails closed when this variable is missing. Never expose it through a `NEXT_PUBLIC_*` variable.

## Stack
- Next.js 15 · React 19 · TypeScript
- Tailwind CSS · Framer Motion
- Monaco Editor · Zustand · React Query
- React Dropzone · React Hot Toast · Lucide Icons
- React Three Fiber · Three.js
