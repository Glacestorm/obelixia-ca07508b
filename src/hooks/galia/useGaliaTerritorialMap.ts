/**
 * useGaliaTerritorialMap Hook
 * Manages navigation state and data for the territorial map drill-down system
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { spainCCAAData, type CCAAData } from '@/components/galia/territorial-map/spain-paths';

// Navigation levels
export type MapLevel = 'national' | 'regional' | 'provincial' | 'municipal' | 'expediente';

// Data types for each level
export interface CCAAMapData {
  id: string;
  name: string;
  shortName: string;
  totalGrants: number;
  totalBudget: number;
  executionRate: number;
  pendingGrants: number;
  approvedGrants: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface ProvinceMapData {
  id: string;
  name: string;
  ccaaId: string;
  totalGrants: number;
  totalBudget: number;
  executionRate: number;
  gals: number;
}

export interface MunicipalMapData {
  id: string;
  name: string;
  provinceId: string;
  latitude: number;
  longitude: number;
  grants: number;
  budget: number;
}

export interface ExpedienteMapData {
  id: string;
  numero_expediente: string;
  beneficiario: string;
  titulo: string;
  importe_concedido: number;
  estado: string;
  municipio: string;
  latitude?: number;
  longitude?: number;
}

// Navigation state
export interface MapNavigationState {
  level: MapLevel;
  selectedCCAA: string | null;
  selectedProvince: string | null;
  selectedMunicipal: string | null;
  selectedExpediente: string | null;
  breadcrumb: Array<{ level: MapLevel; id: string | null; label: string }>;
}

// Hook return type
export interface UseGaliaTerritorialMapReturn {
  // State
  navigation: MapNavigationState;
  isLoading: boolean;
  error: string | null;
  
  // Data by level
  ccaaData: CCAAMapData[];
  provinceData: ProvinceMapData[];
  municipalData: MunicipalMapData[];
  expedienteData: ExpedienteMapData[];
  
  // Navigation actions
  drillDown: (level: MapLevel, id: string, label: string) => void;
  drillUp: () => void;
  goToLevel: (index: number) => void;
  resetNavigation: () => void;
  
  // Data actions
  refreshData: () => Promise<void>;
  
  // Selected items
  selectedCCAAInfo: CCAAData | null;
  currentLevelData: CCAAMapData | ProvinceMapData | null;
}

// Initial state
const initialNavigationState: MapNavigationState = {
  level: 'national',
  selectedCCAA: null,
  selectedProvince: null,
  selectedMunicipal: null,
  selectedExpediente: null,
  breadcrumb: [{ level: 'national', id: null, label: 'España' }]
};

export function useGaliaTerritorialMap(): UseGaliaTerritorialMapReturn {
  // Navigation state
  const [navigation, setNavigation] = useState<MapNavigationState>(initialNavigationState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data cache by level
  const [ccaaData, setCcaaData] = useState<CCAAMapData[]>([]);
  const [provinceData, setProvinceData] = useState<ProvinceMapData[]>([]);
  const [municipalData, setMunicipalData] = useState<MunicipalMapData[]>([]);
  const [expedienteData, setExpedienteData] = useState<ExpedienteMapData[]>([]);
  
  // Auto-refresh interval
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Generate mock data for CCAA (will be replaced with real API call)
  const generateMockCCAAData = useCallback((): CCAAMapData[] => {
    return spainCCAAData.map(ccaa => {
      const totalGrants = Math.floor(Math.random() * 500) + 50;
      const totalBudget = (Math.random() * 50 + 5) * 1000000;
      const executionRate = Math.random() * 100;
      const pendingGrants = Math.floor(totalGrants * 0.3);
      const approvedGrants = totalGrants - pendingGrants;
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (executionRate < 50) status = 'critical';
      else if (executionRate < 75) status = 'warning';
      
      return {
        id: ccaa.id,
        name: ccaa.name,
        shortName: ccaa.shortName,
        totalGrants,
        totalBudget,
        executionRate,
        pendingGrants,
        approvedGrants,
        status
      };
    });
  }, []);

  // Generate mock province data for a CCAA
  const generateMockProvinceData = useCallback((ccaaId: string): ProvinceMapData[] => {
    const ccaa = spainCCAAData.find(c => c.id === ccaaId);
    if (!ccaa) return [];
    
    return ccaa.provinces.map((province, idx) => ({
      id: `${ccaaId}-${idx}`,
      name: province,
      ccaaId,
      totalGrants: Math.floor(Math.random() * 100) + 10,
      totalBudget: (Math.random() * 10 + 1) * 1000000,
      executionRate: Math.random() * 100,
      gals: Math.floor(Math.random() * 5) + 1
    }));
  }, []);

  // Fetch CCAA summary data
  const fetchCCAAData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to call edge function
      const { data, error: fnError } = await supabase.functions.invoke('galia-territorial-map', {
        body: { action: 'get_ccaa_summary' }
      });
      
      if (fnError) {
        console.warn('[useGaliaTerritorialMap] Edge function not available, using mock data');
        setCcaaData(generateMockCCAAData());
        return;
      }
      
      if (data?.success && data?.data) {
        setCcaaData(data.data);
      } else {
        setCcaaData(generateMockCCAAData());
      }
    } catch (err) {
      console.warn('[useGaliaTerritorialMap] Using mock data:', err);
      setCcaaData(generateMockCCAAData());
    } finally {
      setIsLoading(false);
    }
  }, [generateMockCCAAData]);

  // Fetch province data for a CCAA
  const fetchProvinceData = useCallback(async (ccaaId: string) => {
    setIsLoading(true);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('galia-territorial-map', {
        body: { action: 'get_region_detail', ccaaId }
      });
      
      if (fnError || !data?.success) {
        setProvinceData(generateMockProvinceData(ccaaId));
        return;
      }
      
      setProvinceData(data.data);
    } catch (err) {
      setProvinceData(generateMockProvinceData(ccaaId));
    } finally {
      setIsLoading(false);
    }
  }, [generateMockProvinceData]);

  // Drill down to next level
  const drillDown = useCallback((level: MapLevel, id: string, label: string) => {
    setNavigation(prev => {
      const newBreadcrumb = [...prev.breadcrumb, { level, id, label }];
      
      const newState: MapNavigationState = {
        ...prev,
        level,
        breadcrumb: newBreadcrumb
      };
      
      switch (level) {
        case 'regional':
          newState.selectedCCAA = id;
          fetchProvinceData(id);
          break;
        case 'provincial':
          newState.selectedProvince = id;
          break;
        case 'municipal':
          newState.selectedMunicipal = id;
          break;
        case 'expediente':
          newState.selectedExpediente = id;
          break;
      }
      
      return newState;
    });
  }, [fetchProvinceData]);

  // Drill up to previous level
  const drillUp = useCallback(() => {
    setNavigation(prev => {
      if (prev.breadcrumb.length <= 1) return prev;
      
      const newBreadcrumb = prev.breadcrumb.slice(0, -1);
      const lastItem = newBreadcrumb[newBreadcrumb.length - 1];
      
      const newState: MapNavigationState = {
        ...prev,
        level: lastItem.level,
        breadcrumb: newBreadcrumb
      };
      
      // Clear selections based on level
      switch (lastItem.level) {
        case 'national':
          newState.selectedCCAA = null;
          newState.selectedProvince = null;
          newState.selectedMunicipal = null;
          newState.selectedExpediente = null;
          break;
        case 'regional':
          newState.selectedProvince = null;
          newState.selectedMunicipal = null;
          newState.selectedExpediente = null;
          break;
        case 'provincial':
          newState.selectedMunicipal = null;
          newState.selectedExpediente = null;
          break;
      }
      
      return newState;
    });
  }, []);

  // Go to specific breadcrumb level
  const goToLevel = useCallback((index: number) => {
    setNavigation(prev => {
      if (index >= prev.breadcrumb.length || index < 0) return prev;
      
      const newBreadcrumb = prev.breadcrumb.slice(0, index + 1);
      const targetItem = newBreadcrumb[index];
      
      const newState: MapNavigationState = {
        ...prev,
        level: targetItem.level,
        breadcrumb: newBreadcrumb
      };
      
      // Reset selections based on level
      if (targetItem.level === 'national') {
        newState.selectedCCAA = null;
        newState.selectedProvince = null;
        newState.selectedMunicipal = null;
        newState.selectedExpediente = null;
      } else if (targetItem.level === 'regional') {
        newState.selectedCCAA = targetItem.id;
        newState.selectedProvince = null;
        newState.selectedMunicipal = null;
        newState.selectedExpediente = null;
      }
      
      return newState;
    });
  }, []);

  // Reset to national level
  const resetNavigation = useCallback(() => {
    setNavigation(initialNavigationState);
    setProvinceData([]);
    setMunicipalData([]);
    setExpedienteData([]);
  }, []);

  // Refresh current level data
  const refreshData = useCallback(async () => {
    await fetchCCAAData();
  }, [fetchCCAAData]);

  // Get selected CCAA info
  const selectedCCAAInfo = useMemo((): CCAAData | null => {
    if (!navigation.selectedCCAA) return null;
    return spainCCAAData.find(c => c.id === navigation.selectedCCAA) || null;
  }, [navigation.selectedCCAA]);

  // Get current level summary data
  const currentLevelData = useMemo((): CCAAMapData | ProvinceMapData | null => {
    if (navigation.selectedProvince) {
      return provinceData.find(p => p.id === navigation.selectedProvince) || null;
    }
    if (navigation.selectedCCAA) {
      return ccaaData.find(c => c.id === navigation.selectedCCAA) || null;
    }
    return null;
  }, [navigation.selectedCCAA, navigation.selectedProvince, ccaaData, provinceData]);

  // Initial data fetch
  useEffect(() => {
    fetchCCAAData();
  }, [fetchCCAAData]);

  // Keyboard navigation (Escape to go back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && navigation.level !== 'national') {
        drillUp();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigation.level, drillUp]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  return {
    // State
    navigation,
    isLoading,
    error,
    
    // Data
    ccaaData,
    provinceData,
    municipalData,
    expedienteData,
    
    // Actions
    drillDown,
    drillUp,
    goToLevel,
    resetNavigation,
    refreshData,
    
    // Computed
    selectedCCAAInfo,
    currentLevelData
  };
}

export default useGaliaTerritorialMap;
