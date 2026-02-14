import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BudgetCategory {
  id: string;
  name: string;
  description: string;
  items: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  concept: string;
  description: string;
  unitCost: number;
  quantity: number;
  total: number;
  notes: string;
}

export interface BudgetSummary {
  totalBudget: number;
  byCategory: { name: string; total: number; percentage: number }[];
  timeline: { quarter: string; amount: number }[];
}

const DEFAULT_CATEGORIES: BudgetCategory[] = [
  {
    id: 'ia-dev',
    name: 'Desarrollo IA',
    description: 'Asistente virtual, moderación de costes, análisis documental',
    items: [
      { id: 'ia-1', concept: 'Asistente Virtual IA', description: 'Desarrollo y entrenamiento del chatbot especializado', unitCost: 15000, quantity: 1, total: 15000, notes: '' },
      { id: 'ia-2', concept: 'Moderador de Costes IA', description: 'Sistema de análisis automático de presupuestos', unitCost: 12000, quantity: 1, total: 12000, notes: '' },
      { id: 'ia-3', concept: 'Análisis Documental IA', description: 'OCR y clasificación inteligente de documentos', unitCost: 10000, quantity: 1, total: 10000, notes: '' },
    ]
  },
  {
    id: 'integrations',
    name: 'Integraciones',
    description: 'Conexión con AAPP, registros electrónicos, firma digital',
    items: [
      { id: 'int-1', concept: 'Integración AAPP', description: 'Conexión con administraciones públicas', unitCost: 8000, quantity: 1, total: 8000, notes: '' },
      { id: 'int-2', concept: 'Firma electrónica', description: 'Cl@ve, DNIe y certificado digital', unitCost: 5000, quantity: 1, total: 5000, notes: '' },
    ]
  },
  {
    id: 'infra',
    name: 'Infraestructura / Licencias',
    description: 'Servidores, almacenamiento cloud, licencias de software',
    items: [
      { id: 'inf-1', concept: 'Hosting y Cloud', description: 'Servidores y almacenamiento durante 24 meses', unitCost: 300, quantity: 24, total: 7200, notes: '' },
      { id: 'inf-2', concept: 'Licencias Software', description: 'Herramientas de desarrollo y análisis', unitCost: 2000, quantity: 1, total: 2000, notes: '' },
    ]
  },
  {
    id: 'training',
    name: 'Formación',
    description: 'Capacitación de técnicos GAL y usuarios finales',
    items: [
      { id: 'tra-1', concept: 'Formación técnicos GAL', description: 'Sesiones presenciales y online', unitCost: 3000, quantity: 1, total: 3000, notes: '' },
      { id: 'tra-2', concept: 'Material formativo', description: 'Manuales, vídeos tutoriales, guías', unitCost: 2000, quantity: 1, total: 2000, notes: '' },
    ]
  },
  {
    id: 'management',
    name: 'Gestión y Soporte',
    description: 'Coordinación del proyecto, soporte técnico, auditoría',
    items: [
      { id: 'ges-1', concept: 'Coordinación proyecto', description: 'Gestión técnica y administrativa', unitCost: 4000, quantity: 6, total: 24000, notes: '' },
      { id: 'ges-2', concept: 'Soporte técnico', description: 'Mantenimiento y resolución de incidencias', unitCost: 1500, quantity: 12, total: 18000, notes: '' },
    ]
  },
];

export function useGaliaBudgetPlanner() {
  const [categories, setCategories] = useState<BudgetCategory[]>(DEFAULT_CATEGORIES);
  const [isGenerating, setIsGenerating] = useState(false);

  const updateItem = useCallback((categoryId: string, itemId: string, field: keyof BudgetItem, value: number | string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      return {
        ...cat,
        items: cat.items.map(item => {
          if (item.id !== itemId) return item;
          const updated = { ...item, [field]: value };
          if (field === 'unitCost' || field === 'quantity') {
            updated.total = updated.unitCost * updated.quantity;
          }
          return updated;
        })
      };
    }));
  }, []);

  const addItem = useCallback((categoryId: string) => {
    const newItem: BudgetItem = {
      id: `custom-${Date.now()}`,
      concept: 'Nueva partida',
      description: '',
      unitCost: 0,
      quantity: 1,
      total: 0,
      notes: '',
    };
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, items: [...cat.items, newItem] } : cat
    ));
  }, []);

  const removeItem = useCallback((categoryId: string, itemId: string) => {
    setCategories(prev => prev.map(cat =>
      cat.id === categoryId ? { ...cat, items: cat.items.filter(i => i.id !== itemId) } : cat
    ));
  }, []);

  const getSummary = useCallback((): BudgetSummary => {
    const byCategory = categories.map(cat => ({
      name: cat.name,
      total: cat.items.reduce((sum, i) => sum + i.total, 0),
      percentage: 0,
    }));
    const totalBudget = byCategory.reduce((sum, c) => sum + c.total, 0);
    byCategory.forEach(c => { c.percentage = totalBudget > 0 ? (c.total / totalBudget) * 100 : 0; });

    const quarterAmount = totalBudget / 4;
    const timeline = [
      { quarter: 'Q1 2026', amount: quarterAmount * 0.35 },
      { quarter: 'Q2 2026', amount: quarterAmount * 0.30 },
      { quarter: 'Q3 2026', amount: quarterAmount * 0.20 },
      { quarter: 'Q4 2026', amount: quarterAmount * 0.15 },
    ];

    return { totalBudget, byCategory, timeline };
  }, [categories]);

  const generateAIRecommendation = useCallback(async () => {
    setIsGenerating(true);
    try {
      const summary = getSummary();
      const { data, error } = await supabase.functions.invoke('galia-phase2-planner', {
        body: {
          action: 'budget_review',
          params: { categories, summary }
        }
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Recomendaciones generadas');
        return data.data;
      }
      return null;
    } catch (err) {
      console.error('[useGaliaBudgetPlanner] AI error:', err);
      toast.error('Error al generar recomendaciones');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [categories, getSummary]);

  const resetToDefaults = useCallback(() => {
    setCategories(DEFAULT_CATEGORIES);
    toast.info('Presupuesto restaurado a valores predeterminados');
  }, []);

  return {
    categories,
    updateItem,
    addItem,
    removeItem,
    getSummary,
    generateAIRecommendation,
    isGenerating,
    resetToDefaults,
  };
}
