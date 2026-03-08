import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Installation {
  id: string;
  installation_name: string;
  installation_key: string;
  platform: string;
  deployment_type: string;
  core_version: string;
  status: string;
  environment: string;
  update_channel: string;
  auto_update: boolean;
  hostname?: string;
  ip_address?: string;
  last_heartbeat_at?: string;
  last_update_check_at?: string;
  license_id?: string;
  metadata?: Record<string, unknown>;
  installed_at?: string;
  created_at: string;
}

export interface InstallationModule {
  id: string;
  installation_id: string;
  module_key: string;
  module_name: string;
  module_version: string;
  target_version?: string;
  status: string;
  health_status: string;
  dependencies: string[];
  installed_at?: string;
  last_updated_at?: string;
  config?: Record<string, unknown>;
}

export interface InstallationUpdate {
  id: string;
  installation_id: string;
  module_key?: string;
  update_type: string;
  from_version: string;
  to_version: string;
  status: string;
  changelog?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  rollback_version?: string;
  created_at: string;
}

export interface ERPModuleDefinition {
  key: string;
  name: string;
  description: string;
  version: string;
  latestVersion: string;
  dependencies: string[];
  icon: string;
  category: string;
  minCoreVersion: string;
  sizeEstimateMb: number;
  changelog?: string;
}

export const ERP_MODULES: ERPModuleDefinition[] = [
  { key: 'core', name: 'Core ERP', description: 'Motor base del sistema', version: '1.0.0', latestVersion: '1.2.0', dependencies: [], icon: '⚙️', category: 'core', minCoreVersion: '1.0.0', sizeEstimateMb: 120 },
  { key: 'hr', name: 'RRHH', description: 'Gestión de recursos humanos, nóminas, fichaje', version: '1.0.0', latestVersion: '1.1.0', dependencies: ['core'], icon: '👥', category: 'operations', minCoreVersion: '1.0.0', sizeEstimateMb: 85 },
  { key: 'accounting', name: 'Contabilidad', description: 'Plan contable, asientos, balances', version: '1.0.0', latestVersion: '1.1.0', dependencies: ['core'], icon: '📊', category: 'finance', minCoreVersion: '1.0.0', sizeEstimateMb: 95 },
  { key: 'treasury', name: 'Tesorería', description: 'Cobros, pagos, conciliación bancaria', version: '1.0.0', latestVersion: '1.0.2', dependencies: ['core', 'accounting'], icon: '🏦', category: 'finance', minCoreVersion: '1.0.0', sizeEstimateMb: 60 },
  { key: 'purchasing', name: 'Compras', description: 'Proveedores, pedidos, recepción', version: '1.0.0', latestVersion: '1.0.1', dependencies: ['core'], icon: '🛒', category: 'operations', minCoreVersion: '1.0.0', sizeEstimateMb: 55 },
  { key: 'inventory', name: 'Inventario', description: 'Almacenes, stock, trazabilidad', version: '1.0.0', latestVersion: '1.0.3', dependencies: ['core'], icon: '📦', category: 'operations', minCoreVersion: '1.0.0', sizeEstimateMb: 70 },
  { key: 'sales', name: 'Ventas', description: 'Clientes, presupuestos, facturación', version: '1.0.0', latestVersion: '1.1.0', dependencies: ['core'], icon: '💼', category: 'commercial', minCoreVersion: '1.0.0', sizeEstimateMb: 75 },
  { key: 'fiscal', name: 'Fiscal', description: 'IVA, IRPF, SII, VeriFactu', version: '1.0.0', latestVersion: '1.2.0', dependencies: ['core', 'accounting'], icon: '🏛️', category: 'finance', minCoreVersion: '1.0.0', sizeEstimateMb: 65 },
  { key: 'legal', name: 'Legal & Compliance', description: 'RGPD, normativa, auditoría', version: '1.0.0', latestVersion: '1.0.1', dependencies: ['core'], icon: '⚖️', category: 'governance', minCoreVersion: '1.0.0', sizeEstimateMb: 45 },
  { key: 'esg', name: 'ESG & Sostenibilidad', description: 'CSRD, huella carbono, reporting', version: '1.0.0', latestVersion: '1.0.0', dependencies: ['core'], icon: '🌱', category: 'governance', minCoreVersion: '1.0.0', sizeEstimateMb: 40 },
  { key: 'logistics', name: 'Logística', description: 'Rutas, flotas, envíos', version: '1.0.0', latestVersion: '1.0.2', dependencies: ['core', 'inventory'], icon: '🚛', category: 'operations', minCoreVersion: '1.0.0', sizeEstimateMb: 60 },
  { key: 'crm', name: 'CRM', description: 'Pipeline, contactos, oportunidades', version: '1.0.0', latestVersion: '1.1.0', dependencies: ['core'], icon: '🤝', category: 'commercial', minCoreVersion: '1.0.0', sizeEstimateMb: 80 },
  { key: 'bi', name: 'Business Intelligence', description: 'Dashboards, KPIs, predicciones', version: '1.0.0', latestVersion: '1.0.1', dependencies: ['core'], icon: '📈', category: 'analytics', minCoreVersion: '1.0.0', sizeEstimateMb: 90 },
  { key: 'ai', name: 'Asistente IA', description: 'IA generativa, predicción, automatización', version: '1.0.0', latestVersion: '1.1.0', dependencies: ['core'], icon: '🤖', category: 'analytics', minCoreVersion: '1.0.0', sizeEstimateMb: 110 },
];

export type PlatformType = 'windows' | 'macos' | 'linux' | 'docker' | 'proxmox' | 'kubernetes' | 'aws' | 'azure' | 'gcp' | 'bare_metal';

export interface PlatformDefinition {
  key: PlatformType;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export const PLATFORMS: PlatformDefinition[] = [
  { key: 'docker', name: 'Docker', description: 'Contenedores con Docker Compose', icon: '🐳', category: 'containers' },
  { key: 'kubernetes', name: 'Kubernetes', description: 'Orquestación con Helm charts', icon: '☸️', category: 'containers' },
  { key: 'windows', name: 'Windows Server', description: 'Instalación nativa Windows', icon: '🪟', category: 'native' },
  { key: 'linux', name: 'Linux', description: 'Ubuntu/Debian/RHEL/Alpine', icon: '🐧', category: 'native' },
  { key: 'macos', name: 'macOS', description: 'Apple Silicon & Intel', icon: '🍎', category: 'native' },
  { key: 'proxmox', name: 'Proxmox VE', description: 'VM template preconfigurada', icon: '🖥️', category: 'virtualization' },
  { key: 'aws', name: 'AWS', description: 'EC2 + RDS CloudFormation', icon: '☁️', category: 'cloud' },
  { key: 'azure', name: 'Azure', description: 'Azure VM + SQL ARM template', icon: '🔷', category: 'cloud' },
  { key: 'gcp', name: 'Google Cloud', description: 'GCE + Cloud SQL Terraform', icon: '🔶', category: 'cloud' },
  { key: 'bare_metal', name: 'Bare Metal', description: 'Servidor físico dedicado', icon: '🔩', category: 'native' },
];

/** Resolve all transitive dependencies for a set of module keys */
export function resolveDependencies(selectedKeys: Set<string>): Set<string> {
  const resolved = new Set<string>();
  const resolve = (key: string) => {
    if (resolved.has(key)) return;
    resolved.add(key);
    const mod = ERP_MODULES.find(m => m.key === key);
    mod?.dependencies.forEach(dep => resolve(dep));
  };
  selectedKeys.forEach(k => resolve(k));
  return resolved;
}

/** Check which modules depend on a given module */
export function getDependents(moduleKey: string): string[] {
  return ERP_MODULES.filter(m => m.dependencies.includes(moduleKey)).map(m => m.key);
}

/** Check compatibility between installed modules and a new module */
export function checkCompatibility(
  installedModules: InstallationModule[],
  newModule: ERPModuleDefinition,
  coreVersion: string
): { compatible: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check core version
  if (compareVersions(coreVersion, newModule.minCoreVersion) < 0) {
    issues.push(`Requiere Core v${newModule.minCoreVersion} (instalado: v${coreVersion})`);
  }

  // Check missing dependencies
  const installedKeys = new Set(installedModules.filter(m => m.status === 'active').map(m => m.module_key));
  newModule.dependencies.forEach(dep => {
    if (!installedKeys.has(dep)) {
      const depMod = ERP_MODULES.find(m => m.key === dep);
      issues.push(`Requiere módulo "${depMod?.name || dep}" no instalado`);
    }
  });

  return { compatible: issues.length === 0, issues };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export function useInstallationManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [installationModules, setInstallationModules] = useState<InstallationModule[]>([]);
  const [installationUpdates, setInstallationUpdates] = useState<InstallationUpdate[]>([]);
  const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);

  const fetchInstallations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_installations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInstallations((data || []) as any);
    } catch (err) {
      console.error('[useInstallationManager] fetchInstallations error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInstallationDetails = useCallback(async (installationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('installation-manager', {
        body: { action: 'get_installation_status', params: { installation_id: installationId } },
      });

      if (error) throw error;
      if (data?.success) {
        setSelectedInstallation(data.data.installation);
        setInstallationModules(data.data.modules || []);
        setInstallationUpdates(data.data.updates || []);
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useInstallationManager] fetchInstallationDetails error:', err);
      return null;
    }
  }, []);

  const registerInstance = useCallback(async (params: {
    installation_name: string;
    platform: PlatformType;
    deployment_type: string;
    modules: { key: string; name: string; version?: string; dependencies?: string[] }[];
    environment?: string;
    license_id?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('installation-manager', {
        body: { action: 'register_instance', params },
      });

      if (error) throw error;
      if (data?.success) {
        setGeneratedScript(data.data.script);
        toast.success('Instalación registrada correctamente');
        await fetchInstallations();
        return data.data;
      }
      throw new Error('Registration failed');
    } catch (err) {
      console.error('[useInstallationManager] registerInstance error:', err);
      toast.error('Error al registrar instalación');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInstallations]);

  const generateScript = useCallback(async (params: {
    platform: PlatformType;
    deployment_type: string;
    modules: { key: string; name: string }[];
    installation_key?: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('installation-manager', {
        body: { action: 'generate_script', params },
      });

      if (error) throw error;
      if (data?.success) {
        setGeneratedScript(data.data.script);
        return data.data.script;
      }
      return null;
    } catch (err) {
      console.error('[useInstallationManager] generateScript error:', err);
      toast.error('Error al generar script');
      return null;
    }
  }, []);

  const addModule = useCallback(async (installationId: string, module: ERPModuleDefinition) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('installation-manager', {
        body: {
          action: 'add_module',
          params: {
            installation_id: installationId,
            module_key: module.key,
            module_name: module.name,
            module_version: module.version,
            dependencies: module.dependencies,
          },
        },
      });
      if (error) throw error;
      toast.success(`Módulo ${module.name} añadido`);
      await fetchInstallationDetails(installationId);
      return data?.data;
    } catch (err) {
      console.error('[useInstallationManager] addModule error:', err);
      toast.error('Error al añadir módulo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInstallationDetails]);

  const removeModule = useCallback(async (installationId: string, moduleKey: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('installation-manager', {
        body: {
          action: 'remove_module',
          params: { installation_id: installationId, module_key: moduleKey },
        },
      });
      if (error) throw error;
      toast.success('Módulo deshabilitado');
      await fetchInstallationDetails(installationId);
      return true;
    } catch (err) {
      console.error('[useInstallationManager] removeModule error:', err);
      toast.error('Error al deshabilitar módulo');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInstallationDetails]);

  const checkUpdates = useCallback(async (installationId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('installation-manager', {
        body: { action: 'check_updates', params: { installation_id: installationId } },
      });
      if (error) throw error;
      return data?.data?.updates || [];
    } catch (err) {
      console.error('[useInstallationManager] checkUpdates error:', err);
      return [];
    }
  }, []);

  const applyUpdate = useCallback(async (installationId: string, moduleKey: string, toVersion: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('installation-manager', {
        body: {
          action: 'apply_update',
          params: { installation_id: installationId, module_key: moduleKey, to_version: toVersion },
        },
      });
      if (error) throw error;
      toast.success(`Módulo actualizado a v${toVersion}`);
      await fetchInstallationDetails(installationId);
      return data?.data;
    } catch (err) {
      console.error('[useInstallationManager] applyUpdate error:', err);
      toast.error('Error al actualizar módulo');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInstallationDetails]);

  const updateChannel = useCallback(async (installationId: string, channel: string) => {
    try {
      const { error } = await supabase
        .from('client_installations')
        .update({ update_channel: channel } as any)
        .eq('id', installationId);

      if (error) throw error;
      toast.success(`Canal cambiado a ${channel}`);
      await fetchInstallations();
    } catch (err) {
      console.error('[useInstallationManager] updateChannel error:', err);
      toast.error('Error al cambiar canal');
    }
  }, [fetchInstallations]);

  const linkLicense = useCallback(async (installationId: string, licenseId: string) => {
    try {
      const { error } = await supabase
        .from('client_installations')
        .update({ license_id: licenseId } as any)
        .eq('id', installationId);

      if (error) throw error;
      toast.success('Licencia vinculada a la instalación');
      await fetchInstallationDetails(installationId);
    } catch (err) {
      console.error('[useInstallationManager] linkLicense error:', err);
      toast.error('Error al vincular licencia');
    }
  }, [fetchInstallationDetails]);

  return {
    isLoading,
    installations,
    generatedScript,
    installationModules,
    installationUpdates,
    selectedInstallation,
    fetchInstallations,
    fetchInstallationDetails,
    registerInstance,
    generateScript,
    addModule,
    removeModule,
    checkUpdates,
    applyUpdate,
    updateChannel,
    linkLicense,
    setGeneratedScript,
    setSelectedInstallation,
  };
}
