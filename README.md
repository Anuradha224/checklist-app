# Employee Task Checklist App

Full-stack employee checklist with KRA/KPI scoring.
- **Frontend**: Next.js 14 → deployed on Vercel
- **Backend/DB**: Supabase (PostgreSQL)
- **Scoring**: `ROUND(Actual/Planned × 100 − 100, 2)` — 0 = perfect, negative = tasks not done

---

## 🚀 Deployment Guide

### Step 1 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Note your **Project URL** and **Anon Key** (Settings → API)
3. Open **SQL Editor** → paste the contents of `supabase_schema.sql` → **Run**

### Step 2 — Push to GitHub

```bash
cd checklist-app
git init
git add .
git commit -m "Initial commit"
# Create repo at github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/checklist-app.git
git push -u origin main
```

### Step 3 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy**

---

## 💻 Local Development

```bash
cd frontend
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local

npm install
npm run dev
# Open http://localhost:3000
```

---

## 📊 Scoring Formula

```
Score = IFERROR(IF(Actual <> "", ROUND(Actual/Planned × 100 − 100, 2), ""), 0)
```

| Scenario | Score |
|---|---|
| All 42 tasks done on time | **0** |
| 35 of 49 done | **-28.57** |
| 0 of 10 done | **-100** |
| 10 of 10 done | **0** |

- **KPI 1**: % work not done → `done / planned`
- **KPI 2**: % work not done on time → `doneOnTime / planned`

---

## 📁 Project Structure

```
checklist-app/
├── supabase_schema.sql      ← Run this in Supabase SQL Editor
├── frontend/
│   ├── app/
│   │   ├── page.tsx         ← Main app (Dashboard/Checklist/Employees/Tasks)
│   │   ├── layout.tsx
│   │   └── api/
│   │       ├── employees/route.ts
│   │       ├── tasks/route.ts
│   │       ├── instances/route.ts
│   │       ├── score/route.ts
│   │       └── settings/route.ts
│   ├── components/
│   │   ├── ScoreTable.tsx   ← KRA/KPI table matching your screenshot
│   │   ├── TaskRow.tsx
│   │   └── Modal.tsx
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── score.ts         ← Score formula logic
│   └── types/index.ts
```

---

## 🔄 Frequencies Supported

| Code | Label |
|---|---|
| D | Daily |
| W | Weekly |
| F | Fortnightly |
| M | Monthly |
| Q | Quarterly |
| Y | Yearly |
