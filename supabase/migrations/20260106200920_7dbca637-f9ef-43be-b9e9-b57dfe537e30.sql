-- =============================================
-- FASE 1: Sistema RFQ - Request for Quotation
-- Tablas para solicitudes de cotización y comparación
-- =============================================

-- 1. Tabla principal de Solicitudes de Cotización (RFQ)
CREATE TABLE public.erp_rfq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  rfq_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'evaluated', 'awarded', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  request_date DATE DEFAULT CURRENT_DATE,
  response_deadline DATE,
  expected_delivery_date DATE,
  invited_suppliers UUID[] DEFAULT '{}',
  evaluation_criteria JSONB DEFAULT '{"price": 50, "quality": 25, "delivery": 15, "service": 10}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  awarded_to UUID REFERENCES public.erp_suppliers(id),
  awarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Líneas de la solicitud de cotización
CREATE TABLE public.erp_rfq_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.erp_rfq(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.erp_products(id),
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'UND',
  target_price DECIMAL(15,4),
  specifications TEXT,
  is_required BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cotizaciones recibidas de proveedores
CREATE TABLE public.erp_supplier_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.erp_rfq(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.erp_suppliers(id),
  quote_number VARCHAR(50),
  quote_date DATE DEFAULT CURRENT_DATE,
  validity_date DATE,
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_terms VARCHAR(100),
  delivery_days INTEGER,
  delivery_terms VARCHAR(100),
  subtotal DECIMAL(15,4) DEFAULT 0,
  tax_amount DECIMAL(15,4) DEFAULT 0,
  total DECIMAL(15,4) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'received' CHECK (status IN ('received', 'evaluated', 'accepted', 'rejected')),
  notes TEXT,
  attachments JSONB DEFAULT '[]',
  score_price DECIMAL(5,2),
  score_quality DECIMAL(5,2),
  score_delivery DECIMAL(5,2),
  score_service DECIMAL(5,2),
  score_total DECIMAL(5,2),
  is_winner BOOLEAN DEFAULT false,
  evaluated_by UUID REFERENCES auth.users(id),
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Líneas de cotización con precios
CREATE TABLE public.erp_supplier_quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.erp_supplier_quotes(id) ON DELETE CASCADE,
  rfq_line_id UUID REFERENCES public.erp_rfq_lines(id),
  product_id UUID REFERENCES public.erp_products(id),
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(15,4) NOT NULL DEFAULT 1,
  unit VARCHAR(20) DEFAULT 'UND',
  unit_price DECIMAL(15,4) NOT NULL DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 21,
  subtotal DECIMAL(15,4) DEFAULT 0,
  notes TEXT,
  is_alternative BOOLEAN DEFAULT false,
  alternative_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_erp_rfq_company ON public.erp_rfq(company_id);
CREATE INDEX idx_erp_rfq_status ON public.erp_rfq(status);
CREATE INDEX idx_erp_rfq_lines_rfq ON public.erp_rfq_lines(rfq_id);
CREATE INDEX idx_erp_supplier_quotes_rfq ON public.erp_supplier_quotes(rfq_id);
CREATE INDEX idx_erp_supplier_quotes_supplier ON public.erp_supplier_quotes(supplier_id);
CREATE INDEX idx_erp_supplier_quote_lines_quote ON public.erp_supplier_quote_lines(quote_id);

-- Habilitar RLS
ALTER TABLE public.erp_rfq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_rfq_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_supplier_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_supplier_quote_lines ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para erp_rfq (usando erp_user_companies)
CREATE POLICY "Users can view RFQs from their companies" 
  ON public.erp_rfq FOR SELECT 
  USING (
    company_id IN (
      SELECT uc.company_id FROM public.erp_user_companies uc WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create RFQs for their companies" 
  ON public.erp_rfq FOR INSERT 
  WITH CHECK (
    company_id IN (
      SELECT uc.company_id FROM public.erp_user_companies uc WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update RFQs from their companies" 
  ON public.erp_rfq FOR UPDATE 
  USING (
    company_id IN (
      SELECT uc.company_id FROM public.erp_user_companies uc WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete RFQs from their companies" 
  ON public.erp_rfq FOR DELETE 
  USING (
    company_id IN (
      SELECT uc.company_id FROM public.erp_user_companies uc WHERE uc.user_id = auth.uid()
    )
  );

-- Políticas RLS para erp_rfq_lines
CREATE POLICY "Users can view RFQ lines from their companies" 
  ON public.erp_rfq_lines FOR SELECT 
  USING (
    rfq_id IN (
      SELECT r.id FROM public.erp_rfq r 
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create RFQ lines for their companies" 
  ON public.erp_rfq_lines FOR INSERT 
  WITH CHECK (
    rfq_id IN (
      SELECT r.id FROM public.erp_rfq r 
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update RFQ lines from their companies" 
  ON public.erp_rfq_lines FOR UPDATE 
  USING (
    rfq_id IN (
      SELECT r.id FROM public.erp_rfq r 
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete RFQ lines from their companies" 
  ON public.erp_rfq_lines FOR DELETE 
  USING (
    rfq_id IN (
      SELECT r.id FROM public.erp_rfq r 
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

-- Políticas RLS para erp_supplier_quotes
CREATE POLICY "Users can view supplier quotes from their companies" 
  ON public.erp_supplier_quotes FOR SELECT 
  USING (
    rfq_id IN (
      SELECT r.id FROM public.erp_rfq r 
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create supplier quotes for their companies" 
  ON public.erp_supplier_quotes FOR INSERT 
  WITH CHECK (
    rfq_id IN (
      SELECT r.id FROM public.erp_rfq r 
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update supplier quotes from their companies" 
  ON public.erp_supplier_quotes FOR UPDATE 
  USING (
    rfq_id IN (
      SELECT r.id FROM public.erp_rfq r 
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete supplier quotes from their companies" 
  ON public.erp_supplier_quotes FOR DELETE 
  USING (
    rfq_id IN (
      SELECT r.id FROM public.erp_rfq r 
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

-- Políticas RLS para erp_supplier_quote_lines
CREATE POLICY "Users can view quote lines from their companies" 
  ON public.erp_supplier_quote_lines FOR SELECT 
  USING (
    quote_id IN (
      SELECT sq.id FROM public.erp_supplier_quotes sq
      JOIN public.erp_rfq r ON sq.rfq_id = r.id
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create quote lines for their companies" 
  ON public.erp_supplier_quote_lines FOR INSERT 
  WITH CHECK (
    quote_id IN (
      SELECT sq.id FROM public.erp_supplier_quotes sq
      JOIN public.erp_rfq r ON sq.rfq_id = r.id
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update quote lines from their companies" 
  ON public.erp_supplier_quote_lines FOR UPDATE 
  USING (
    quote_id IN (
      SELECT sq.id FROM public.erp_supplier_quotes sq
      JOIN public.erp_rfq r ON sq.rfq_id = r.id
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete quote lines from their companies" 
  ON public.erp_supplier_quote_lines FOR DELETE 
  USING (
    quote_id IN (
      SELECT sq.id FROM public.erp_supplier_quotes sq
      JOIN public.erp_rfq r ON sq.rfq_id = r.id
      JOIN public.erp_user_companies uc ON r.company_id = uc.company_id 
      WHERE uc.user_id = auth.uid()
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_erp_rfq_updated_at
  BEFORE UPDATE ON public.erp_rfq
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_rfq_lines_updated_at
  BEFORE UPDATE ON public.erp_rfq_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_supplier_quotes_updated_at
  BEFORE UPDATE ON public.erp_supplier_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_erp_supplier_quote_lines_updated_at
  BEFORE UPDATE ON public.erp_supplier_quote_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();