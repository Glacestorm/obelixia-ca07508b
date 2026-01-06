-- =====================================================
-- FASE 1: FUNDAMENTOS CONTABLES - Plan General Contable Español
-- =====================================================

-- 1. Añadir campos contables a SUPPLIERS
ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES erp_chart_accounts(id),
  ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES erp_chart_accounts(id);

-- 2. Añadir campos contables a CUSTOMERS
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES erp_chart_accounts(id),
  ADD COLUMN IF NOT EXISTS income_account_id UUID REFERENCES erp_chart_accounts(id);

-- 3. Añadir campos contables a ITEMS
ALTER TABLE public.items 
  ADD COLUMN IF NOT EXISTS purchase_account_id UUID REFERENCES erp_chart_accounts(id),
  ADD COLUMN IF NOT EXISTS sales_account_id UUID REFERENCES erp_chart_accounts(id),
  ADD COLUMN IF NOT EXISTS inventory_account_id UUID REFERENCES erp_chart_accounts(id);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_suppliers_account_id ON suppliers(account_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_expense_account_id ON suppliers(expense_account_id);
CREATE INDEX IF NOT EXISTS idx_customers_account_id ON customers(account_id);
CREATE INDEX IF NOT EXISTS idx_customers_income_account_id ON customers(income_account_id);
CREATE INDEX IF NOT EXISTS idx_items_purchase_account_id ON items(purchase_account_id);
CREATE INDEX IF NOT EXISTS idx_items_sales_account_id ON items(sales_account_id);
CREATE INDEX IF NOT EXISTS idx_items_inventory_account_id ON items(inventory_account_id);