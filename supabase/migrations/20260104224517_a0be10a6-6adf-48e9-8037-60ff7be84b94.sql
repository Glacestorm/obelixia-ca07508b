-- =============================================
-- FASE 3 COMPLETAR: Tablas de ventas faltantes + asignaciones lotes/series + Triggers
-- =============================================

-- 1. Tabla de pedidos de venta
CREATE TABLE IF NOT EXISTS public.erp_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.erp_series(id),
  number VARCHAR(50),
  customer_id UUID REFERENCES public.erp_customers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'partial', 'completed', 'cancelled')),
  notes TEXT,
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total NUMERIC(18,2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'EUR',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Líneas de pedidos de venta
CREATE TABLE IF NOT EXISTS public.erp_sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.erp_sales_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.erp_items(id),
  description TEXT,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  tax_id UUID REFERENCES public.erp_taxes(id),
  tax_amount NUMERIC(18,2) DEFAULT 0,
  subtotal NUMERIC(18,2) DEFAULT 0,
  total NUMERIC(18,2) DEFAULT 0,
  line_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Albaranes de venta (delivery notes)
CREATE TABLE IF NOT EXISTS public.erp_delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.erp_companies(id) ON DELETE CASCADE,
  series_id UUID REFERENCES public.erp_series(id),
  number VARCHAR(50),
  customer_id UUID REFERENCES public.erp_customers(id),
  warehouse_id UUID REFERENCES public.erp_warehouses(id),
  sales_order_id UUID REFERENCES public.erp_sales_orders(id),
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'delivered', 'invoiced', 'cancelled')),
  notes TEXT,
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  total NUMERIC(18,2) DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Líneas de albaranes de venta
CREATE TABLE IF NOT EXISTS public.erp_delivery_note_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id UUID NOT NULL REFERENCES public.erp_delivery_notes(id) ON DELETE CASCADE,
  sales_order_line_id UUID REFERENCES public.erp_sales_order_lines(id),
  item_id UUID REFERENCES public.erp_items(id),
  description TEXT,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(18,4) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  tax_id UUID REFERENCES public.erp_taxes(id),
  tax_amount NUMERIC(18,2) DEFAULT 0,
  subtotal NUMERIC(18,2) DEFAULT 0,
  total NUMERIC(18,2) DEFAULT 0,
  lot_id UUID REFERENCES public.erp_lots(id),
  serial_id UUID REFERENCES public.erp_serials(id),
  line_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabla de asignaciones de lotes a movimientos
CREATE TABLE IF NOT EXISTS public.erp_movement_lot_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES public.erp_stock_movements(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES public.erp_lots(id) ON DELETE RESTRICT,
  qty NUMERIC(18,4) NOT NULL CHECK (qty > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(movement_id, lot_id)
);

-- 6. Tabla de asignaciones de series a movimientos
CREATE TABLE IF NOT EXISTS public.erp_movement_serial_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_id UUID NOT NULL REFERENCES public.erp_stock_movements(id) ON DELETE CASCADE,
  serial_id UUID NOT NULL REFERENCES public.erp_serials(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(movement_id, serial_id)
);

-- RLS para todas las tablas nuevas
ALTER TABLE public.erp_sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_delivery_note_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_movement_lot_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_movement_serial_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view sales orders" ON public.erp_sales_orders FOR SELECT USING (true);
CREATE POLICY "Users can manage sales orders" ON public.erp_sales_orders FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view sales order lines" ON public.erp_sales_order_lines FOR SELECT USING (true);
CREATE POLICY "Users can manage sales order lines" ON public.erp_sales_order_lines FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view delivery notes" ON public.erp_delivery_notes FOR SELECT USING (true);
CREATE POLICY "Users can manage delivery notes" ON public.erp_delivery_notes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view delivery note lines" ON public.erp_delivery_note_lines FOR SELECT USING (true);
CREATE POLICY "Users can manage delivery note lines" ON public.erp_delivery_note_lines FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view lot assignments" ON public.erp_movement_lot_assignments FOR SELECT USING (true);
CREATE POLICY "Users can manage lot assignments" ON public.erp_movement_lot_assignments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users can view serial assignments" ON public.erp_movement_serial_assignments FOR SELECT USING (true);
CREATE POLICY "Users can manage serial assignments" ON public.erp_movement_serial_assignments FOR ALL USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON public.erp_sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.erp_sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_company ON public.erp_delivery_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_warehouse ON public.erp_delivery_notes(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movement_lot_assignments_movement ON public.erp_movement_lot_assignments(movement_id);
CREATE INDEX IF NOT EXISTS idx_movement_serial_assignments_movement ON public.erp_movement_serial_assignments(movement_id);