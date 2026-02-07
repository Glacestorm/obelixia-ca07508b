/**
 * useHybridAIIntegration - Hook de integración del Sistema IA Híbrida
 * Conecta el sistema de IA híbrida con los módulos CRM/ERP existentes
 */

import { useCallback, useMemo } from 'react';
import { useHybridAI, HybridAIContext } from './useHybridAI';
import { useDataPrivacyGateway } from './useDataPrivacyGateway';
import { useAICredits } from './useAICredits';

// Tipos de entidades soportadas
export type EntityType = 
  | 'contact' 
  | 'company' 
  | 'deal' 
  | 'task' 
  | 'email' 
  | 'invoice'
  | 'contract'
  | 'employee'
  | 'product'
  | 'order'
  | 'support_ticket'
  | 'document'
  | 'custom';

// Tipos de análisis disponibles
export type AnalysisType =
  | 'sentiment'
  | 'summary'
  | 'recommendations'
  | 'risk_assessment'
  | 'churn_prediction'
  | 'revenue_forecast'
  | 'lead_scoring'
  | 'email_generation'
  | 'contract_analysis'
  | 'compliance_check'
  | 'custom';

export interface AnalysisRequest {
  entityType: EntityType;
  entityId: string;
  analysisType: AnalysisType;
  data: Record<string, unknown>;
  additionalContext?: string;
  language?: 'es' | 'en' | 'ca' | 'fr';
}

export interface AnalysisResult {
  success: boolean;
  analysisType: AnalysisType;
  result: Record<string, unknown>;
  confidence: number;
  provider: string;
  model: string;
  processingTimeMs: number;
  tokensUsed: number;
  cost: number;
  wasAnonymized: boolean;
  timestamp: string;
}

export interface BatchAnalysisResult {
  totalItems: number;
  successful: number;
  failed: number;
  results: AnalysisResult[];
  totalCost: number;
  totalTokens: number;
}

// Prompts especializados por tipo de análisis
const ANALYSIS_PROMPTS: Record<AnalysisType, { system: string; userTemplate: string }> = {
  sentiment: {
    system: `Eres un experto en análisis de sentimiento para comunicaciones empresariales.
Analiza el sentimiento del texto proporcionado y responde en JSON:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "score": -1 a 1,
  "emotions": ["emoción1", "emoción2"],
  "keyPhrases": ["frase clave"],
  "urgency": "low" | "medium" | "high",
  "actionRequired": boolean,
  "summary": "resumen breve"
}`,
    userTemplate: 'Analiza el sentimiento del siguiente contenido:\n\n{content}'
  },
  summary: {
    system: `Eres un experto en síntesis de información empresarial.
Resume el contenido de forma concisa y estructurada en JSON:
{
  "executiveSummary": "resumen ejecutivo en 2-3 frases",
  "keyPoints": ["punto clave 1", "punto clave 2"],
  "entities": { "personas": [], "empresas": [], "fechas": [], "montos": [] },
  "nextSteps": ["acción sugerida"],
  "priority": "low" | "medium" | "high"
}`,
    userTemplate: 'Resume el siguiente contenido empresarial:\n\n{content}'
  },
  recommendations: {
    system: `Eres un consultor estratégico de CRM/ERP.
Genera recomendaciones accionables basadas en el contexto en JSON:
{
  "recommendations": [
    { "action": "descripción", "priority": "high|medium|low", "impact": "alto|medio|bajo", "effort": "alto|medio|bajo" }
  ],
  "quickWins": ["acción rápida"],
  "strategicGoals": ["objetivo a largo plazo"],
  "risks": ["riesgo a mitigar"]
}`,
    userTemplate: 'Genera recomendaciones para:\n\nEntidad: {entityType}\nDatos: {content}'
  },
  risk_assessment: {
    system: `Eres un analista de riesgos empresariales.
Evalúa los riesgos del contexto proporcionado en JSON:
{
  "overallRisk": "low" | "medium" | "high" | "critical",
  "riskScore": 0-100,
  "risks": [
    { "category": "categoría", "description": "descripción", "probability": 0-1, "impact": "low|medium|high", "mitigation": "acción" }
  ],
  "redFlags": ["señal de alerta"],
  "recommendations": ["recomendación"]
}`,
    userTemplate: 'Evalúa los riesgos de:\n\nTipo: {entityType}\nDatos: {content}'
  },
  churn_prediction: {
    system: `Eres un experto en predicción de abandono de clientes.
Analiza la probabilidad de churn en JSON:
{
  "churnProbability": 0-1,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "churnIndicators": [
    { "indicator": "indicador", "weight": 0-1, "trend": "improving|stable|declining" }
  ],
  "retentionActions": ["acción de retención"],
  "timeToChurn": "días estimados",
  "lifetimeValue": "valor estimado"
}`,
    userTemplate: 'Predice el riesgo de abandono para:\n\nCliente: {content}'
  },
  revenue_forecast: {
    system: `Eres un analista financiero experto en previsiones.
Genera pronóstico de ingresos en JSON:
{
  "forecastPeriod": "período",
  "predictedRevenue": número,
  "confidenceInterval": { "low": número, "high": número },
  "growthRate": porcentaje,
  "factors": [
    { "factor": "descripción", "impact": "positive|negative", "weight": 0-1 }
  ],
  "scenarios": { "optimistic": número, "realistic": número, "pessimistic": número }
}`,
    userTemplate: 'Genera pronóstico de ingresos basado en:\n\n{content}'
  },
  lead_scoring: {
    system: `Eres un experto en calificación de leads B2B.
Evalúa y puntúa el lead en JSON:
{
  "score": 0-100,
  "grade": "A" | "B" | "C" | "D" | "F",
  "buyerReadiness": "ready" | "nurturing" | "cold",
  "fitScore": 0-100,
  "engagementScore": 0-100,
  "signals": [
    { "signal": "descripción", "weight": 0-1, "type": "positive|negative" }
  ],
  "nextBestAction": "acción recomendada",
  "idealTimeline": "tiempo estimado"
}`,
    userTemplate: 'Evalúa este lead:\n\n{content}'
  },
  email_generation: {
    system: `Eres un experto en comunicación empresarial.
Genera un email profesional en JSON:
{
  "subject": "asunto del email",
  "body": "cuerpo del email en formato texto",
  "tone": "formal|semiformal|friendly",
  "callToAction": "acción esperada",
  "followUpDate": "fecha sugerida",
  "alternativeVersions": [{ "tone": "tono", "body": "versión alternativa" }]
}`,
    userTemplate: 'Genera un email para:\n\nContexto: {content}\nObjetivo: {objective}'
  },
  contract_analysis: {
    system: `Eres un abogado corporativo experto en análisis de contratos.
Analiza el contrato en JSON:
{
  "contractType": "tipo de contrato",
  "parties": ["parte 1", "parte 2"],
  "keyTerms": [{ "term": "término", "value": "valor", "risk": "low|medium|high" }],
  "obligations": ["obligación"],
  "risks": [{ "clause": "cláusula", "risk": "descripción", "severity": "low|medium|high" }],
  "missingClauses": ["cláusula faltante"],
  "recommendations": ["recomendación"],
  "expirationDate": "fecha"
}`,
    userTemplate: 'Analiza este contrato:\n\n{content}'
  },
  compliance_check: {
    system: `Eres un experto en cumplimiento normativo (GDPR, SOX, ISO 27001).
Evalúa el cumplimiento en JSON:
{
  "overallCompliance": "compliant" | "partial" | "non-compliant",
  "complianceScore": 0-100,
  "frameworks": [{ "name": "marco", "status": "compliant|partial|non-compliant", "gaps": [] }],
  "violations": [{ "regulation": "norma", "issue": "problema", "severity": "low|medium|high|critical" }],
  "remediationSteps": ["paso de remediación"],
  "priority": "immediate|short-term|long-term"
}`,
    userTemplate: 'Verifica el cumplimiento normativo de:\n\n{content}'
  },
  custom: {
    system: `Eres un asistente de IA empresarial avanzado.
Responde de forma estructurada en JSON según el contexto proporcionado.`,
    userTemplate: '{content}'
  }
};

// Pricing por proveedor (por 1K tokens)
const PROVIDER_PRICING: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  openai: { inputPer1k: 0.01, outputPer1k: 0.03 },
  anthropic: { inputPer1k: 0.003, outputPer1k: 0.015 },
  google: { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  mistral: { inputPer1k: 0.0002, outputPer1k: 0.008 },
  deepseek: { inputPer1k: 0.0001, outputPer1k: 0.0002 },
  lovable: { inputPer1k: 0, outputPer1k: 0 },
  local: { inputPer1k: 0, outputPer1k: 0 },
};

export function useHybridAIIntegration() {
  const { 
    sendMessage, 
    isLoading, 
    currentProvider, 
    lastDecision 
  } = useHybridAI();
  
  const { 
    classifyData, 
    sanitizeForExternal 
  } = useDataPrivacyGateway();
  
  const { 
    balances, 
    estimateCost 
  } = useAICredits();

  /**
   * Ejecuta un análisis específico sobre una entidad
   */
  const analyzeEntity = useCallback(async (
    request: AnalysisRequest
  ): Promise<AnalysisResult> => {
    const startTime = Date.now();
    const prompts = ANALYSIS_PROMPTS[request.analysisType] || ANALYSIS_PROMPTS.custom;
    
    // Preparar contenido
    const contentString = typeof request.data === 'string' 
      ? request.data 
      : JSON.stringify(request.data, null, 2);
    
    // Clasificar sensibilidad
    const classification = classifyData(request.data);
    let processedContent = contentString;
    let wasAnonymized = false;
    
    // Anonimizar si es necesario
    if (classification.level === 'confidential' || classification.level === 'restricted') {
      const sanitized = sanitizeForExternal(request.data, { anonymize: true });
      processedContent = JSON.stringify(sanitized.anonymizedData, null, 2);
      wasAnonymized = sanitized.fieldsAnonymized.length > 0;
    }
    
    // Construir prompt
    const userPrompt = prompts.userTemplate
      .replace('{content}', processedContent)
      .replace('{entityType}', request.entityType)
      .replace('{objective}', request.additionalContext || '');
    
    // Contexto para el router
    const context: HybridAIContext = {
      entityType: request.entityType,
      entityId: request.entityId,
      entityData: request.data,
    };
    
    try {
      // Enviar con sistema prompt
      const systemData = { systemPrompt: prompts.system };
      const response = await sendMessage(userPrompt, systemData);
      
      if (!response) {
        throw new Error('No response from AI');
      }
      
      // Parsear resultado JSON
      let parsedResult: Record<string, unknown> = {};
      try {
        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        parsedResult = { rawResponse: response.content };
      }
      
      const processingTimeMs = Date.now() - startTime;
      
      return {
        success: true,
        analysisType: request.analysisType,
        result: parsedResult,
        confidence: 0.85,
        provider: currentProvider?.name || 'unknown',
        model: lastDecision?.provider?.name || 'unknown',
        processingTimeMs,
        tokensUsed: response.tokens ? response.tokens.prompt + response.tokens.completion : 0,
        cost: response.cost || 0,
        wasAnonymized,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        analysisType: request.analysisType,
        result: { error: error instanceof Error ? error.message : 'Unknown error' },
        confidence: 0,
        provider: 'none',
        model: 'none',
        processingTimeMs: Date.now() - startTime,
        tokensUsed: 0,
        cost: 0,
        wasAnonymized,
        timestamp: new Date().toISOString()
      };
    }
  }, [sendMessage, classifyData, sanitizeForExternal, currentProvider, lastDecision]);

  /**
   * Ejecuta análisis en lote sobre múltiples entidades
   */
  const batchAnalyze = useCallback(async (
    requests: AnalysisRequest[],
    options?: { maxConcurrent?: number; stopOnError?: boolean }
  ): Promise<BatchAnalysisResult> => {
    const { maxConcurrent = 3, stopOnError = false } = options || {};
    const results: AnalysisResult[] = [];
    let failed = 0;
    
    // Procesar en lotes
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(req => analyzeEntity(req))
      );
      
      for (const result of batchResults) {
        results.push(result);
        if (!result.success) {
          failed++;
          if (stopOnError) break;
        }
      }
      
      if (stopOnError && failed > 0) break;
    }
    
    return {
      totalItems: requests.length,
      successful: results.filter(r => r.success).length,
      failed,
      results,
      totalCost: results.reduce((sum, r) => sum + r.cost, 0),
      totalTokens: results.reduce((sum, r) => sum + r.tokensUsed, 0)
    };
  }, [analyzeEntity]);

  /**
   * Análisis rápido de sentimiento
   */
  const quickSentiment = useCallback(async (
    text: string,
    entityType: EntityType = 'custom',
    entityId?: string
  ) => {
    return analyzeEntity({
      entityType,
      entityId: entityId || crypto.randomUUID(),
      analysisType: 'sentiment',
      data: { text }
    });
  }, [analyzeEntity]);

  /**
   * Generación rápida de email
   */
  const generateEmail = useCallback(async (
    context: string,
    objective: string,
    entityType: EntityType = 'contact',
    entityId?: string
  ) => {
    return analyzeEntity({
      entityType,
      entityId: entityId || crypto.randomUUID(),
      analysisType: 'email_generation',
      data: { context },
      additionalContext: objective
    });
  }, [analyzeEntity]);

  /**
   * Scoring rápido de lead
   */
  const scoreLead = useCallback(async (
    leadData: Record<string, unknown>,
    leadId: string
  ) => {
    return analyzeEntity({
      entityType: 'contact',
      entityId: leadId,
      analysisType: 'lead_scoring',
      data: leadData
    });
  }, [analyzeEntity]);

  /**
   * Predicción de churn
   */
  const predictChurn = useCallback(async (
    customerData: Record<string, unknown>,
    customerId: string
  ) => {
    return analyzeEntity({
      entityType: 'company',
      entityId: customerId,
      analysisType: 'churn_prediction',
      data: customerData
    });
  }, [analyzeEntity]);

  /**
   * Análisis de contrato
   */
  const analyzeContract = useCallback(async (
    contractText: string,
    contractId: string
  ) => {
    return analyzeEntity({
      entityType: 'contract',
      entityId: contractId,
      analysisType: 'contract_analysis',
      data: { contractText }
    });
  }, [analyzeEntity]);

  /**
   * Verificación de cumplimiento
   */
  const checkCompliance = useCallback(async (
    data: Record<string, unknown>,
    entityType: EntityType,
    entityId: string
  ) => {
    return analyzeEntity({
      entityType,
      entityId,
      analysisType: 'compliance_check',
      data
    });
  }, [analyzeEntity]);

  /**
   * Estima el costo de un análisis antes de ejecutarlo
   */
  const estimateAnalysisCost = useCallback((
    analysisType: AnalysisType,
    dataSize: number,
    providerName: string = 'openai'
  ) => {
    // Estimación basada en tokens promedio por tipo de análisis
    const tokenEstimates: Record<AnalysisType, { input: number; output: number }> = {
      sentiment: { input: 500, output: 200 },
      summary: { input: 1000, output: 300 },
      recommendations: { input: 800, output: 500 },
      risk_assessment: { input: 600, output: 400 },
      churn_prediction: { input: 700, output: 300 },
      revenue_forecast: { input: 500, output: 400 },
      lead_scoring: { input: 600, output: 300 },
      email_generation: { input: 400, output: 600 },
      contract_analysis: { input: 2000, output: 800 },
      compliance_check: { input: 1000, output: 600 },
      custom: { input: 500, output: 300 }
    };
    
    const tokens = tokenEstimates[analysisType] || tokenEstimates.custom;
    const scaleFactor = Math.max(1, dataSize / 1000);
    const estimatedInputTokens = Math.round(tokens.input * scaleFactor);
    const pricing = PROVIDER_PRICING[providerName] || PROVIDER_PRICING.openai;
    
    const promptForEstimate = 'x'.repeat(estimatedInputTokens * 3);
    const costEstimate = estimateCost(promptForEstimate, 'gpt-4o', pricing);
    
    return {
      estimatedInputTokens,
      estimatedOutputTokens: tokens.output,
      estimatedCost: costEstimate.estimatedCost
    };
  }, [estimateCost]);

  /**
   * Verifica si hay créditos suficientes para un análisis
   */
  const canAffordAnalysis = useCallback((
    analysisType: AnalysisType,
    dataSize: number = 1000
  ): boolean => {
    const estimate = estimateAnalysisCost(analysisType, dataSize);
    const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
    return totalBalance >= estimate.estimatedCost;
  }, [estimateAnalysisCost, balances]);

  // Tipos de análisis disponibles
  const availableAnalysisTypes = useMemo(() => 
    Object.keys(ANALYSIS_PROMPTS) as AnalysisType[], 
  []);

  return {
    // Estado
    isLoading,
    currentProvider,
    lastDecision,
    
    // Análisis genérico
    analyzeEntity,
    batchAnalyze,
    
    // Análisis específicos
    quickSentiment,
    generateEmail,
    scoreLead,
    predictChurn,
    analyzeContract,
    checkCompliance,
    
    // Utilidades
    estimateAnalysisCost,
    canAffordAnalysis,
    availableAnalysisTypes,
  };
}

export default useHybridAIIntegration;
