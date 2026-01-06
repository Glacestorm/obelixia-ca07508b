import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { ModulePlaceholder } from './ModulePlaceholder';

// Mapeo de module_key a componentes implementados
const IMPLEMENTED_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  // Core CRM
  'crm-companies': React.lazy(() => import('@/components/admin/CompaniesManager').then(m => ({ default: m.CompaniesManager }))),
  'crm-contacts': React.lazy(() => import('@/components/crm/contacts/ContactsManager').then(m => ({ default: m.ContactsManager }))),
  'crm-deals': React.lazy(() => import('@/components/crm/deals/DealsKanban').then(m => ({ default: m.DealsKanban }))),
  'crm-activities': React.lazy(() => import('@/components/crm/activities/ActivitiesManager').then(m => ({ default: m.ActivitiesManager }))),
  'crm-omnichannel': React.lazy(() => import('@/components/crm/omnichannel/OmnichannelInbox').then(m => ({ default: m.OmnichannelInbox }))),
  'crm-sentiment': React.lazy(() => import('@/components/crm/sentiment/SentimentAnalysisDashboard').then(m => ({ default: m.SentimentAnalysisDashboard }))),
  'crm-sla': React.lazy(() => import('@/components/crm/omnichannel/MultichannelSLADashboard').then(m => ({ default: m.MultichannelSLADashboard }))),
  'crm-agents': React.lazy(() => import('@/components/crm/agents/CRMAgentsPanel').then(m => ({ default: m.CRMAgentsPanel }))),
  // CRM Modular Dashboard
  'crm-modular': React.lazy(() => import('@/components/crm/CRMModularDashboard').then(m => ({ default: m.CRMModularDashboard }))),
};

interface DynamicModuleRouterProps {
  moduleKey?: string;
}

export const DynamicModuleRouter: React.FC<DynamicModuleRouterProps> = ({ moduleKey: propModuleKey }) => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  
  // El moduleKey puede venir de props, params, o searchParams
  const moduleKey = propModuleKey || params.moduleKey || searchParams.get('module') || '';
  
  const [loading, setLoading] = useState(true);
  const [moduleExists, setModuleExists] = useState(false);
  const [isImplemented, setIsImplemented] = useState(false);

  useEffect(() => {
    checkModule();
  }, [moduleKey]);

  const checkModule = async () => {
    if (!moduleKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // Verificar si existe en la tienda
      const { data, error } = await supabase
        .from('app_modules')
        .select('id, module_key')
        .eq('module_key', moduleKey)
        .single();

      setModuleExists(!error && !!data);
      
      // Verificar si está implementado
      setIsImplemented(moduleKey in IMPLEMENTED_COMPONENTS);
      
    } catch (error) {
      console.error('Error checking module:', error);
      setModuleExists(false);
      setIsImplemented(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!moduleKey) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No se especificó ningún módulo</p>
      </div>
    );
  }

  // Si está implementado, renderizar el componente
  if (isImplemented) {
    const Component = IMPLEMENTED_COMPONENTS[moduleKey];
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }>
        <Component />
      </Suspense>
    );
  }

  // Si existe en tienda pero no está implementado, mostrar placeholder
  if (moduleExists) {
    return <ModulePlaceholder moduleKey={moduleKey} />;
  }

  // No existe en ningún lado
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">
        El módulo "{moduleKey}" no existe en el catálogo
      </p>
    </div>
  );
};

export default DynamicModuleRouter;
