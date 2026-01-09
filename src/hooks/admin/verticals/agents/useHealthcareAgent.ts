import { useCallback } from 'react';
import { useVerticalAgent, VerticalAgentConfig } from './useVerticalAgent';
import type { TelemedicineSession, ElectronicPrescription, Medication, DiagnosisAssistResult, DrugInteraction } from '../useHealthcarePro';

export interface TeleconsultParams {
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  duration: number;
  reason: string;
  symptoms?: string[];
}

export interface SymptomAnalysisParams {
  symptoms: string[];
  patientAge?: number;
  patientGender?: string;
  medicalHistory?: string[];
}

export interface MedicationCheckParams {
  medications: string[];
  patientId?: string;
}

export interface PatientMonitorParams {
  patientId: string;
  vitals: ('heart_rate' | 'blood_pressure' | 'oxygen' | 'temperature' | 'glucose')[];
  alertThresholds?: Record<string, { min: number; max: number }>;
}

export interface PrescriptionParams {
  patientId: string;
  medications: Medication[];
  diagnosis: string;
  instructions: string;
}

export function useHealthcareAgent() {
  const agent = useVerticalAgent();

  // Start healthcare-specific session
  const startHealthcareSession = useCallback(async (config?: Partial<VerticalAgentConfig>) => {
    await agent.startSession({
      verticalType: 'healthcare',
      mode: config?.mode || 'supervised',
      confidenceThreshold: config?.confidenceThreshold || 0.85, // Higher for healthcare
      context: {
        ...config?.context,
        specialization: 'healthcare',
        complianceMode: 'HIPAA',
      },
    });
  }, [agent.startSession]);

  // Schedule teleconsultation
  const scheduleTeleconsult = useCallback(async (
    params: TeleconsultParams
  ): Promise<TelemedicineSession | null> => {
    const result = await agent.executeTask('schedule_teleconsult', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as TelemedicineSession;
    }
    return null;
  }, [agent.executeTask]);

  // Analyze symptoms
  const analyzeSymptoms = useCallback(async (
    params: SymptomAnalysisParams
  ): Promise<DiagnosisAssistResult | null> => {
    const result = await agent.executeTask('analyze_symptoms', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as DiagnosisAssistResult;
    }
    return null;
  }, [agent.executeTask]);

  // Check medication interactions
  const checkMedications = useCallback(async (
    params: MedicationCheckParams
  ): Promise<DrugInteraction[]> => {
    const result = await agent.executeTask('check_medications', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as DrugInteraction[];
    }
    return [];
  }, [agent.executeTask]);

  // Monitor patient vitals
  const monitorPatient = useCallback(async (
    params: PatientMonitorParams
  ): Promise<boolean> => {
    const result = await agent.executeTask('monitor_patient', params as unknown as Record<string, unknown>);
    return !!result?.outputResult?.success;
  }, [agent.executeTask]);

  // Generate prescription
  const generatePrescription = useCallback(async (
    params: PrescriptionParams
  ): Promise<ElectronicPrescription | null> => {
    const result = await agent.executeTask('generate_prescription', params as unknown as Record<string, unknown>);
    if (result?.outputResult?.success) {
      return result.outputResult.result as ElectronicPrescription;
    }
    return null;
  }, [agent.executeTask]);

  return {
    ...agent,
    // Override start session
    startSession: startHealthcareSession,
    // Healthcare-specific actions
    scheduleTeleconsult,
    analyzeSymptoms,
    checkMedications,
    monitorPatient,
    generatePrescription,
  };
}

export default useHealthcareAgent;
