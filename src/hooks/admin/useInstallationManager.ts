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
  status: string;
  health_status: string;
  dependencies: string[];
  installed_at?: string;
}

export interface ERPModuleDefinition {
  key: string;
  name: string;
  description: string;
  version: string;
  dependencies: string[];
  icon: string;
  category: string;
}

export const ERP_MODULES: ERPModuleDefinition[] = [
  { key: 'core', name: 'Core ERP', description: 'Motor base del sistema', version: '1.0.0', dependencies: [], icon: '⚙️', category: 'core' },
  { key: 'hr', name: 'RRHH', description: 'Gestión de recursos humanos, nóminas, fichaje', version: '1.0.0', dependencies: ['core'], icon: '👥', category: 'operations' },
  { key: 'accounting', name: 'Contabilidad', description: 'Plan contable, asientos, balances', version: '1.0.0', dependencies: ['core'], icon: '📊', category: 'finance' },
  { key: 'treasury', name: 'Tesorería', description: 'Cobros, pagos, conciliación bancaria', version: '1.0.0', dependencies: ['core', 'accounting'], icon: '🏦', category: 'finance' },
  { key: 'purchasing', name: 'Compras', description: 'Proveedores, pedidos, recepción', version: '1.0.0', dependencies: ['core'], icon: '🛒', category: 'operations' },
  { key: 'inventory', name: 'Inventario', description: 'Almacenes, stock, trazabilidad', version: '1.0.0', dependencies: ['core'], icon: '📦', category: 'operations' },
  { key: 'sales', name: 'Ventas', description: 'Clientes, presupuestos, facturación', version: '1.0.0', dependencies: ['core'], icon: '💼', category: 'commercial' },
  { key: 'fiscal', name: 'Fiscal', description: 'IVA, IRPF, SII, VeriFactu', version: '1.0.0', dependencies: ['core', 'accounting'], icon: '🏛️', category: 'finance' },
  { key: 'legal', name: 'Legal & Compliance', description: 'RGPD, normativa, auditoría', version: '1.0.0', dependencies: ['core'], icon: '⚖️', category: 'governance' },
  { key: 'esg', name: 'ESG & Sostenibilidad', description: 'CSRD, huella carbono, reporting', version: '1.0.0', dependencies: ['core'], icon: '🌱', category: 'governance' },
  { key: 'logistics', name: 'Logística', description: 'Rutas, flotas, envíos', version: '1.0.0', dependencies: ['core', 'inventory'], icon: '🚛', category: 'operations' },
  { key: 'crm', name: 'CRM', description: 'Pipeline, contactos, oportunidades', version: '1.0.0', dependencies: ['core'], icon: '🤝', category: 'commercial' },
  { key: 'bi', name: 'Business Intelligence', description: 'Dashboards, KPIs, predicciones', version: '1.0.0', dependencies: ['core'], icon: '📈', category: 'analytics' },
  { key: 'ai', name: 'Asistente IA', description: 'IA generativa, predicción, automatización', version: '1.0.0', dependencies: ['core'], icon: '🤖', category: 'analytics' },
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

export function useInstallationManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);

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
      return data?.data;
    } catch (err) {
      console.error('[useInstallationManager] addModule error:', err);
      toast.error('Error al añadir módulo');
      return null;
    }
  }, []);

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

  return {
    isLoading,
    installations,
    generatedScript,
    fetchInstallations,
    registerInstance,
    generateScript,
    addModule,
    checkUpdates,
    setGeneratedScript,
  };
}
