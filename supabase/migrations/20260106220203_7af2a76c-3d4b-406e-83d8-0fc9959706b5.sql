-- ============================================
-- TRIGGERS DE AUDITORÍA AUTOMÁTICA PARA MAESTROS
-- ============================================

-- Función genérica de auditoría que registra cambios
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger AS $$
BEGIN
  -- Solo registrar si hay cambios reales
  IF TG_OP = 'UPDATE' AND OLD = NEW THEN
    RETURN NEW;
  END IF;
  
  INSERT INTO public.audit_logs (
    table_name, 
    record_id, 
    action, 
    old_data, 
    new_data, 
    user_id,
    created_at
  )
  VALUES (
    TG_TABLE_NAME, 
    COALESCE(NEW.id, OLD.id)::text, 
    TG_OP, 
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid(),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar triggers a tablas de CLIENTES
DROP TRIGGER IF EXISTS audit_customers ON public.customers;
CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_customer_addresses ON public.customer_addresses;
CREATE TRIGGER audit_customer_addresses
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_customer_contacts ON public.customer_contacts;
CREATE TRIGGER audit_customer_contacts
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_customer_credit_policy ON public.customer_credit_policy;
CREATE TRIGGER audit_customer_credit_policy
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_credit_policy
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_customer_payment ON public.customer_payment;
CREATE TRIGGER audit_customer_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_payment
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_customer_shipping ON public.customer_shipping;
CREATE TRIGGER audit_customer_shipping
  AFTER INSERT OR UPDATE OR DELETE ON public.customer_shipping
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Aplicar triggers a tablas de PROVEEDORES
DROP TRIGGER IF EXISTS audit_suppliers ON public.suppliers;
CREATE TRIGGER audit_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_supplier_addresses ON public.supplier_addresses;
CREATE TRIGGER audit_supplier_addresses
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_addresses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_supplier_contacts ON public.supplier_contacts;
CREATE TRIGGER audit_supplier_contacts
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_supplier_payment ON public.supplier_payment;
CREATE TRIGGER audit_supplier_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payment
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Aplicar triggers a tablas de ARTÍCULOS
DROP TRIGGER IF EXISTS audit_items ON public.items;
CREATE TRIGGER audit_items
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_item_barcodes ON public.item_barcodes;
CREATE TRIGGER audit_item_barcodes
  AFTER INSERT OR UPDATE OR DELETE ON public.item_barcodes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_item_families ON public.item_families;
CREATE TRIGGER audit_item_families
  AFTER INSERT OR UPDATE OR DELETE ON public.item_families
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Aplicar triggers a tablas de IMPUESTOS y PAGOS
DROP TRIGGER IF EXISTS audit_taxes ON public.taxes;
CREATE TRIGGER audit_taxes
  AFTER INSERT OR UPDATE OR DELETE ON public.taxes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_payment_terms ON public.payment_terms;
CREATE TRIGGER audit_payment_terms
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_terms
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Aplicar triggers a tablas de ALMACENES
DROP TRIGGER IF EXISTS audit_warehouses ON public.warehouses;
CREATE TRIGGER audit_warehouses
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_warehouse_locations ON public.warehouse_locations;
CREATE TRIGGER audit_warehouse_locations
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Aplicar triggers a tablas de BANCOS/SEPA
DROP TRIGGER IF EXISTS audit_bank_accounts ON public.bank_accounts;
CREATE TRIGGER audit_bank_accounts
  AFTER INSERT OR UPDATE OR DELETE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_sepa_mandates ON public.sepa_mandates;
CREATE TRIGGER audit_sepa_mandates
  AFTER INSERT OR UPDATE OR DELETE ON public.sepa_mandates
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Aplicar triggers a tablas de PRECIOS
DROP TRIGGER IF EXISTS audit_price_lists ON public.price_lists;
CREATE TRIGGER audit_price_lists
  AFTER INSERT OR UPDATE OR DELETE ON public.price_lists
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_price_list_items ON public.price_list_items;
CREATE TRIGGER audit_price_list_items
  AFTER INSERT OR UPDATE OR DELETE ON public.price_list_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_discount_rules ON public.discount_rules;
CREATE TRIGGER audit_discount_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.discount_rules
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();