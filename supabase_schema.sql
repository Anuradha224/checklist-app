-- ============================================================
-- CHECKLIST APP - SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- Employees
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text,
  created_at timestamptz default now()
);

-- Tasks (recurring task definitions)
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  employee_id uuid references employees(id) on delete cascade,
  freq text not null check (freq in ('D','W','F','M','Q','Y')),
  start_date date not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- Task instances (each scheduled occurrence)
create table if not exists instances (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid references tasks(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  planned date not null,
  actual timestamptz,
  created_at timestamptz default now(),
  unique(task_id, planned)
);

-- Settings (benchmark, etc.)
create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

insert into settings(key, value) values ('benchmark', '0') on conflict(key) do nothing;

-- RLS policies (enable RLS then allow all for now - tighten with auth later)
alter table employees enable row level security;
alter table tasks enable row level security;
alter table instances enable row level security;
alter table settings enable row level security;

create policy "Allow all" on employees for all using (true) with check (true);
create policy "Allow all" on tasks for all using (true) with check (true);
create policy "Allow all" on instances for all using (true) with check (true);
create policy "Allow all" on settings for all using (true) with check (true);

-- Indexes for performance
create index if not exists idx_instances_employee_id on instances(employee_id);
create index if not exists idx_instances_planned on instances(planned);
create index if not exists idx_instances_task_id on instances(task_id);
create index if not exists idx_tasks_employee_id on tasks(employee_id);
