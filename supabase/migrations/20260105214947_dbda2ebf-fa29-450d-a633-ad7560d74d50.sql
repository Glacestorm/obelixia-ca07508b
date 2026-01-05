-- =============================================
-- ERP LOGISTICS MODULE - PHASE 1: BASE INFRASTRUCTURE
-- =============================================

-- 1. Operadoras logísticas (carriers)
CREATE TABLE public.erp_logistics_carriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  carrier_code TEXT NOT NULL,
  carrier_name TEXT NOT NULL,
  carrier_type TEXT DEFAULT 'national', -- national, international, urgent, freight
  logo_url TEXT,
  api_endpoint TEXT,
  api_type TEXT DEFAULT 'rest', -- rest, soap, sftp
  is_active BOOLEAN DEFAULT true,
  supports_tracking BOOLEAN DEFAULT true,
  supports_labels BOOLEAN DEFAULT true,
  supports_pickup BOOLEAN DEFAULT false,
  country_codes TEXT[] DEFAULT ARRAY['ES'],
  services JSONB DEFAULT '[]', -- Available services
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Cuentas/contratos por empresa con operadoras
CREATE TABLE public.erp_logistics_carrier_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES public.erp_logistics_carriers(id) ON DELETE CASCADE,
  account_number TEXT,
  contract_number TEXT,
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  username TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  environment TEXT DEFAULT 'production', -- production, sandbox
  rate_type TEXT DEFAULT 'standard', -- standard, negotiated, volume
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  billing_account TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  valid_from DATE,
  valid_until DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, carrier_id, account_number)
);

-- 3. Zonas de reparto
CREATE TABLE public.erp_logistics_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id UUID REFERENCES public.erp_logistics_carriers(id) ON DELETE CASCADE,
  zone_code TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  zone_type TEXT DEFAULT 'delivery', -- delivery, pickup, both
  country_code TEXT DEFAULT 'ES',
  postal_code_ranges JSONB DEFAULT '[]', -- [{from: "08000", to: "08999"}]
  provinces TEXT[],
  is_peninsula BOOLEAN DEFAULT true,
  is_islands BOOLEAN DEFAULT false,
  is_ceuta_melilla BOOLEAN DEFAULT false,
  delivery_days_min INTEGER DEFAULT 1,
  delivery_days_max INTEGER DEFAULT 3,
  surcharge_percentage NUMERIC(5,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tarifas por operadora/zona
CREATE TABLE public.erp_logistics_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_account_id UUID NOT NULL REFERENCES public.erp_logistics_carrier_accounts(id) ON DELETE CASCADE,
  zone_origin_id UUID REFERENCES public.erp_logistics_zones(id),
  zone_destination_id UUID REFERENCES public.erp_logistics_zones(id),
  service_code TEXT NOT NULL,
  service_name TEXT,
  weight_min NUMERIC(10,3) DEFAULT 0,
  weight_max NUMERIC(10,3),
  volume_min NUMERIC(10,3) DEFAULT 0,
  volume_max NUMERIC(10,3),
  base_price NUMERIC(12,2) NOT NULL,
  price_per_kg NUMERIC(10,4) DEFAULT 0,
  price_per_m3 NUMERIC(10,4) DEFAULT 0,
  fuel_surcharge_percentage NUMERIC(5,2) DEFAULT 0,
  insurance_percentage NUMERIC(5,4) DEFAULT 0,
  min_insurance_amount NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  valid_from DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Envíos (shipments)
CREATE TABLE public.erp_logistics_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  fiscal_year_id UUID REFERENCES public.erp_fiscal_years(id),
  carrier_account_id UUID REFERENCES public.erp_logistics_carrier_accounts(id),
  
  -- Identificadores
  shipment_number TEXT NOT NULL,
  tracking_number TEXT,
  carrier_reference TEXT,
  customer_reference TEXT,
  
  -- Origen de datos
  source_type TEXT DEFAULT 'manual', -- manual, sale_order, purchase_order, transfer
  source_document_id UUID,
  source_document_number TEXT,
  
  -- Direcciones
  origin_name TEXT,
  origin_address TEXT,
  origin_city TEXT,
  origin_postal_code TEXT,
  origin_province TEXT,
  origin_country TEXT DEFAULT 'ES',
  origin_contact TEXT,
  origin_phone TEXT,
  origin_email TEXT,
  
  destination_name TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_postal_code TEXT NOT NULL,
  destination_province TEXT,
  destination_country TEXT DEFAULT 'ES',
  destination_contact TEXT,
  destination_phone TEXT,
  destination_email TEXT,
  
  -- Servicio
  service_code TEXT,
  service_name TEXT,
  delivery_type TEXT DEFAULT 'standard', -- standard, express, same_day, scheduled
  scheduled_pickup_date DATE,
  scheduled_pickup_time_from TIME,
  scheduled_pickup_time_to TIME,
  scheduled_delivery_date DATE,
  
  -- Paquetes (resumen)
  total_packages INTEGER DEFAULT 1,
  total_weight NUMERIC(10,3) DEFAULT 0,
  total_volume NUMERIC(10,3) DEFAULT 0,
  
  -- Costes
  base_cost NUMERIC(12,2) DEFAULT 0,
  fuel_surcharge NUMERIC(10,2) DEFAULT 0,
  insurance_cost NUMERIC(10,2) DEFAULT 0,
  pickup_cost NUMERIC(10,2) DEFAULT 0,
  additional_costs NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  declared_value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  
  -- Estado
  status TEXT DEFAULT 'draft', -- draft, pending, confirmed, picked_up, in_transit, out_for_delivery, delivered, failed, returned, cancelled
  last_tracking_update TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivered_to TEXT,
  delivery_signature_url TEXT,
  delivery_photo_url TEXT,
  
  -- Incidencias
  has_incident BOOLEAN DEFAULT false,
  incident_type TEXT,
  incident_description TEXT,
  incident_resolved_at TIMESTAMPTZ,
  
  -- Contabilidad
  accounting_mode TEXT DEFAULT 'auto', -- auto, manual, none
  journal_entry_id UUID,
  is_accounted BOOLEAN DEFAULT false,
  accounted_at TIMESTAMPTZ,
  
  -- Etiquetas
  label_url TEXT,
  label_generated_at TIMESTAMPTZ,
  
  -- Metadatos
  notes TEXT,
  internal_notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Bultos por envío
CREATE TABLE public.erp_logistics_shipment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.erp_logistics_shipments(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  package_type TEXT DEFAULT 'box', -- box, pallet, envelope, tube, bag
  barcode TEXT,
  
  -- Dimensiones
  weight NUMERIC(10,3) DEFAULT 0,
  length NUMERIC(10,2) DEFAULT 0,
  width NUMERIC(10,2) DEFAULT 0,
  height NUMERIC(10,2) DEFAULT 0,
  volume NUMERIC(10,3) GENERATED ALWAYS AS (length * width * height / 1000000) STORED,
  
  -- Contenido
  description TEXT,
  quantity INTEGER DEFAULT 1,
  declared_value NUMERIC(12,2) DEFAULT 0,
  
  -- Productos (si aplica)
  product_id UUID,
  lot_number TEXT,
  serial_number TEXT,
  
  -- Estado
  status TEXT DEFAULT 'pending', -- pending, picked, packed, shipped, delivered
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Historial de tracking
CREATE TABLE public.erp_logistics_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.erp_logistics_shipments(id) ON DELETE CASCADE,
  
  event_code TEXT NOT NULL,
  event_description TEXT,
  event_status TEXT, -- maps to shipment status
  event_timestamp TIMESTAMPTZ NOT NULL,
  
  location_name TEXT,
  location_city TEXT,
  location_country TEXT,
  location_coordinates JSONB, -- {lat, lng}
  
  carrier_raw_data JSONB,
  is_exception BOOLEAN DEFAULT false,
  requires_action BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Flota propia
CREATE TABLE public.erp_logistics_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  vehicle_code TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'van', -- van, truck, motorcycle, bicycle, car
  brand TEXT,
  model TEXT,
  year INTEGER,
  
  -- Capacidad
  max_weight NUMERIC(10,2), -- kg
  max_volume NUMERIC(10,2), -- m3
  max_pallets INTEGER,
  
  -- Conductor asignado
  driver_id UUID,
  driver_name TEXT,
  driver_phone TEXT,
  
  -- Estado
  status TEXT DEFAULT 'available', -- available, in_route, maintenance, inactive
  current_location JSONB, -- {lat, lng, updated_at}
  current_route_id UUID,
  
  -- Documentación
  registration_date DATE,
  itv_expiry DATE,
  insurance_expiry DATE,
  tachograph_expiry DATE,
  
  -- Costes
  purchase_price NUMERIC(12,2),
  monthly_cost NUMERIC(10,2),
  cost_per_km NUMERIC(8,4),
  
  -- Contabilidad
  asset_account_id UUID,
  depreciation_account_id UUID,
  expense_account_id UUID,
  
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Rutas planificadas
CREATE TABLE public.erp_logistics_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  route_code TEXT NOT NULL,
  route_name TEXT,
  route_date DATE NOT NULL,
  
  vehicle_id UUID REFERENCES public.erp_logistics_vehicles(id),
  driver_id UUID,
  driver_name TEXT,
  
  -- Origen
  start_location_name TEXT,
  start_address TEXT,
  start_coordinates JSONB,
  planned_start_time TIME,
  actual_start_time TIME,
  
  -- Destino final
  end_location_name TEXT,
  end_address TEXT,
  end_coordinates JSONB,
  planned_end_time TIME,
  actual_end_time TIME,
  
  -- Estadísticas
  total_stops INTEGER DEFAULT 0,
  completed_stops INTEGER DEFAULT 0,
  total_distance_km NUMERIC(10,2) DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  
  -- Estado
  status TEXT DEFAULT 'planned', -- planned, in_progress, completed, cancelled
  
  -- Optimización
  is_optimized BOOLEAN DEFAULT false,
  optimization_score NUMERIC(5,2),
  optimization_data JSONB,
  
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Paradas por ruta
CREATE TABLE public.erp_logistics_route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.erp_logistics_routes(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.erp_logistics_shipments(id),
  
  stop_number INTEGER NOT NULL,
  stop_type TEXT DEFAULT 'delivery', -- delivery, pickup, both
  
  -- Ubicación
  location_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  coordinates JSONB,
  
  -- Tiempos
  planned_arrival TIME,
  actual_arrival TIME,
  planned_departure TIME,
  actual_departure TIME,
  service_time_minutes INTEGER DEFAULT 5,
  
  -- Estado
  status TEXT DEFAULT 'pending', -- pending, arrived, completed, failed, skipped
  
  -- Resultados
  completed_at TIMESTAMPTZ,
  recipient_name TEXT,
  signature_url TEXT,
  photo_url TEXT,
  notes TEXT,
  failure_reason TEXT,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Reglas de contabilización automática
CREATE TABLE public.erp_logistics_accounting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- shipment_cost, carrier_invoice, fleet_expense, fuel, tolls, maintenance
  
  -- Condiciones
  carrier_id UUID REFERENCES public.erp_logistics_carriers(id),
  service_type TEXT,
  min_amount NUMERIC(12,2),
  max_amount NUMERIC(12,2),
  
  -- Cuentas contables
  debit_account_code TEXT NOT NULL,
  debit_account_name TEXT,
  credit_account_code TEXT NOT NULL,
  credit_account_name TEXT,
  
  -- Configuración
  auto_post BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT true,
  description_template TEXT,
  
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_logistics_carriers_company ON public.erp_logistics_carriers(company_id);
CREATE INDEX idx_logistics_carrier_accounts_company ON public.erp_logistics_carrier_accounts(company_id);
CREATE INDEX idx_logistics_shipments_company ON public.erp_logistics_shipments(company_id);
CREATE INDEX idx_logistics_shipments_status ON public.erp_logistics_shipments(status);
CREATE INDEX idx_logistics_shipments_tracking ON public.erp_logistics_shipments(tracking_number);
CREATE INDEX idx_logistics_shipments_created ON public.erp_logistics_shipments(created_at DESC);
CREATE INDEX idx_logistics_tracking_shipment ON public.erp_logistics_tracking_events(shipment_id);
CREATE INDEX idx_logistics_vehicles_company ON public.erp_logistics_vehicles(company_id);
CREATE INDEX idx_logistics_routes_company_date ON public.erp_logistics_routes(company_id, route_date);

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.erp_logistics_carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_carrier_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_shipment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_logistics_accounting_rules ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (company-based access)
CREATE POLICY "Users can view carriers" ON public.erp_logistics_carriers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage carrier accounts" ON public.erp_logistics_carrier_accounts FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can view zones" ON public.erp_logistics_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage rates" ON public.erp_logistics_rates FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage shipments" ON public.erp_logistics_shipments FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage shipment lines" ON public.erp_logistics_shipment_lines FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can view tracking" ON public.erp_logistics_tracking_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage vehicles" ON public.erp_logistics_vehicles FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage routes" ON public.erp_logistics_routes FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage route stops" ON public.erp_logistics_route_stops FOR ALL TO authenticated USING (true);
CREATE POLICY "Users can manage accounting rules" ON public.erp_logistics_accounting_rules FOR ALL TO authenticated USING (true);

-- =============================================
-- SEED: SPANISH NATIONAL CARRIERS
-- =============================================
INSERT INTO public.erp_logistics_carriers (carrier_code, carrier_name, carrier_type, logo_url, services, metadata) VALUES
('SEUR', 'SEUR', 'national', '/carriers/seur.png', 
  '[{"code": "24H", "name": "SEUR 24"}, {"code": "48H", "name": "SEUR 48"}, {"code": "FRIO", "name": "SEUR Frío"}, {"code": "PALETERIA", "name": "Paletería"}]',
  '{"website": "https://www.seur.com", "phone": "902101010"}'),
  
('CORREOS_EXPRESS', 'Correos Express', 'national', '/carriers/correos.png',
  '[{"code": "PAQ24", "name": "Paq 24"}, {"code": "PAQ48", "name": "Paq 48"}, {"code": "PAQPREMIUM", "name": "Paq Premium"}, {"code": "EPAQ", "name": "ePaq"}]',
  '{"website": "https://www.correosexpress.com", "phone": "902122224"}'),
  
('MRW', 'MRW', 'urgent', '/carriers/mrw.png',
  '[{"code": "URGENTE", "name": "Urgente Mismo Día"}, {"code": "24H", "name": "MRW 24"}, {"code": "BAG", "name": "MRW Bag"}]',
  '{"website": "https://www.mrw.es", "phone": "902300400"}'),
  
('GLS', 'GLS Spain', 'national', '/carriers/gls.png',
  '[{"code": "BUSINESS", "name": "Business Parcel"}, {"code": "FLEX", "name": "FlexDelivery"}, {"code": "SHOP", "name": "ShopReturn"}, {"code": "EXPRESS", "name": "Express"}]',
  '{"website": "https://www.gls-spain.es", "phone": "902113300"}'),
  
('NACEX', 'Nacex', 'national', '/carriers/nacex.png',
  '[{"code": "10H", "name": "Nacex 10:00"}, {"code": "19H", "name": "Nacex 19:00"}, {"code": "ECOM", "name": "e-Nacex"}]',
  '{"website": "https://www.nacex.es", "phone": "900100000"}'),
  
('UPS', 'UPS', 'international', '/carriers/ups.png',
  '[{"code": "EXPRESS", "name": "Express"}, {"code": "STANDARD", "name": "Standard"}, {"code": "EXPEDITED", "name": "Expedited"}]',
  '{"website": "https://www.ups.com/es", "phone": "902888820"}'),
  
('DHL_EXPRESS', 'DHL Express', 'international', '/carriers/dhl.png',
  '[{"code": "EXPRESS_WW", "name": "Express Worldwide"}, {"code": "EXPRESS_12", "name": "Express 12:00"}, {"code": "ECONOMY", "name": "Economy Select"}]',
  '{"website": "https://www.dhl.com/es", "phone": "902123030"}'),
  
('FEDEX', 'FedEx', 'international', '/carriers/fedex.png',
  '[{"code": "PRIORITY", "name": "International Priority"}, {"code": "ECONOMY", "name": "International Economy"}, {"code": "FREIGHT", "name": "Freight"}]',
  '{"website": "https://www.fedex.com/es", "phone": "902100871"}'),
  
('ENVIALIA', 'Envialia', 'national', '/carriers/envialia.png',
  '[{"code": "24H", "name": "Envialia 24"}, {"code": "48H", "name": "Envialia 48"}, {"code": "ECONOMICO", "name": "Económico"}]',
  '{"website": "https://www.envialia.com", "phone": "902101012"}'),
  
('CTT_EXPRESS', 'CTT Express', 'national', '/carriers/ctt.png',
  '[{"code": "24H", "name": "CTT 24H"}, {"code": "48H", "name": "CTT 48H"}, {"code": "ISLAS", "name": "Baleares/Canarias"}]',
  '{"website": "https://www.cttexpress.com", "phone": "900101063"}'),
  
('TIPSA', 'Tipsa', 'national', '/carriers/tipsa.png',
  '[{"code": "URGENTE", "name": "Urgente"}, {"code": "ESTANDAR", "name": "Estándar"}]',
  '{"website": "https://www.tip-sa.com", "phone": "902107963"}'),
  
('SENDING', 'Sending', 'national', '/carriers/sending.png',
  '[{"code": "EXPRESS", "name": "Express"}, {"code": "HOME", "name": "Home Delivery"}]',
  '{"website": "https://www.sending.es", "phone": "902876876"}');

-- Enable realtime for shipments and tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_logistics_shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_logistics_tracking_events;