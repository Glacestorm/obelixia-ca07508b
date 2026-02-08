/**
 * useGaliaTranslations - Hook para internacionalización del módulo GALIA
 * Soporte para ca/es/fr/en según sistema i18n existente
 */

import { useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// === TRADUCCIONES GALIA ===
const GALIA_TRANSLATIONS: Record<string, Record<string, string>> = {
  // === TÍTULOS Y HEADERS ===
  'galia.title': {
    es: 'Gestión de Ayudas LEADER',
    ca: 'Gestió d\'Ajudes LEADER',
    fr: 'Gestion des Aides LEADER',
    en: 'LEADER Grants Management',
  },
  'galia.subtitle': {
    es: 'Plataforma inteligente de gestión de subvenciones rurales',
    ca: 'Plataforma intel·ligent de gestió de subvencions rurals',
    fr: 'Plateforme intelligente de gestion des subventions rurales',
    en: 'Smart rural subsidies management platform',
  },

  // === PORTAL CIUDADANO ===
  'galia.portal.title': {
    es: 'Portal del Ciudadano',
    ca: 'Portal del Ciutadà',
    fr: 'Portail du Citoyen',
    en: 'Citizen Portal',
  },
  'galia.portal.search': {
    es: 'Buscar convocatorias',
    ca: 'Cercar convocatòries',
    fr: 'Rechercher des appels',
    en: 'Search calls',
  },
  'galia.portal.trackExpediente': {
    es: 'Seguimiento de expediente',
    ca: 'Seguiment d\'expedient',
    fr: 'Suivi de dossier',
    en: 'Track application',
  },
  'galia.portal.enterCode': {
    es: 'Introduce tu código de expediente',
    ca: 'Introdueix el teu codi d\'expedient',
    fr: 'Entrez votre code de dossier',
    en: 'Enter your application code',
  },

  // === ESTADOS DE EXPEDIENTE ===
  'galia.status.pending': {
    es: 'Pendiente de revisión',
    ca: 'Pendent de revisió',
    fr: 'En attente de révision',
    en: 'Pending review',
  },
  'galia.status.inProgress': {
    es: 'En tramitación',
    ca: 'En tramitació',
    fr: 'En cours de traitement',
    en: 'In progress',
  },
  'galia.status.approved': {
    es: 'Aprobado',
    ca: 'Aprovat',
    fr: 'Approuvé',
    en: 'Approved',
  },
  'galia.status.rejected': {
    es: 'Denegado',
    ca: 'Denegat',
    fr: 'Refusé',
    en: 'Rejected',
  },
  'galia.status.completed': {
    es: 'Completado',
    ca: 'Completat',
    fr: 'Terminé',
    en: 'Completed',
  },

  // === ASISTENTE IA ===
  'galia.ai.assistant': {
    es: 'Asistente Virtual GALIA',
    ca: 'Assistent Virtual GALIA',
    fr: 'Assistant Virtuel GALIA',
    en: 'GALIA Virtual Assistant',
  },
  'galia.ai.modeCitizen': {
    es: 'Modo Ciudadano',
    ca: 'Mode Ciutadà',
    fr: 'Mode Citoyen',
    en: 'Citizen Mode',
  },
  'galia.ai.modeTechnician': {
    es: 'Modo Técnico',
    ca: 'Mode Tècnic',
    fr: 'Mode Technicien',
    en: 'Technician Mode',
  },
  'galia.ai.askQuestion': {
    es: '¿En qué puedo ayudarte?',
    ca: 'En què puc ajudar-te?',
    fr: 'Comment puis-je vous aider?',
    en: 'How can I help you?',
  },

  // === ANÁLISIS DE COSTES ===
  'galia.costs.title': {
    es: 'Análisis de Costes',
    ca: 'Anàlisi de Costos',
    fr: 'Analyse des Coûts',
    en: 'Cost Analysis',
  },
  'galia.costs.deviation': {
    es: 'Desviación detectada',
    ca: 'Desviació detectada',
    fr: 'Écart détecté',
    en: 'Deviation detected',
  },
  'galia.costs.threeOffers': {
    es: 'Requiere 3 ofertas (>18.000€)',
    ca: 'Requereix 3 ofertes (>18.000€)',
    fr: 'Nécessite 3 offres (>18.000€)',
    en: 'Requires 3 quotes (>€18,000)',
  },

  // === DOCUMENTOS ===
  'galia.docs.title': {
    es: 'Gestión Documental',
    ca: 'Gestió Documental',
    fr: 'Gestion Documentaire',
    en: 'Document Management',
  },
  'galia.docs.upload': {
    es: 'Subir documento',
    ca: 'Pujar document',
    fr: 'Télécharger document',
    en: 'Upload document',
  },
  'galia.docs.analyze': {
    es: 'Analizar con IA',
    ca: 'Analitzar amb IA',
    fr: 'Analyser avec IA',
    en: 'Analyze with AI',
  },

  // === TRANSPARENCIA ===
  'galia.transparency.title': {
    es: 'Portal de Transparencia',
    ca: 'Portal de Transparència',
    fr: 'Portail de Transparence',
    en: 'Transparency Portal',
  },
  'galia.transparency.publicData': {
    es: 'Datos Públicos',
    ca: 'Dades Públiques',
    fr: 'Données Publiques',
    en: 'Public Data',
  },
  'galia.transparency.explainability': {
    es: 'Explicabilidad IA',
    ca: 'Explicabilitat IA',
    fr: 'Explicabilité IA',
    en: 'AI Explainability',
  },
  'galia.transparency.audit': {
    es: 'Trazabilidad',
    ca: 'Traçabilitat',
    fr: 'Traçabilité',
    en: 'Audit Trail',
  },

  // === IMPACTO ===
  'galia.impact.title': {
    es: 'Predicción de Impacto',
    ca: 'Predicció d\'Impacte',
    fr: 'Prédiction d\'Impact',
    en: 'Impact Prediction',
  },
  'galia.impact.employment': {
    es: 'Empleo generado',
    ca: 'Ocupació generada',
    fr: 'Emploi généré',
    en: 'Employment generated',
  },
  'galia.impact.viability': {
    es: 'Viabilidad del proyecto',
    ca: 'Viabilitat del projecte',
    fr: 'Viabilité du projet',
    en: 'Project viability',
  },

  // === INFORMES ===
  'galia.reports.title': {
    es: 'Generación de Informes',
    ca: 'Generació d\'Informes',
    fr: 'Génération de Rapports',
    en: 'Report Generation',
  },
  'galia.reports.annual': {
    es: 'Memoria Anual',
    ca: 'Memòria Anual',
    fr: 'Rapport Annuel',
    en: 'Annual Report',
  },
  'galia.reports.feder': {
    es: 'Informe FEDER',
    ca: 'Informe FEDER',
    fr: 'Rapport FEDER',
    en: 'FEDER Report',
  },
  'galia.reports.dashboard': {
    es: 'Cuadro de Mando',
    ca: 'Quadre de Comandament',
    fr: 'Tableau de Bord',
    en: 'Dashboard',
  },

  // === GESTIÓN TÉCNICA ===
  'galia.management.title': {
    es: 'Gestión de Expedientes',
    ca: 'Gestió d\'Expedients',
    fr: 'Gestion des Dossiers',
    en: 'Case Management',
  },
  'galia.management.instruction': {
    es: 'Instrucción',
    ca: 'Instrucció',
    fr: 'Instruction',
    en: 'Instruction',
  },
  'galia.management.evaluation': {
    es: 'Evaluación',
    ca: 'Avaluació',
    fr: 'Évaluation',
    en: 'Evaluation',
  },
  'galia.management.resolution': {
    es: 'Resolución',
    ca: 'Resolució',
    fr: 'Résolution',
    en: 'Resolution',
  },

  // === ANÁLISIS IA ===
  'galia.aiAnalysis.risk': {
    es: 'Análisis de Riesgos',
    ca: 'Anàlisi de Riscos',
    fr: 'Analyse des Risques',
    en: 'Risk Analysis',
  },
  'galia.aiAnalysis.assignment': {
    es: 'Asignación Inteligente',
    ca: 'Assignació Intel·ligent',
    fr: 'Affectation Intelligente',
    en: 'Smart Assignment',
  },
  'galia.aiAnalysis.prediction': {
    es: 'Predicción de Plazos',
    ca: 'Predicció de Terminis',
    fr: 'Prédiction des Délais',
    en: 'Deadline Prediction',
  },
  'galia.aiAnalysis.alerts': {
    es: 'Alertas Proactivas',
    ca: 'Alertes Proactives',
    fr: 'Alertes Proactives',
    en: 'Proactive Alerts',
  },

  // === ACCIONES COMUNES ===
  'galia.action.save': {
    es: 'Guardar',
    ca: 'Desar',
    fr: 'Enregistrer',
    en: 'Save',
  },
  'galia.action.cancel': {
    es: 'Cancelar',
    ca: 'Cancel·lar',
    fr: 'Annuler',
    en: 'Cancel',
  },
  'galia.action.export': {
    es: 'Exportar',
    ca: 'Exportar',
    fr: 'Exporter',
    en: 'Export',
  },
  'galia.action.refresh': {
    es: 'Actualizar',
    ca: 'Actualitzar',
    fr: 'Actualiser',
    en: 'Refresh',
  },
  'galia.action.analyze': {
    es: 'Analizar',
    ca: 'Analitzar',
    fr: 'Analyser',
    en: 'Analyze',
  },
  'galia.action.generate': {
    es: 'Generar',
    ca: 'Generar',
    fr: 'Générer',
    en: 'Generate',
  },

  // === MENSAJES ===
  'galia.message.loading': {
    es: 'Cargando...',
    ca: 'Carregant...',
    fr: 'Chargement...',
    en: 'Loading...',
  },
  'galia.message.noResults': {
    es: 'No se encontraron resultados',
    ca: 'No s\'han trobat resultats',
    fr: 'Aucun résultat trouvé',
    en: 'No results found',
  },
  'galia.message.success': {
    es: 'Operación completada con éxito',
    ca: 'Operació completada amb èxit',
    fr: 'Opération réussie',
    en: 'Operation completed successfully',
  },
  'galia.message.error': {
    es: 'Ha ocurrido un error',
    ca: 'S\'ha produït un error',
    fr: 'Une erreur s\'est produite',
    en: 'An error occurred',
  },

  // === CONVOCATORIAS ===
  'galia.calls.active': {
    es: 'Convocatorias Activas',
    ca: 'Convocatòries Actives',
    fr: 'Appels Actifs',
    en: 'Active Calls',
  },
  'galia.calls.deadline': {
    es: 'Fecha límite',
    ca: 'Data límit',
    fr: 'Date limite',
    en: 'Deadline',
  },
  'galia.calls.budget': {
    es: 'Presupuesto',
    ca: 'Pressupost',
    fr: 'Budget',
    en: 'Budget',
  },
  'galia.calls.intensity': {
    es: 'Intensidad de ayuda',
    ca: 'Intensitat d\'ajuda',
    fr: 'Intensité de l\'aide',
    en: 'Aid intensity',
  },

  // === BENEFICIARIOS ===
  'galia.beneficiary.type.empresa': {
    es: 'Empresa',
    ca: 'Empresa',
    fr: 'Entreprise',
    en: 'Company',
  },
  'galia.beneficiary.type.ayuntamiento': {
    es: 'Ayuntamiento',
    ca: 'Ajuntament',
    fr: 'Mairie',
    en: 'Municipality',
  },
  'galia.beneficiary.type.asociacion': {
    es: 'Asociación',
    ca: 'Associació',
    fr: 'Association',
    en: 'Association',
  },
  'galia.beneficiary.type.autonomo': {
    es: 'Autónomo',
    ca: 'Autònom',
    fr: 'Indépendant',
    en: 'Self-employed',
  },
};

// === HOOK ===
export function useGaliaTranslations() {
  const { language } = useLanguage();

  /**
   * Traduce una clave específica de GALIA
   */
  const t = useCallback((key: string, fallback?: string): string => {
    const translations = GALIA_TRANSLATIONS[key];
    if (!translations) {
      console.warn(`[useGaliaTranslations] Missing translation key: ${key}`);
      return fallback || key;
    }

    // Buscar en el idioma actual, luego es, luego en
    return translations[language] || translations['es'] || translations['en'] || fallback || key;
  }, [language]);

  /**
   * Obtiene todas las traducciones de un prefijo
   */
  const getGroup = useCallback((prefix: string): Record<string, string> => {
    const result: Record<string, string> = {};
    
    Object.keys(GALIA_TRANSLATIONS).forEach(key => {
      if (key.startsWith(prefix)) {
        const shortKey = key.replace(`${prefix}.`, '');
        result[shortKey] = t(key);
      }
    });

    return result;
  }, [t]);

  /**
   * Idioma actual
   */
  const currentLanguage = useMemo(() => language, [language]);

  /**
   * Idiomas soportados por GALIA
   */
  const supportedLanguages = useMemo(() => ['es', 'ca', 'fr', 'en'], []);

  /**
   * Verifica si una clave existe
   */
  const hasTranslation = useCallback((key: string): boolean => {
    return key in GALIA_TRANSLATIONS;
  }, []);

  return {
    t,
    getGroup,
    currentLanguage,
    supportedLanguages,
    hasTranslation,
  };
}

export default useGaliaTranslations;

// Export translations for static access
export { GALIA_TRANSLATIONS };
