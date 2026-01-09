import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type VerticalType = 'healthcare' | 'agriculture' | 'industrial' | 'services';
export type AgentMode = 'supervised' | 'autonomous';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'failed';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'requires_approval';

export interface VerticalAgentSession {
  id: string;
  verticalType: VerticalType;
  agentMode: AgentMode;
  status: SessionStatus;
  context: Record<string, unknown>;
  conversationHistory: AgentMessage[];
  decisionsLog: AgentDecision[];
  tasksExecuted: number;
  tasksPending: number;
  confidenceThreshold: number;
  startedAt: string;
  endedAt?: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  action?: AgentAction;
  recommendations?: AgentRecommendation[];
  alerts?: AgentAlert[];
}

export interface AgentAction {
  type: string;
  params: Record<string, unknown>;
  requiresApproval: boolean;
  confidence: number;
  status?: 'pending' | 'approved' | 'rejected' | 'executed';
}

export interface AgentRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedImpact?: string;
  actionRequired?: string;
}

export interface AgentAlert {
  level: 'critical' | 'warning' | 'info';
  message: string;
}

export interface AgentDecision {
  id: string;
  timestamp: string;
  action: string;
  reasoning: string;
  confidence: number;
  outcome?: 'success' | 'failure' | 'pending';
  feedback?: 'correct' | 'incorrect';
}

export interface VerticalAgentTask {
  id: string;
  sessionId: string;
  verticalType: VerticalType;
  taskType: string;
  taskDescription?: string;
  inputParams: Record<string, unknown>;
  outputResult?: Record<string, unknown>;
  status: TaskStatus;
  priority: number;
  confidenceScore?: number;
  executionTimeMs?: number;
  errorMessage?: string;
  requiresHumanApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  completedAt?: string;
}

export interface VerticalAgentConfig {
  verticalType: VerticalType;
  mode?: AgentMode;
  confidenceThreshold?: number;
  context?: Record<string, unknown>;
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export function useVerticalAgent() {
  const { user } = useAuth();
  const [session, setSession] = useState<VerticalAgentSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<VerticalAgentTask[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<VerticalAgentTask[]>([]);
  const sessionRef = useRef<string | null>(null);

  // Start agent session
  const startSession = useCallback(async (config: VerticalAgentConfig) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call edge function to start session
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'vertical-agent-orchestrator',
        {
          body: {
            action: 'start_session',
            verticalType: config.verticalType,
            mode: config.mode || 'supervised',
            confidenceThreshold: config.confidenceThreshold || 0.75,
            context: config.context || {},
          },
        }
      );

      if (fnError) throw fnError;

      // Create session in database
      const { data: sessionData, error: dbError } = await supabase
        .from('vertical_agent_sessions')
        .insert([{
          vertical_type: config.verticalType,
          agent_mode: config.mode || 'supervised',
          status: 'active',
          context: (config.context || {}) as Json,
          conversation_history: [] as Json,
          decisions_log: [] as Json,
          confidence_threshold: config.confidenceThreshold || 0.75,
          user_id: user.id,
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      const newSession: VerticalAgentSession = {
        id: sessionData.id,
        verticalType: config.verticalType,
        agentMode: config.mode || 'supervised',
        status: 'active',
        context: config.context || {},
        conversationHistory: fnData.data?.greeting ? [{
          id: crypto.randomUUID(),
          role: 'agent',
          content: fnData.data.greeting,
          timestamp: new Date().toISOString(),
        }] : [],
        decisionsLog: [],
        tasksExecuted: 0,
        tasksPending: 0,
        confidenceThreshold: config.confidenceThreshold || 0.75,
        startedAt: sessionData.started_at,
      };

      setSession(newSession);
      sessionRef.current = sessionData.id;
      toast.success(`Agente ${config.verticalType} iniciado`);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // End agent session
  const endSession = useCallback(async () => {
    if (!session?.id) return;

    try {
      await supabase
        .from('vertical_agent_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      setSession(null);
      sessionRef.current = null;
      setTasks([]);
      setPendingApprovals([]);
      toast.success('Sesión finalizada');
    } catch (err) {
      console.error('Error ending session:', err);
    }
  }, [session?.id]);

  // Send message to agent
  const sendMessage = useCallback(async (message: string): Promise<AgentMessage | null> => {
    if (!session) {
      toast.error('No hay sesión activa');
      return null;
    }

    setIsTyping(true);

    try {
      // Add user message to history
      const userMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      setSession(prev => prev ? {
        ...prev,
        conversationHistory: [...prev.conversationHistory, userMessage],
      } : null);

      // Call edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'vertical-agent-orchestrator',
        {
          body: {
            action: 'chat',
            verticalType: session.verticalType,
            sessionId: session.id,
            mode: session.agentMode,
            message,
            context: session.context,
          },
        }
      );

      if (fnError) throw fnError;

      const responseData = fnData.data || {};
      const agentMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: responseData.response || 'Sin respuesta',
        timestamp: new Date().toISOString(),
        action: responseData.action,
        recommendations: responseData.recommendations,
        alerts: responseData.alerts,
      };

      // Update session with new messages
      const updatedHistory = [...session.conversationHistory, userMessage, agentMessage];
      
      setSession(prev => prev ? {
        ...prev,
        conversationHistory: updatedHistory,
      } : null);

      // Persist to database
      await supabase
        .from('vertical_agent_sessions')
        .update({
          conversation_history: updatedHistory as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      return agentMessage;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar mensaje';
      toast.error(message);
      return null;
    } finally {
      setIsTyping(false);
    }
  }, [session]);

  // Execute specific task
  const executeTask = useCallback(async (
    taskType: string,
    params: Record<string, unknown>
  ): Promise<VerticalAgentTask | null> => {
    if (!session || !user?.id) {
      toast.error('No hay sesión activa');
      return null;
    }

    try {
      // Create task in database
      const { data: taskData, error: taskError } = await supabase
        .from('vertical_agent_tasks')
        .insert([{
          session_id: session.id,
          vertical_type: session.verticalType,
          task_type: taskType,
          input_params: params as Json,
          status: session.agentMode === 'supervised' ? 'requires_approval' : 'running',
          requires_human_approval: session.agentMode === 'supervised',
        }])
        .select()
        .single();

      if (taskError) throw taskError;

      const newTask: VerticalAgentTask = {
        id: taskData.id,
        sessionId: taskData.session_id,
        verticalType: taskData.vertical_type as VerticalType,
        taskType: taskData.task_type,
        inputParams: taskData.input_params as Record<string, unknown>,
        status: taskData.status as TaskStatus,
        priority: taskData.priority || 5,
        requiresHumanApproval: taskData.requires_human_approval || false,
        createdAt: taskData.created_at,
      };

      setTasks(prev => [...prev, newTask]);

      if (session.agentMode === 'supervised') {
        setPendingApprovals(prev => [...prev, newTask]);
        toast.info('Tarea pendiente de aprobación');
        return newTask;
      }

      // Execute in autonomous mode
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'vertical-agent-orchestrator',
        {
          body: {
            action: 'execute_task',
            verticalType: session.verticalType,
            taskType,
            taskParams: params,
            context: session.context,
            mode: session.agentMode,
          },
        }
      );

      if (fnError) throw fnError;

      // Update task with result
      await supabase
        .from('vertical_agent_tasks')
        .update({
          status: 'completed',
          output_result: fnData.data,
          confidence_score: fnData.data?.confidence,
          completed_at: new Date().toISOString(),
        })
        .eq('id', newTask.id);

      const completedTask = {
        ...newTask,
        status: 'completed' as TaskStatus,
        outputResult: fnData.data,
        confidenceScore: fnData.data?.confidence,
      };

      setTasks(prev => prev.map(t => t.id === newTask.id ? completedTask : t));
      toast.success('Tarea ejecutada');
      return completedTask;

    } catch (err) {
      console.error('Error executing task:', err);
      toast.error('Error al ejecutar tarea');
      return null;
    }
  }, [session, user?.id]);

  // Approve pending task
  const approveTask = useCallback(async (taskId: string) => {
    if (!user?.id || !session) return;

    try {
      const task = pendingApprovals.find(t => t.id === taskId);
      if (!task) return;

      // Update task status
      await supabase
        .from('vertical_agent_tasks')
        .update({
          status: 'running',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      setPendingApprovals(prev => prev.filter(t => t.id !== taskId));

      // Execute task
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'vertical-agent-orchestrator',
        {
          body: {
            action: 'execute_task',
            verticalType: session.verticalType,
            taskType: task.taskType,
            taskParams: task.inputParams,
            context: session.context,
            mode: 'autonomous',
          },
        }
      );

      if (fnError) throw fnError;

      await supabase
        .from('vertical_agent_tasks')
        .update({
          status: 'completed',
          output_result: fnData.data,
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'completed' as TaskStatus, outputResult: fnData.data } : t
      ));

      toast.success('Tarea aprobada y ejecutada');

    } catch (err) {
      console.error('Error approving task:', err);
      toast.error('Error al aprobar tarea');
    }
  }, [user?.id, session, pendingApprovals]);

  // Reject pending task
  const rejectTask = useCallback(async (taskId: string, reason: string) => {
    try {
      await supabase
        .from('vertical_agent_tasks')
        .update({
          status: 'cancelled',
          error_message: reason,
        })
        .eq('id', taskId);

      setPendingApprovals(prev => prev.filter(t => t.id !== taskId));
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: 'cancelled' as TaskStatus, errorMessage: reason } : t
      ));

      toast.info('Tarea rechazada');
    } catch (err) {
      console.error('Error rejecting task:', err);
    }
  }, []);

  // Switch agent mode
  const switchMode = useCallback(async (mode: AgentMode) => {
    if (!session) return;

    try {
      await supabase
        .from('vertical_agent_sessions')
        .update({ agent_mode: mode })
        .eq('id', session.id);

      setSession(prev => prev ? { ...prev, agentMode: mode } : null);
      toast.success(`Modo cambiado a ${mode === 'autonomous' ? 'Autónomo' : 'Supervisado'}`);
    } catch (err) {
      console.error('Error switching mode:', err);
    }
  }, [session]);

  // Get recommendations
  const getRecommendations = useCallback(async (): Promise<AgentRecommendation[]> => {
    if (!session) return [];

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'vertical-agent-orchestrator',
        {
          body: {
            action: 'get_recommendations',
            verticalType: session.verticalType,
            context: session.context,
          },
        }
      );

      if (fnError) throw fnError;
      return fnData.data?.recommendations || [];
    } catch (err) {
      console.error('Error getting recommendations:', err);
      return [];
    }
  }, [session]);

  // Get decision history
  const getDecisionHistory = useCallback((): AgentDecision[] => {
    return session?.decisionsLog || [];
  }, [session]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        // Mark session as paused if component unmounts
        supabase
          .from('vertical_agent_sessions')
          .update({ status: 'paused' })
          .eq('id', sessionRef.current)
          .then(() => {});
      }
    };
  }, []);

  return {
    // State
    session,
    isLoading,
    isTyping,
    error,
    tasks,
    pendingApprovals,
    
    // Actions
    startSession,
    endSession,
    sendMessage,
    executeTask,
    approveTask,
    rejectTask,
    switchMode,
    
    // Helpers
    getRecommendations,
    getDecisionHistory,
  };
}

export default useVerticalAgent;
