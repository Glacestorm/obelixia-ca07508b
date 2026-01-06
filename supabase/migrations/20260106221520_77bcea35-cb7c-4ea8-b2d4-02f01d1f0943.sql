-- Create audit triggers for all existing master tables

-- Customers
DROP TRIGGER IF EXISTS audit_customers ON public.customers;
CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Suppliers
DROP TRIGGER IF EXISTS audit_suppliers ON public.suppliers;
CREATE TRIGGER audit_suppliers
  AFTER INSERT OR UPDATE OR DELETE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Items
DROP TRIGGER IF EXISTS audit_items ON public.items;
CREATE TRIGGER audit_items
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Taxes
DROP TRIGGER IF EXISTS audit_taxes ON public.taxes;
CREATE TRIGGER audit_taxes
  AFTER INSERT OR UPDATE OR DELETE ON public.taxes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Payment Terms
DROP TRIGGER IF EXISTS audit_payment_terms ON public.payment_terms;
CREATE TRIGGER audit_payment_terms
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_terms
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Warehouses
DROP TRIGGER IF EXISTS audit_warehouses ON public.warehouses;
CREATE TRIGGER audit_warehouses
  AFTER INSERT OR UPDATE OR DELETE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ERP Companies
DROP TRIGGER IF EXISTS audit_erp_companies ON public.erp_companies;
CREATE TRIGGER audit_erp_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.erp_companies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ERP Company Groups
DROP TRIGGER IF EXISTS audit_erp_company_groups ON public.erp_company_groups;
CREATE TRIGGER audit_erp_company_groups
  AFTER INSERT OR UPDATE OR DELETE ON public.erp_company_groups
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ERP Fiscal Years
DROP TRIGGER IF EXISTS audit_erp_fiscal_years ON public.erp_fiscal_years;
CREATE TRIGGER audit_erp_fiscal_years
  AFTER INSERT OR UPDATE OR DELETE ON public.erp_fiscal_years
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ERP Periods
DROP TRIGGER IF EXISTS audit_erp_periods ON public.erp_periods;
CREATE TRIGGER audit_erp_periods
  AFTER INSERT OR UPDATE OR DELETE ON public.erp_periods
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ERP Series
DROP TRIGGER IF EXISTS audit_erp_series ON public.erp_series;
CREATE TRIGGER audit_erp_series
  AFTER INSERT OR UPDATE OR DELETE ON public.erp_series
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ERP Roles
DROP TRIGGER IF EXISTS audit_erp_roles ON public.erp_roles;
CREATE TRIGGER audit_erp_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.erp_roles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ERP Permissions
DROP TRIGGER IF EXISTS audit_erp_permissions ON public.erp_permissions;
CREATE TRIGGER audit_erp_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.erp_permissions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();