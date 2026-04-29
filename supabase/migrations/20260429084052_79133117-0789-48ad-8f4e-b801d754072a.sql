-- Add payroll_supervisor role to enum (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'payroll_supervisor';
