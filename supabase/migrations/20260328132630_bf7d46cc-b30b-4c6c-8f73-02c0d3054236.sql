
-- Legal procedures tracking table
CREATE TABLE public.erp_legal_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  
  -- Procedure details
  procedure_type TEXT NOT NULL, -- 'despido', 'contrato', 'sancion', 'permiso', 'modificacion_jornada', 'excedencia', etc
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'pending_review', 'in_progress', 'awaiting_approval', 'completed', 'rejected', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  
  -- Routing info
  routed_to_module TEXT, -- 'hr', 'legal', 'fiscal', 'accounting'
  routed_to_agent TEXT, -- agent code from registry
  routed_to_supervisor TEXT, -- supervisor code
  routing_confidence NUMERIC(4,3) DEFAULT 0,
  routing_reasoning TEXT,
  
  -- Target entity
  target_entity_type TEXT, -- 'employee', 'contract', 'document'
  target_entity_id TEXT,
  target_entity_name TEXT,
  
  -- Legal context
  jurisdiction TEXT DEFAULT 'ES',
  specialty TEXT DEFAULT 'labor',
  legal_basis TEXT[], -- array of applicable laws
  ai_analysis TEXT, -- full AI legal analysis
  
  -- Steps tracking
  steps JSONB DEFAULT '[]'::jsonb, -- [{step, status, description, completed_at}]
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  
  -- Direct links
  module_deep_link TEXT, -- URL to the specific ERP module
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Index for fast lookups
CREATE INDEX idx_legal_procedures_company ON public.erp_legal_procedures(company_id);
CREATE INDEX idx_legal_procedures_user ON public.erp_legal_procedures(user_id);
CREATE INDEX idx_legal_procedures_status ON public.erp_legal_procedures(status);
CREATE INDEX idx_legal_procedures_session ON public.erp_legal_procedures(session_id);

-- Enable RLS
ALTER TABLE public.erp_legal_procedures ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their company procedures"
  ON public.erp_legal_procedures
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create procedures"
  ON public.erp_legal_procedures
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their procedures"
  ON public.erp_legal_procedures
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_legal_procedures;
