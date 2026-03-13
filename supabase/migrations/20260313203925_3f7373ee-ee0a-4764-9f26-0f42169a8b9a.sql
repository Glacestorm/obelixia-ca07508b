
-- V2-ES.4 Paso 2.1: Cola de acciones documentales + campos storage
-- Aditivo, sin romper baseline

-- 1. Tabla de cola de acciones documentales
create table public.erp_hr_doc_action_queue (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null,
  document_id uuid references public.erp_hr_employee_documents(id) on delete cascade,
  document_type_code text not null,
  action_type text not null default 'submit',
  priority text not null default 'medium',
  source text not null default 'system',
  status text not null default 'pending',
  due_date date,
  assigned_to uuid,
  related_entity_type text,
  related_entity_id uuid,
  context jsonb default '{}',
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Índices operativos
create index idx_doc_action_queue_status on public.erp_hr_doc_action_queue(status) where status in ('pending', 'in_progress');
create index idx_doc_action_queue_priority on public.erp_hr_doc_action_queue(priority, due_date);
create index idx_doc_action_queue_employee on public.erp_hr_doc_action_queue(employee_id);
create index idx_doc_action_queue_document on public.erp_hr_doc_action_queue(document_id) where document_id is not null;
create index idx_doc_action_queue_related on public.erp_hr_doc_action_queue(related_entity_type, related_entity_id) where related_entity_id is not null;

-- RLS
alter table public.erp_hr_doc_action_queue enable row level security;

create policy "Authenticated users can read action queue"
  on public.erp_hr_doc_action_queue for select
  to authenticated using (true);

create policy "Authenticated users can insert action queue"
  on public.erp_hr_doc_action_queue for insert
  to authenticated with check (true);

create policy "Authenticated users can update action queue"
  on public.erp_hr_doc_action_queue for update
  to authenticated using (true) with check (true);

-- 2. Columnas aditivas de storage en employee_documents
alter table public.erp_hr_employee_documents
  add column if not exists storage_path text,
  add column if not exists storage_bucket text,
  add column if not exists file_size_bytes bigint,
  add column if not exists mime_type text,
  add column if not exists last_action_at timestamptz,
  add column if not exists escalation_level int default 0;

-- 3. Trigger updated_at para action_queue
create or replace function public.update_doc_action_queue_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_doc_action_queue_updated_at
  before update on public.erp_hr_doc_action_queue
  for each row execute function public.update_doc_action_queue_updated_at();
