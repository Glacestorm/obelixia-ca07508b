/**
 * useERPLogistics - Hook principal para el módulo de Logística ERP
 * Gestión de envíos, operadoras, flota y contabilidad automática
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useERPContext } from './useERPContext';
import { toast } from 'sonner';

// === INTERFACES ===
export interface Carrier {
  id: string;
  carrier_code: string;
  carrier_name: string;
  carrier_type: 'national' | 'international' | 'urgent' | 'freight';
  logo_url?: string;
  is_active: boolean;
  supports_tracking: boolean;
  supports_labels: boolean;
  supports_cod?: boolean;
  services_offered?: string[];
  services: Array<{ code: string; name: string }>;
  website_url?: string;
  tracking_url_template?: string;
  metadata?: Record<string, unknown>;
}

// Alias for components using different naming
export type LogisticsCarrier = Carrier;

export interface CarrierAccount {
  id: string;
  company_id: string;
  carrier_id: string;
  carrier?: Carrier;
  account_number?: string;
  contract_number?: string;
  api_key?: string;
  api_secret?: string;
  api_endpoint?: string;
  is_active: boolean;
  is_default: boolean;
  is_production?: boolean;
  environment: 'production' | 'sandbox';
  discount_percentage: number;
}

// Alias for components using different naming
export type LogisticsCarrierAccount = CarrierAccount;

export interface Shipment {
  id: string;
  company_id: string;
  shipment_number: string;
  tracking_number?: string;
  carrier_id: string;
  carrier_account_id?: string;
  carrier_account?: CarrierAccount;
  
  // Origen
  origin_name?: string;
  origin_address?: string;
  origin_city?: string;
  origin_postal_code?: string;
  origin_country: string;
  origin_phone?: string;
  origin_email?: string;
  
  // Destino
  destination_name: string;
  destination_address: string;
  destination_city: string;
  destination_postal_code: string;
  destination_country: string;
  destination_phone?: string;
  destination_email?: string;
  
  // Servicio
  service_type?: string;
  service_code?: string;
  service_name?: string;
  delivery_type: 'standard' | 'express' | 'same_day' | 'scheduled';
  
  // Paquetes
  total_packages: number;
  total_weight: number;
  total_volume: number;
  
  // Costes
  total_cost: number;
  cash_on_delivery?: number;
  insurance_value?: number;
  currency: string;
  
  // Estado
  status: ShipmentStatus;
  has_incident: boolean;
  notes?: string;
  
  // Contabilidad
  accounting_mode: 'auto' | 'manual' | 'none';
  is_accounted: boolean;
  journal_entry_id?: string;
  
  // Fechas
  created_at: string;
  updated_at: string;
  picked_up_at?: string;
  delivered_at?: string;
  estimated_delivery_at?: string;
}

// Alias for components using different naming
export type LogisticsShipment = Shipment;

export type ShipmentStatus = 
  | 'draft' 
  | 'pending' 
  | 'confirmed' 
  | 'picked_up' 
  | 'in_transit' 
  | 'out_for_delivery' 
  | 'delivered' 
  | 'failed' 
  | 'returned' 
  | 'cancelled';

export interface TrackingEvent {
  id: string;
  shipment_id: string;
  event_code: string;
  event_description?: string;
  event_status?: string;
  event_timestamp: string;
  location_city?: string;
  is_exception: boolean;
}

export interface Vehicle {
  id: string;
  company_id: string;
  vehicle_code: string;
  license_plate: string;
  vehicle_type: 'van' | 'truck' | 'motorcycle' | 'bicycle' | 'car';
  brand?: string;
  model?: string;
  driver_name?: string;
  status: 'available' | 'in_route' | 'maintenance' | 'inactive';
  max_weight?: number;
  max_volume?: number;
  itv_expiry?: string;
  insurance_expiry?: string;
  is_active: boolean;
}

export interface Route {
  id: string;
  company_id: string;
  route_code: string;
  route_name?: string;
  route_date: string;
  vehicle_id?: string;
  vehicle?: Vehicle;
  driver_name?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  total_stops: number;
  completed_stops: number;
  total_distance_km: number;
  is_optimized: boolean;
}

export interface AccountingRule {
  id: string;
  company_id: string;
  rule_name: string;
  rule_type: 'shipment_cost' | 'carrier_invoice' | 'fleet_expense' | 'fuel' | 'tolls' | 'maintenance';
  carrier_id?: string;
  debit_account_code: string;
  credit_account_code: string;
  auto_post: boolean;
  is_active: boolean;
}

export interface LogisticsStats {
  totalShipments: number;
  pendingShipments: number;
  inTransitShipments: number;
  deliveredShipments: number;
  incidentRate: number;
  totalCost: number;
  avgDeliveryDays: number;
  vehiclesActive: number;
  routesToday: number;
}

// === HOOK ===
export function useERPLogistics() {
  const erpContext = useERPContext();
  const selectedCompany = erpContext?.currentCompany || null;
  
  // Estado
  const [isLoading, setIsLoading] = useState(false);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [carrierAccounts, setCarrierAccounts] = useState<CarrierAccount[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [accountingRules, setAccountingRules] = useState<AccountingRule[]>([]);
  const [stats, setStats] = useState<LogisticsStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs para auto-refresh
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // === FETCH CARRIERS ===
  const fetchCarriers = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_logistics_carriers')
        .select('*')
        .eq('is_active', true)
        .order('carrier_name');

      if (fetchError) throw fetchError;
      
      const mapped = (data || []).map(c => ({
        ...c,
        carrier_type: c.carrier_type as Carrier['carrier_type'],
        services: Array.isArray(c.services) 
          ? (c.services as unknown as Array<{ code: string; name: string }>)
          : []
      }));
      
      setCarriers(mapped as Carrier[]);
      return mapped as Carrier[];
    } catch (err) {
      console.error('[useERPLogistics] fetchCarriers error:', err);
      return [];
    }
  }, []);

  // === FETCH CARRIER ACCOUNTS ===
  const fetchCarrierAccounts = useCallback(async () => {
    if (!selectedCompany?.id) return [];
    
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_logistics_carrier_accounts')
        .select(`
          *,
          carrier:erp_logistics_carriers(*)
        `)
        .eq('company_id', selectedCompany.id)
        .eq('is_active', true);

      if (fetchError) throw fetchError;
      setCarrierAccounts((data || []) as unknown as CarrierAccount[]);
      return data || [];
    } catch (err) {
      console.error('[useERPLogistics] fetchCarrierAccounts error:', err);
      return [];
    }
  }, [selectedCompany?.id]);

  // === FETCH SHIPMENTS ===
  const fetchShipments = useCallback(async (filters?: {
    status?: ShipmentStatus;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }) => {
    if (!selectedCompany?.id) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('erp_logistics_shipments')
        .select(`
          *,
          carrier_account:erp_logistics_carrier_accounts(
            *,
            carrier:erp_logistics_carriers(*)
          )
        `)
        .eq('company_id', selectedCompany.id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setShipments((data || []) as unknown as Shipment[]);
      return data || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      console.error('[useERPLogistics] fetchShipments error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompany?.id]);

  // === CREATE SHIPMENT ===
  const createShipment = useCallback(async (shipmentData: Partial<Shipment>) => {
    if (!selectedCompany?.id) {
      toast.error('Selecciona una empresa');
      return null;
    }

    try {
      // Generar número de envío
      const shipmentNumber = `ENV-${Date.now().toString(36).toUpperCase()}`;

      const { data, error: insertError } = await supabase
        .from('erp_logistics_shipments')
        .insert([{
          company_id: selectedCompany.id,
          shipment_number: shipmentNumber,
          destination_name: shipmentData.destination_name || 'Sin nombre',
          destination_address: shipmentData.destination_address || 'Sin dirección',
          destination_city: shipmentData.destination_city || 'Sin ciudad',
          destination_postal_code: shipmentData.destination_postal_code || '00000',
          status: shipmentData.status || 'draft',
          accounting_mode: shipmentData.accounting_mode || 'auto',
          origin_name: shipmentData.origin_name,
          origin_address: shipmentData.origin_address,
          origin_city: shipmentData.origin_city,
          origin_postal_code: shipmentData.origin_postal_code,
          origin_country: shipmentData.origin_country || 'ES',
          destination_country: shipmentData.destination_country || 'ES',
          destination_phone: shipmentData.destination_phone,
          destination_email: shipmentData.destination_email,
          carrier_account_id: shipmentData.carrier_account_id,
          service_code: shipmentData.service_code,
          service_name: shipmentData.service_name,
          delivery_type: shipmentData.delivery_type || 'standard',
          total_packages: shipmentData.total_packages || 1,
          total_weight: shipmentData.total_weight || 0,
          total_volume: shipmentData.total_volume || 0,
          total_cost: shipmentData.total_cost || 0,
          currency: shipmentData.currency || 'EUR'
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Envío creado correctamente');
      await fetchShipments();
      return data;
    } catch (err) {
      console.error('[useERPLogistics] createShipment error:', err);
      toast.error('Error al crear envío');
      return null;
    }
  }, [selectedCompany?.id, fetchShipments]);

  // === UPDATE SHIPMENT STATUS ===
  const updateShipmentStatus = useCallback(async (
    shipmentId: string, 
    newStatus: ShipmentStatus,
    trackingData?: Partial<TrackingEvent>
  ) => {
    try {
      const updates: Record<string, unknown> = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('erp_logistics_shipments')
        .update(updates)
        .eq('id', shipmentId);

      if (updateError) throw updateError;

      // Registrar evento de tracking
      if (trackingData || newStatus) {
        await supabase
          .from('erp_logistics_tracking_events')
          .insert([{
            shipment_id: shipmentId,
            event_code: newStatus.toUpperCase(),
            event_description: trackingData?.event_description || `Estado cambiado a ${newStatus}`,
            event_status: newStatus,
            event_timestamp: new Date().toISOString(),
            ...trackingData
          }]);
      }

      toast.success('Estado actualizado');
      await fetchShipments();
      return true;
    } catch (err) {
      console.error('[useERPLogistics] updateShipmentStatus error:', err);
      toast.error('Error al actualizar estado');
      return false;
    }
  }, [fetchShipments]);

  // === FETCH VEHICLES ===
  const fetchVehicles = useCallback(async () => {
    if (!selectedCompany?.id) return [];
    
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_logistics_vehicles')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .eq('is_active', true)
        .order('vehicle_code');

      if (fetchError) throw fetchError;
      setVehicles((data || []) as Vehicle[]);
      return data || [];
    } catch (err) {
      console.error('[useERPLogistics] fetchVehicles error:', err);
      return [];
    }
  }, [selectedCompany?.id]);

  // === FETCH ROUTES ===
  const fetchRoutes = useCallback(async (date?: string) => {
    if (!selectedCompany?.id) return [];
    
    try {
      let query = supabase
        .from('erp_logistics_routes')
        .select(`
          *,
          vehicle:erp_logistics_vehicles(*)
        `)
        .eq('company_id', selectedCompany.id)
        .order('route_date', { ascending: false });

      if (date) {
        query = query.eq('route_date', date);
      }

      const { data, error: fetchError } = await query.limit(50);

      if (fetchError) throw fetchError;
      setRoutes((data || []) as unknown as Route[]);
      return data || [];
    } catch (err) {
      console.error('[useERPLogistics] fetchRoutes error:', err);
      return [];
    }
  }, [selectedCompany?.id]);

  // === FETCH ACCOUNTING RULES ===
  const fetchAccountingRules = useCallback(async () => {
    if (!selectedCompany?.id) return [];
    
    try {
      const { data, error: fetchError } = await supabase
        .from('erp_logistics_accounting_rules')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (fetchError) throw fetchError;
      setAccountingRules((data || []) as AccountingRule[]);
      return data || [];
    } catch (err) {
      console.error('[useERPLogistics] fetchAccountingRules error:', err);
      return [];
    }
  }, [selectedCompany?.id]);

  // === CALCULATE STATS ===
  const calculateStats = useCallback(async (): Promise<LogisticsStats | null> => {
    if (!selectedCompany?.id) return null;

    try {
      // Obtener estadísticas de envíos
      const { data: shipmentsData } = await supabase
        .from('erp_logistics_shipments')
        .select('status, total_cost, has_incident, delivered_at, created_at')
        .eq('company_id', selectedCompany.id);

      const { data: vehiclesData } = await supabase
        .from('erp_logistics_vehicles')
        .select('status')
        .eq('company_id', selectedCompany.id)
        .eq('is_active', true);

      const today = new Date().toISOString().split('T')[0];
      const { data: routesData } = await supabase
        .from('erp_logistics_routes')
        .select('id')
        .eq('company_id', selectedCompany.id)
        .eq('route_date', today);

      const shipmentsList = shipmentsData || [];
      const vehiclesList = vehiclesData || [];

      const totalShipments = shipmentsList.length;
      const pendingShipments = shipmentsList.filter(s => s.status === 'pending' || s.status === 'confirmed').length;
      const inTransitShipments = shipmentsList.filter(s => 
        s.status === 'picked_up' || s.status === 'in_transit' || s.status === 'out_for_delivery'
      ).length;
      const deliveredShipments = shipmentsList.filter(s => s.status === 'delivered').length;
      const withIncidents = shipmentsList.filter(s => s.has_incident).length;
      const incidentRate = totalShipments > 0 ? (withIncidents / totalShipments) * 100 : 0;
      const totalCost = shipmentsList.reduce((sum, s) => sum + (s.total_cost || 0), 0);

      // Calcular días promedio de entrega
      const deliveredWithDates = shipmentsList.filter(s => s.status === 'delivered' && s.delivered_at);
      let avgDeliveryDays = 0;
      if (deliveredWithDates.length > 0) {
        const totalDays = deliveredWithDates.reduce((sum, s) => {
          const created = new Date(s.created_at).getTime();
          const delivered = new Date(s.delivered_at!).getTime();
          return sum + (delivered - created) / (1000 * 60 * 60 * 24);
        }, 0);
        avgDeliveryDays = totalDays / deliveredWithDates.length;
      }

      const calculatedStats: LogisticsStats = {
        totalShipments,
        pendingShipments,
        inTransitShipments,
        deliveredShipments,
        incidentRate,
        totalCost,
        avgDeliveryDays,
        vehiclesActive: vehiclesList.filter(v => v.status === 'available' || v.status === 'in_route').length,
        routesToday: routesData?.length || 0
      };

      setStats(calculatedStats);
      return calculatedStats;
    } catch (err) {
      console.error('[useERPLogistics] calculateStats error:', err);
      return null;
    }
  }, [selectedCompany?.id]);

  // === GENERATE ACCOUNTING ENTRY ===
  const generateAccountingEntry = useCallback(async (
    shipmentId: string,
    mode: 'preview' | 'post' = 'preview'
  ) => {
    try {
      // Obtener envío
      const { data: shipment } = await supabase
        .from('erp_logistics_shipments')
        .select('*, carrier_account:erp_logistics_carrier_accounts(*)')
        .eq('id', shipmentId)
        .single();

      if (!shipment) throw new Error('Envío no encontrado');

      // Obtener regla aplicable
      const { data: rules } = await supabase
        .from('erp_logistics_accounting_rules')
        .select('*')
        .eq('company_id', shipment.company_id)
        .eq('rule_type', 'shipment_cost')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1);

      const rule = rules?.[0];
      
      const entry = {
        date: new Date().toISOString().split('T')[0],
        description: `Coste envío ${shipment.shipment_number}`,
        lines: [
          {
            account_code: rule?.debit_account_code || '6240',
            account_name: 'Transportes',
            debit: shipment.total_cost || 0,
            credit: 0
          },
          {
            account_code: rule?.credit_account_code || '4100',
            account_name: 'Proveedores',
            debit: 0,
            credit: shipment.total_cost || 0
          }
        ],
        shipment_id: shipmentId,
        auto_post: rule?.auto_post || false
      };

      if (mode === 'post' && entry.auto_post) {
        // Aquí se integraría con useERPJournalEntries para crear el asiento real
        await supabase
          .from('erp_logistics_shipments')
          .update({
            is_accounted: true,
            accounted_at: new Date().toISOString()
          })
          .eq('id', shipmentId);

        toast.success('Asiento contabilizado');
      }

      return entry;
    } catch (err) {
      console.error('[useERPLogistics] generateAccountingEntry error:', err);
      toast.error('Error al generar asiento');
      return null;
    }
  }, []);

  // === INITIALIZE ===
  const initialize = useCallback(async () => {
    if (!selectedCompany?.id) return;
    
    setIsLoading(true);
    try {
      await Promise.all([
        fetchCarriers(),
        fetchCarrierAccounts(),
        fetchShipments({ limit: 50 }),
        fetchVehicles(),
        fetchRoutes(),
        fetchAccountingRules(),
        calculateStats()
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedCompany?.id,
    fetchCarriers,
    fetchCarrierAccounts,
    fetchShipments,
    fetchVehicles,
    fetchRoutes,
    fetchAccountingRules,
    calculateStats
  ]);

  // === AUTO-REFRESH ===
  const startAutoRefresh = useCallback((intervalMs = 60000) => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
    }
    autoRefreshInterval.current = setInterval(() => {
      fetchShipments({ limit: 50 });
      calculateStats();
    }, intervalMs);
  }, [fetchShipments, calculateStats]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }
  }, []);

  // === CLEANUP ===
  useEffect(() => {
    return () => stopAutoRefresh();
  }, [stopAutoRefresh]);

  // === UPDATE SHIPMENT ===
  const updateShipment = useCallback(async (
    shipmentId: string,
    updates: Partial<Shipment>
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('erp_logistics_shipments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (updateError) throw updateError;

      toast.success('Envío actualizado');
      await fetchShipments();
      return true;
    } catch (err) {
      console.error('[useERPLogistics] updateShipment error:', err);
      toast.error('Error al actualizar envío');
      return false;
    }
  }, [fetchShipments]);

  // === UPDATE CARRIER ===
  const updateCarrier = useCallback(async (
    carrierId: string,
    updates: { is_active?: boolean }
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('erp_logistics_carriers')
        .update(updates)
        .eq('id', carrierId);

      if (updateError) throw updateError;

      await fetchCarriers();
      return true;
    } catch (err) {
      console.error('[useERPLogistics] updateCarrier error:', err);
      return false;
    }
  }, [fetchCarriers]);

  // === CREATE CARRIER ACCOUNT ===
  const createCarrierAccount = useCallback(async (
    accountData: Partial<CarrierAccount>
  ) => {
    if (!selectedCompany?.id) {
      toast.error('Selecciona una empresa');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('erp_logistics_carrier_accounts')
        .insert([{
          company_id: selectedCompany.id,
          carrier_id: accountData.carrier_id,
          account_number: accountData.account_number,
          api_key: accountData.api_key,
          api_secret: accountData.api_secret,
          api_endpoint: accountData.api_endpoint,
          is_active: accountData.is_active ?? true,
          is_production: accountData.is_production ?? false,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchCarrierAccounts();
      return data;
    } catch (err) {
      console.error('[useERPLogistics] createCarrierAccount error:', err);
      return null;
    }
  }, [selectedCompany?.id, fetchCarrierAccounts]);

  // === UPDATE CARRIER ACCOUNT ===
  const updateCarrierAccount = useCallback(async (
    accountId: string,
    updates: Partial<CarrierAccount>
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('erp_logistics_carrier_accounts')
        .update(updates)
        .eq('id', accountId);

      if (updateError) throw updateError;

      await fetchCarrierAccounts();
      return true;
    } catch (err) {
      console.error('[useERPLogistics] updateCarrierAccount error:', err);
      return false;
    }
  }, [fetchCarrierAccounts]);

  // === RETURN ===
  return {
    // Estado
    isLoading,
    error,
    carriers,
    carrierAccounts,
    shipments,
    vehicles,
    routes,
    accountingRules,
    stats,
    
    // Acciones
    initialize,
    fetchCarriers,
    fetchCarrierAccounts,
    fetchShipments,
    createShipment,
    updateShipment,
    updateShipmentStatus,
    updateCarrier,
    createCarrierAccount,
    updateCarrierAccount,
    fetchVehicles,
    fetchRoutes,
    fetchAccountingRules,
    calculateStats,
    generateAccountingEntry,
    startAutoRefresh,
    stopAutoRefresh
  };
}

export default useERPLogistics;
