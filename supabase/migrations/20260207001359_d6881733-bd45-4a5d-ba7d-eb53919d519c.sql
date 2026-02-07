
-- =====================================================
-- FASE 12: PORTALES DE AUTOSERVICIO PARA PARTNERS Y CLIENTES
-- Enterprise SaaS 2025-2026 (v2 - índices renombrados)
-- =====================================================

-- Enum para tipos de partner (IF NOT EXISTS)
DO $$ BEGIN
  CREATE TYPE partner_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'strategic');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enum para tipos de ticket (IF NOT EXISTS)
DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_customer', 'waiting_partner', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- TABLA: Portal de Partners
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_portal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_name TEXT NOT NULL,
  partner_tax_id TEXT,
  tier partner_tier DEFAULT 'bronze',
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company_website TEXT,
  logo_url TEXT,
  description TEXT,
  specializations TEXT[] DEFAULT '{}',
  certifications JSONB DEFAULT '[]',
  commission_rate NUMERIC(5,2) DEFAULT 10.00,
  total_revenue_generated NUMERIC(15,2) DEFAULT 0,
  total_clients_referred INTEGER DEFAULT 0,
  avg_client_satisfaction NUMERIC(3,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  onboarded_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  portal_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Clientes referidos por partners
-- =====================================================
CREATE TABLE IF NOT EXISTS public.partner_referred_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partner_portal_accounts(id) ON DELETE CASCADE,
  client_company_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_contact_name TEXT,
  client_phone TEXT,
  referral_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'demo_scheduled', 'negotiating', 'won', 'lost')),
  deal_value NUMERIC(15,2),
  commission_earned NUMERIC(15,2),
  commission_paid BOOLEAN DEFAULT false,
  commission_paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Portal de Clientes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.customer_portal_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  subscription_tier TEXT DEFAULT 'basic',
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  modules_enabled TEXT[] DEFAULT '{}',
  usage_limits JSONB DEFAULT '{}',
  current_usage JSONB DEFAULT '{}',
  billing_info JSONB DEFAULT '{}',
  portal_settings JSONB DEFAULT '{}',
  onboarded_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  health_score NUMERIC(5,2) DEFAULT 100,
  nps_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Tickets de Soporte (compartida)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.portal_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('partner', 'customer')),
  portal_account_id UUID NOT NULL,
  requester_user_id UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority ticket_priority DEFAULT 'medium',
  status ticket_status DEFAULT 'open',
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  resolution TEXT,
  resolution_time_hours NUMERIC(10,2),
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_feedback TEXT,
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  sla_deadline TIMESTAMP WITH TIME ZONE,
  sla_breached BOOLEAN DEFAULT false,
  ai_suggested_resolution TEXT,
  ai_category_prediction TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Comentarios de Tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS public.portal_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES portal_support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  comment_type TEXT DEFAULT 'public' CHECK (comment_type IN ('public', 'internal', 'ai_suggestion')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_resolution BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Base de Conocimiento del Portal
-- =====================================================
CREATE TABLE IF NOT EXISTS public.portal_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  content_html TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  portal_visibility TEXT[] DEFAULT ARRAY['partner', 'customer'],
  tier_visibility TEXT[] DEFAULT ARRAY['bronze', 'silver', 'gold', 'platinum', 'strategic', 'basic', 'professional', 'enterprise'],
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  related_articles UUID[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  author_id UUID REFERENCES auth.users(id),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Notificaciones del Portal
-- =====================================================
CREATE TABLE IF NOT EXISTS public.portal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_type TEXT NOT NULL CHECK (portal_type IN ('partner', 'customer')),
  portal_account_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Actividad del Portal (Audit Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.portal_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_type TEXT NOT NULL CHECK (portal_type IN ('partner', 'customer')),
  portal_account_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_description TEXT,
  entity_type TEXT,
  entity_id TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABLA: Recursos Descargables
-- =====================================================
CREATE TABLE IF NOT EXISTS public.portal_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('document', 'video', 'template', 'training', 'api_doc', 'sdk')),
  file_url TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  portal_visibility TEXT[] DEFAULT ARRAY['partner', 'customer'],
  tier_visibility TEXT[] DEFAULT '{}',
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  download_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES (con nombres únicos para portal)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_partner_portal_user ON partner_portal_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_portal_tier ON partner_portal_accounts(tier);
CREATE INDEX IF NOT EXISTS idx_partner_referred_clients_partner ON partner_referred_clients(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referred_clients_status ON partner_referred_clients(status);
CREATE INDEX IF NOT EXISTS idx_customer_portal_user ON customer_portal_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_portal_company ON customer_portal_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_portal ON portal_support_tickets(portal_type, portal_account_id);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_status_v2 ON portal_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_portal_tickets_priority_v2 ON portal_support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_portal_ticket_comments_ticket ON portal_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_portal_kb_category ON portal_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_portal_kb_slug ON portal_knowledge_base(slug);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_account ON portal_notifications(portal_type, portal_account_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_unread ON portal_notifications(portal_account_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_portal_activity_account ON portal_activity_log(portal_type, portal_account_id);

-- =====================================================
-- SECUENCIA Y FUNCIÓN: Generar número de ticket
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS portal_ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_portal_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         LPAD(NEXTVAL('portal_ticket_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_portal_ticket_number ON portal_support_tickets;
CREATE TRIGGER set_portal_ticket_number
  BEFORE INSERT ON portal_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_portal_ticket_number();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE partner_portal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_referred_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_portal_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_resources ENABLE ROW LEVEL SECURITY;

-- Partner Portal Policies
DROP POLICY IF EXISTS "Partners can view own account" ON partner_portal_accounts;
CREATE POLICY "Partners can view own account"
  ON partner_portal_accounts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Partners can update own account" ON partner_portal_accounts;
CREATE POLICY "Partners can update own account"
  ON partner_portal_accounts FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Partners can manage referred clients" ON partner_referred_clients;
CREATE POLICY "Partners can manage referred clients"
  ON partner_referred_clients FOR ALL
  USING (partner_id IN (SELECT id FROM partner_portal_accounts WHERE user_id = auth.uid()));

-- Customer Portal Policies
DROP POLICY IF EXISTS "Customers can view own account" ON customer_portal_accounts;
CREATE POLICY "Customers can view own account"
  ON customer_portal_accounts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own account" ON customer_portal_accounts;
CREATE POLICY "Customers can update own account"
  ON customer_portal_accounts FOR UPDATE
  USING (user_id = auth.uid());

-- Ticket Policies
DROP POLICY IF EXISTS "Users can view own tickets" ON portal_support_tickets;
CREATE POLICY "Users can view own tickets"
  ON portal_support_tickets FOR SELECT
  USING (requester_user_id = auth.uid() OR assigned_to = auth.uid());

DROP POLICY IF EXISTS "Users can create tickets" ON portal_support_tickets;
CREATE POLICY "Users can create tickets"
  ON portal_support_tickets FOR INSERT
  WITH CHECK (requester_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own tickets" ON portal_support_tickets;
CREATE POLICY "Users can update own tickets"
  ON portal_support_tickets FOR UPDATE
  USING (requester_user_id = auth.uid() OR assigned_to = auth.uid());

-- Ticket Comments Policies
DROP POLICY IF EXISTS "Users can view ticket comments" ON portal_ticket_comments;
CREATE POLICY "Users can view ticket comments"
  ON portal_ticket_comments FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM portal_support_tickets 
      WHERE requester_user_id = auth.uid() OR assigned_to = auth.uid()
    )
    AND (comment_type = 'public' OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can add comments" ON portal_ticket_comments;
CREATE POLICY "Users can add comments"
  ON portal_ticket_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Knowledge Base Policy
DROP POLICY IF EXISTS "Anyone can view published knowledge base" ON portal_knowledge_base;
CREATE POLICY "Anyone can view published knowledge base"
  ON portal_knowledge_base FOR SELECT
  USING (is_published = true);

-- Notification Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON portal_notifications;
CREATE POLICY "Users can view own notifications"
  ON portal_notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON portal_notifications;
CREATE POLICY "Users can update own notifications"
  ON portal_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Activity Log Policy
DROP POLICY IF EXISTS "Users can view own activity" ON portal_activity_log;
CREATE POLICY "Users can view own activity"
  ON portal_activity_log FOR SELECT
  USING (user_id = auth.uid());

-- Resources Policy
DROP POLICY IF EXISTS "Anyone can view active resources" ON portal_resources;
CREATE POLICY "Anyone can view active resources"
  ON portal_resources FOR SELECT
  USING (is_active = true);

-- =====================================================
-- TRIGGERS: Updated_at automático
-- =====================================================
DROP TRIGGER IF EXISTS update_partner_portal_updated_at ON partner_portal_accounts;
CREATE TRIGGER update_partner_portal_updated_at
  BEFORE UPDATE ON partner_portal_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referred_clients_updated_at ON partner_referred_clients;
CREATE TRIGGER update_referred_clients_updated_at
  BEFORE UPDATE ON partner_referred_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_portal_updated_at ON customer_portal_accounts;
CREATE TRIGGER update_customer_portal_updated_at
  BEFORE UPDATE ON customer_portal_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portal_tickets_updated_at ON portal_support_tickets;
CREATE TRIGGER update_portal_tickets_updated_at
  BEFORE UPDATE ON portal_support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portal_kb_updated_at ON portal_knowledge_base;
CREATE TRIGGER update_portal_kb_updated_at
  BEFORE UPDATE ON portal_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portal_resources_updated_at ON portal_resources;
CREATE TRIGGER update_portal_resources_updated_at
  BEFORE UPDATE ON portal_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
