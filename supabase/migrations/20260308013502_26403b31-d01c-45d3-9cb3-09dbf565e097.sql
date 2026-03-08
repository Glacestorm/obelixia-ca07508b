
-- Marketplace Extensions catalog
CREATE TABLE IF NOT EXISTS public.marketplace_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_key TEXT NOT NULL UNIQUE,
  extension_name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  author_name TEXT NOT NULL,
  author_id UUID,
  developer_id UUID,
  category TEXT NOT NULL DEFAULT 'utility',
  target_module TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  icon_url TEXT,
  screenshots TEXT[] DEFAULT '{}',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  rating_average NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  changelog TEXT,
  requirements JSONB DEFAULT '{}',
  compatibility_info JSONB DEFAULT '{}',
  revenue_share_percent NUMERIC(5,2) NOT NULL DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketplace Developers (partners with Stripe Connect)
CREATE TABLE IF NOT EXISTS public.marketplace_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  developer_name TEXT NOT NULL,
  company_name TEXT,
  email TEXT NOT NULL,
  website TEXT,
  bio TEXT,
  logo_url TEXT,
  stripe_connect_account_id TEXT,
  stripe_connect_status TEXT DEFAULT 'pending',
  total_extensions INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_downloads INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Marketplace Purchases
CREATE TABLE IF NOT EXISTS public.marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID NOT NULL REFERENCES public.marketplace_extensions(id) ON DELETE CASCADE,
  installation_id UUID,
  buyer_user_id UUID,
  buyer_email TEXT NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  developer_payout NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extension Reviews (separate from existing marketplace_reviews which is for partner_applications)
CREATE TABLE IF NOT EXISTS public.extension_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extension_id UUID NOT NULL REFERENCES public.marketplace_extensions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(extension_id, user_id)
);

-- Add foreign key from extensions to developers
ALTER TABLE public.marketplace_extensions 
  ADD CONSTRAINT fk_extension_developer 
  FOREIGN KEY (developer_id) REFERENCES public.marketplace_developers(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.marketplace_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_reviews ENABLE ROW LEVEL SECURITY;

-- Extensions policies
CREATE POLICY "Anyone can view published extensions" ON public.marketplace_extensions
  FOR SELECT USING (is_published = true);

CREATE POLICY "Developers can manage own extensions" ON public.marketplace_extensions
  FOR ALL TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Developers policies
CREATE POLICY "Anyone can view developers" ON public.marketplace_developers
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own developer profile" ON public.marketplace_developers
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Purchases policies
CREATE POLICY "Users can view own purchases" ON public.marketplace_purchases
  FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());

CREATE POLICY "System can insert purchases" ON public.marketplace_purchases
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Extension Reviews policies
CREATE POLICY "Anyone can view extension reviews" ON public.extension_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own extension reviews" ON public.extension_reviews
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Seed featured extensions
INSERT INTO public.marketplace_extensions (extension_key, extension_name, short_description, author_name, category, target_module, price, is_free, is_featured, is_verified, is_published, rating_average, rating_count, download_count, tags) VALUES
('adv-payroll-analytics', 'Advanced Payroll Analytics', 'Dashboards avanzados de nómina con predicción de costes y benchmarking sectorial', 'DataViz Pro', 'analytics', 'nominas', 49.99, false, true, true, true, 4.7, 128, 2340, ARRAY['analytics','payroll','dashboards']),
('smart-tax-optimizer', 'Smart Tax Optimizer', 'Optimización fiscal inteligente con IA para deducciones y planificación tributaria', 'TaxAI Solutions', 'ai', 'fiscal', 79.99, false, true, true, true, 4.9, 87, 1560, ARRAY['tax','ai','optimization']),
('hr-onboarding-flow', 'HR Onboarding Flow', 'Flujos de onboarding automatizados con checklist, documentos y formación', 'PeopleOps Inc', 'workflow', 'rrhh', 0, true, true, true, true, 4.5, 203, 5670, ARRAY['hr','onboarding','automation']),
('compliance-monitor', 'Compliance Monitor', 'Monitorización continua de cumplimiento normativo con alertas en tiempo real', 'RegTech Labs', 'security', 'compliance', 129.99, false, false, true, true, 4.8, 56, 890, ARRAY['compliance','monitoring','alerts']),
('inventory-forecaster', 'Inventory Forecaster', 'Predicción de inventario con ML para optimizar stock y reducir costes', 'SupplyAI', 'ai', 'inventario', 59.99, false, false, true, true, 4.3, 94, 1230, ARRAY['inventory','forecasting','ml']),
('document-ocr-engine', 'Document OCR Engine', 'Extracción automática de datos de facturas, contratos y documentos con OCR avanzado', 'DocuScan Tech', 'integration', 'documentos', 39.99, false, true, true, true, 4.6, 167, 3450, ARRAY['ocr','documents','extraction']),
('multi-currency-fx', 'Multi-Currency FX', 'Gestión multi-divisa con tipos de cambio en tiempo real y hedging automatizado', 'ForexBridge', 'integration', 'contabilidad', 89.99, false, false, true, true, 4.4, 45, 780, ARRAY['currency','forex','exchange']),
('employee-wellness', 'Employee Wellness Hub', 'Portal de bienestar laboral con encuestas, métricas de satisfacción y programas', 'WellWork', 'utility', 'rrhh', 0, true, false, true, true, 4.2, 312, 8900, ARRAY['wellness','hr','engagement']);
