-- =============================================
-- FASE 3: Triggers automáticos para stock
-- =============================================

-- 1. Función para generar movimientos al confirmar entrada de mercancía
CREATE OR REPLACE FUNCTION public.fn_goods_receipt_generate_movements()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  line RECORD;
  new_movement_id UUID;
BEGIN
  IF NEW.status IN ('confirmed', 'received') AND OLD.status NOT IN ('confirmed', 'received') THEN
    FOR line IN 
      SELECT grl.*, i.cost_method, i.unit_cost as current_cost
      FROM erp_goods_receipt_lines grl
      JOIN erp_items i ON i.id = grl.item_id
      WHERE grl.goods_receipt_id = NEW.id
    LOOP
      INSERT INTO erp_stock_movements (
        company_id, item_id, warehouse_id, movement_type,
        ref_entity_type, ref_entity_id, qty, unit_cost, notes
      ) VALUES (
        NEW.company_id, line.item_id, NEW.warehouse_id, 'purchase_in',
        'goods_receipt', NEW.id, line.quantity, COALESCE(line.unit_price, 0),
        'Entrada automática desde albarán ' || NEW.number
      ) RETURNING id INTO new_movement_id;

      INSERT INTO erp_warehouse_stock (company_id, item_id, warehouse_id, on_hand_qty, reserved_qty)
      VALUES (NEW.company_id, line.item_id, NEW.warehouse_id, line.quantity, 0)
      ON CONFLICT (company_id, item_id, warehouse_id)
      DO UPDATE SET 
        on_hand_qty = erp_warehouse_stock.on_hand_qty + line.quantity,
        updated_at = now();

      IF line.cost_method = 'average' THEN
        UPDATE erp_items 
        SET unit_cost = (
          SELECT CASE WHEN SUM(qty) > 0 THEN SUM(qty * unit_cost) / SUM(qty) ELSE COALESCE(line.unit_price, 0) END
          FROM erp_stock_movements 
          WHERE item_id = line.item_id AND movement_type IN ('purchase_in', 'adjust', 'inventory', 'transfer_in') AND qty > 0
        ), updated_at = now()
        WHERE id = line.item_id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_goods_receipt_movements ON public.erp_goods_receipts;
CREATE TRIGGER trg_goods_receipt_movements
  AFTER UPDATE ON public.erp_goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.fn_goods_receipt_generate_movements();

-- 2. Función para generar movimientos al confirmar albarán de venta
CREATE OR REPLACE FUNCTION public.fn_delivery_note_generate_movements()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  line RECORD;
BEGIN
  IF NEW.status IN ('confirmed', 'delivered') AND OLD.status NOT IN ('confirmed', 'delivered') THEN
    FOR line IN 
      SELECT dnl.*, i.unit_cost
      FROM erp_delivery_note_lines dnl
      JOIN erp_items i ON i.id = dnl.item_id
      WHERE dnl.delivery_note_id = NEW.id
    LOOP
      INSERT INTO erp_stock_movements (
        company_id, item_id, warehouse_id, movement_type,
        ref_entity_type, ref_entity_id, qty, unit_cost, notes
      ) VALUES (
        NEW.company_id, line.item_id, NEW.warehouse_id, 'sale_out',
        'delivery_note', NEW.id, -line.quantity, COALESCE(line.unit_cost, 0),
        'Salida automática desde albarán ' || NEW.number
      );

      UPDATE erp_warehouse_stock SET 
        on_hand_qty = on_hand_qty - line.quantity,
        reserved_qty = GREATEST(0, reserved_qty - line.quantity),
        updated_at = now()
      WHERE company_id = NEW.company_id AND item_id = line.item_id AND warehouse_id = NEW.warehouse_id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_note_movements ON public.erp_delivery_notes;
CREATE TRIGGER trg_delivery_note_movements
  AFTER UPDATE ON public.erp_delivery_notes
  FOR EACH ROW EXECUTE FUNCTION public.fn_delivery_note_generate_movements();

-- 3. Función para reservar stock al confirmar pedido de venta
CREATE OR REPLACE FUNCTION public.fn_sales_order_reserve_stock()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  line RECORD;
  default_warehouse UUID;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    SELECT id INTO default_warehouse FROM erp_warehouses
    WHERE company_id = NEW.company_id AND is_default = true LIMIT 1;

    IF default_warehouse IS NULL THEN
      SELECT id INTO default_warehouse FROM erp_warehouses WHERE company_id = NEW.company_id LIMIT 1;
    END IF;

    IF default_warehouse IS NOT NULL THEN
      FOR line IN SELECT * FROM erp_sales_order_lines WHERE sales_order_id = NEW.id
      LOOP
        INSERT INTO erp_warehouse_stock (company_id, item_id, warehouse_id, on_hand_qty, reserved_qty)
        VALUES (NEW.company_id, line.item_id, default_warehouse, 0, line.quantity)
        ON CONFLICT (company_id, item_id, warehouse_id)
        DO UPDATE SET reserved_qty = erp_warehouse_stock.reserved_qty + line.quantity, updated_at = now();
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_order_reserve ON public.erp_sales_orders;
CREATE TRIGGER trg_sales_order_reserve
  AFTER UPDATE ON public.erp_sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_sales_order_reserve_stock();

-- 4. Función para recálculo completo de stock
CREATE OR REPLACE FUNCTION public.fn_recalculate_warehouse_stock(p_company_id UUID, p_warehouse_id UUID DEFAULT NULL)
RETURNS TABLE(items_processed INT, errors TEXT[]) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calc RECORD;
  item_count INT := 0;
  error_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR calc IN 
    SELECT sm.company_id, sm.item_id, sm.warehouse_id, SUM(sm.qty) as calculated_qty
    FROM erp_stock_movements sm
    WHERE sm.company_id = p_company_id AND (p_warehouse_id IS NULL OR sm.warehouse_id = p_warehouse_id)
    GROUP BY sm.company_id, sm.item_id, sm.warehouse_id
  LOOP
    BEGIN
      INSERT INTO erp_warehouse_stock (company_id, item_id, warehouse_id, on_hand_qty, reserved_qty)
      VALUES (calc.company_id, calc.item_id, calc.warehouse_id, calc.calculated_qty, 0)
      ON CONFLICT (company_id, item_id, warehouse_id)
      DO UPDATE SET on_hand_qty = calc.calculated_qty, updated_at = now();
      item_count := item_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_list := array_append(error_list, 'Item ' || calc.item_id::TEXT || ': ' || SQLERRM);
    END;
  END LOOP;
  RETURN QUERY SELECT item_count, error_list;
END;
$$;