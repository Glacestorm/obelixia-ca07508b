
-- Phase 1C Step 1: Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hr_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'legal_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor';
