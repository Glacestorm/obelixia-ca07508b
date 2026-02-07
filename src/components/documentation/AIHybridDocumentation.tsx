/**
 * AIHybridDocumentation - Documentación técnica del Sistema IA Híbrida Universal
 * Incluye arquitectura, flujos de datos, configuración y ejemplos de uso
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  Shield,
  Zap,
  Database,
  Cloud,
  Server,
  Lock,
  Workflow,
  Code,
  FileText,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Cpu,
  Globe,
  Key,
} from 'lucide-react';

export function AIHybridDocumentation() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Sistema IA Híbrida Universal</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Documentación técnica completa del sistema de inteligencia artificial híbrida
          que combina proveedores locales (Ollama) y externos (OpenAI, Google, Anthropic, etc.)
          con gestión avanzada de privacidad y enrutamiento inteligente.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Badge variant="outline">v1.0.0</Badge>
          <Badge variant="secondary">Enterprise Ready</Badge>
          <Badge className="bg-green-500/10 text-green-600">Production</Badge>
        </div>
      </div>

      <Tabs defaultValue="architecture" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="architecture">Arquitectura</TabsTrigger>
          <TabsTrigger value="privacy">Privacidad</TabsTrigger>
          <TabsTrigger value="routing">Enrutamiento</TabsTrigger>
          <TabsTrigger value="providers">Proveedores</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="examples">Ejemplos</TabsTrigger>
        </TabsList>

        {/* Arquitectura */}
        <TabsContent value="architecture" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Arquitectura del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Diagrama de flujo */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-4">Flujo de Procesamiento</h4>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <div className="p-3 rounded-lg bg-blue-500/10 text-blue-600 text-sm font-medium">
                    Request
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="p-3 rounded-lg bg-purple-500/10 text-purple-600 text-sm font-medium">
                    Privacy Gateway
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="p-3 rounded-lg bg-orange-500/10 text-orange-600 text-sm font-medium">
                    Router
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm font-medium">
                    Provider
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="p-3 rounded-lg bg-cyan-500/10 text-cyan-600 text-sm font-medium">
                    Response
                  </div>
                </div>
              </div>

              {/* Componentes principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    <h4 className="font-medium">Data Privacy Gateway</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Clasifica datos en 4 niveles (Public, Internal, Confidential, Restricted)
                    y aplica anonimización automática antes de enviar a proveedores externos.
                  </p>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                    <h4 className="font-medium">Intelligent Router</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Selecciona automáticamente el mejor proveedor basándose en sensibilidad,
                    disponibilidad, créditos y preferencias del usuario.
                  </p>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <h4 className="font-medium">Credits System</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gestión granular de créditos por proveedor con alertas automáticas
                    y fallback inteligente cuando se agotan los créditos.
                  </p>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium">Provider Manager</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Configuración y monitoreo de proveedores locales (Ollama) y externos
                    con pruebas de conexión y métricas de rendimiento.
                  </p>
                </div>
              </div>

              {/* Hooks disponibles */}
              <div className="space-y-2">
                <h4 className="font-medium">Hooks Disponibles</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { name: 'useHybridAI', desc: 'Hook principal' },
                    { name: 'useAIProviders', desc: 'Gestión proveedores' },
                    { name: 'useDataPrivacyGateway', desc: 'Clasificación datos' },
                    { name: 'useAICredits', desc: 'Sistema créditos' },
                  ].map((hook) => (
                    <div key={hook.name} className="p-2 bg-muted rounded text-sm">
                      <code className="text-primary">{hook.name}</code>
                      <p className="text-xs text-muted-foreground">{hook.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacidad */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Sistema de Privacidad de Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Niveles de clasificación */}
              <div className="space-y-3">
                <h4 className="font-medium">Niveles de Clasificación</h4>
                <div className="space-y-2">
                  {[
                    {
                      level: 'public',
                      color: 'bg-green-500',
                      desc: 'Datos públicos sin restricciones',
                      example: 'Información general, FAQs',
                      action: 'Cualquier proveedor',
                    },
                    {
                      level: 'internal',
                      color: 'bg-blue-500',
                      desc: 'Uso interno de la organización',
                      example: 'Procedimientos, políticas internas',
                      action: 'Proveedores confiables',
                    },
                    {
                      level: 'confidential',
                      color: 'bg-orange-500',
                      desc: 'Requiere anonimización para uso externo',
                      example: 'Datos de clientes, transacciones',
                      action: 'Anonimizar antes de enviar',
                    },
                    {
                      level: 'restricted',
                      color: 'bg-red-500',
                      desc: 'Solo procesamiento local',
                      example: 'Contraseñas, tokens, datos bancarios',
                      action: 'Solo Ollama local',
                    },
                  ].map((item) => (
                    <div key={item.level} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge className={`${item.color} text-white`}>{item.level}</Badge>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{item.desc}</p>
                        <p className="text-xs text-muted-foreground">Ejemplo: {item.example}</p>
                        <p className="text-xs text-primary">→ {item.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patrones detectados */}
              <div className="space-y-3">
                <h4 className="font-medium">Patrones Detectados Automáticamente</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    'Email addresses',
                    'Phone numbers',
                    'Credit cards',
                    'NIF/NIE/CIF',
                    'IBAN accounts',
                    'Social Security',
                    'Passwords',
                    'API keys',
                    'JWT tokens',
                    'Medical records',
                    'Passport numbers',
                    'IP addresses',
                  ].map((pattern) => (
                    <div key={pattern} className="p-2 bg-muted rounded text-sm flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {pattern}
                    </div>
                  ))}
                </div>
              </div>

              {/* Anonimización */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Proceso de Anonimización
                </h4>
                <div className="text-sm space-y-1">
                  <p><code className="bg-background px-1 rounded">john@email.com</code> → <code className="bg-background px-1 rounded">[EMAIL_REDACTED]</code></p>
                  <p><code className="bg-background px-1 rounded">ES12 3456 7890 1234 5678 90</code> → <code className="bg-background px-1 rounded">[IBAN_REDACTED]</code></p>
                  <p><code className="bg-background px-1 rounded">12345678A</code> → <code className="bg-background px-1 rounded">[NIF_REDACTED]</code></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrutamiento */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Sistema de Enrutamiento Inteligente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Modos de enrutamiento */}
              <div className="space-y-3">
                <h4 className="font-medium">Modos de Enrutamiento</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      mode: 'hybrid_auto',
                      icon: <Zap className="h-4 w-4" />,
                      desc: 'Selección automática basada en múltiples factores',
                      factors: ['Sensibilidad datos', 'Disponibilidad', 'Créditos', 'Latencia'],
                    },
                    {
                      mode: 'local_only',
                      icon: <Server className="h-4 w-4" />,
                      desc: 'Solo usa proveedores locales (Ollama)',
                      factors: ['Máxima privacidad', 'Sin costos externos', 'Offline capable'],
                    },
                    {
                      mode: 'external_only',
                      icon: <Cloud className="h-4 w-4" />,
                      desc: 'Solo usa proveedores externos',
                      factors: ['Mayor capacidad', 'Modelos avanzados', 'Escalabilidad'],
                    },
                    {
                      mode: 'cost_optimized',
                      icon: <Database className="h-4 w-4" />,
                      desc: 'Minimiza costos usando local cuando es posible',
                      factors: ['Prioriza local', 'Fallback externo', 'Balance costo/calidad'],
                    },
                  ].map((item) => (
                    <div key={item.mode} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <code className="text-primary font-medium">{item.mode}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {item.factors.map((f) => (
                          <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Árbol de decisión */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h4 className="font-medium">Árbol de Decisión</h4>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-red-500" />
                    <span>¿Datos RESTRICTED? → Solo Local (Ollama)</span>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="w-4 h-4 rounded-full bg-orange-500" />
                    <span>¿Datos CONFIDENTIAL? → Anonimizar → Cualquier proveedor</span>
                  </div>
                  <div className="flex items-center gap-2 ml-8">
                    <span className="w-4 h-4 rounded-full bg-blue-500" />
                    <span>¿Ollama disponible? → Usar local (sin costo)</span>
                  </div>
                  <div className="flex items-center gap-2 ml-12">
                    <span className="w-4 h-4 rounded-full bg-green-500" />
                    <span>¿Créditos disponibles? → Usar externo preferido</span>
                  </div>
                  <div className="flex items-center gap-2 ml-16">
                    <span className="w-4 h-4 rounded-full bg-purple-500" />
                    <span>Fallback → Lovable AI (siempre disponible)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proveedores */}
        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Proveedores Soportados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Proveedores locales */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Proveedores Locales
                </h4>
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Ollama</span>
                    <Badge variant="outline">Self-hosted</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Servidor local de modelos LLM. Soporta Llama 3, Mistral, Phi, CodeLlama y más.
                  </p>
                  <div className="text-xs space-y-1 mt-2">
                    <p><strong>URL por defecto:</strong> <code>http://localhost:11434</code></p>
                    <p><strong>Modelos recomendados:</strong> llama3.2, mistral, phi3, codellama</p>
                  </div>
                </div>
              </div>

              {/* Proveedores externos */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Proveedores Externos
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { name: 'OpenAI', models: 'GPT-4o, GPT-4 Turbo', pricing: '$0.01-0.03/1K tokens' },
                    { name: 'Anthropic', models: 'Claude 3.5 Sonnet, Opus', pricing: '$0.003-0.015/1K tokens' },
                    { name: 'Google', models: 'Gemini 2.5 Pro/Flash', pricing: '$0.00025-0.00125/1K tokens' },
                    { name: 'Mistral', models: 'Large, Medium, Small', pricing: '$0.0002-0.008/1K tokens' },
                    { name: 'DeepSeek', models: 'DeepSeek V3, Coder', pricing: '$0.0001-0.0002/1K tokens' },
                    { name: 'Lovable AI', models: 'Gemini Flash (builtin)', pricing: 'Incluido en plataforma' },
                  ].map((provider) => (
                    <div key={provider.name} className="p-3 border rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{provider.name}</span>
                        <Key className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">{provider.models}</p>
                      <p className="text-xs text-primary">{provider.pricing}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuración */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Configuración de API Keys
                </h4>
                <p className="text-sm text-muted-foreground">
                  Las API keys se almacenan encriptadas en la base de datos usando AES-256-GCM.
                  Nunca se exponen en el frontend ni en logs.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Referencia de API
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-6 pr-4">
                  {/* useHybridAI */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-lg">useHybridAI()</h4>
                    <p className="text-sm text-muted-foreground">Hook principal para interactuar con el sistema de IA híbrida.</p>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`const {
  chat,           // Enviar mensaje al sistema
  isLoading,      // Estado de carga
  currentProvider,// Proveedor actual
  lastDecision,   // Última decisión de routing
} = useHybridAI({
  mode: 'hybrid_auto',
  preferredProvider: 'openai',
  onProviderSwitch: (from, to, reason) => {},
});

// Uso
const response = await chat([
  { role: 'user', content: 'Analiza este cliente...' }
], {
  entityType: 'contact',
  entityId: 'uuid',
  context: { /* datos relevantes */ }
});`}
                    </pre>
                  </div>

                  <Separator />

                  {/* useDataPrivacyGateway */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-lg">useDataPrivacyGateway()</h4>
                    <p className="text-sm text-muted-foreground">Clasificación y anonimización de datos sensibles.</p>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`const {
  classifyData,    // Clasificar texto
  anonymizeData,   // Anonimizar datos
  rules,           // Reglas activas
  addRule,         // Añadir regla
} = useDataPrivacyGateway();

// Clasificar
const result = classifyData('Email: john@email.com, NIF: 12345678A');
// { level: 'confidential', patterns: ['email', 'nif'] }

// Anonimizar
const anon = anonymizeData('Mi email es john@email.com');
// { text: 'Mi email es [EMAIL_REDACTED]', ... }`}
                    </pre>
                  </div>

                  <Separator />

                  {/* useAICredits */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-lg">useAICredits()</h4>
                    <p className="text-sm text-muted-foreground">Gestión de créditos y uso del sistema.</p>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`const {
  balance,         // Balance actual
  usage,           // Estadísticas de uso
  transactions,    // Historial
  alerts,          // Alertas activas
  addCredits,      // Añadir créditos
  estimateCost,    // Estimar costo
} = useAICredits();

// Estimar costo
const estimate = estimateCost('openai', 1000, 500);
// { promptCost: 0.01, completionCost: 0.015, total: 0.025 }`}
                    </pre>
                  </div>

                  <Separator />

                  {/* Edge Function */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-lg">Edge Function: ai-hybrid-router</h4>
                    <p className="text-sm text-muted-foreground">Endpoint del router inteligente.</p>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`// POST /functions/v1/ai-hybrid-router
{
  "action": "chat",
  "messages": [{ "role": "user", "content": "..." }],
  "context": { "entityType": "contact" },
  "options": {
    "mode": "hybrid_auto",
    "preferredProvider": "openai",
    "maxTokens": 2000
  }
}

// Response
{
  "success": true,
  "response": "...",
  "provider": "openai",
  "model": "gpt-4o",
  "usage": { "promptTokens": 150, "completionTokens": 200 },
  "routing": { "mode": "hybrid_auto", "reason": "preferred_available" }
}`}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ejemplos */}
        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ejemplos de Uso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-6 pr-4">
                  {/* Ejemplo 1 */}
                  <div className="space-y-2">
                    <h4 className="font-medium">1. Chat básico con routing automático</h4>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`import { useHybridAI } from '@/hooks/admin/ai-hybrid';

function ChatComponent() {
  const { chat, isLoading, currentProvider } = useHybridAI();

  const handleSend = async (message: string) => {
    const response = await chat([
      { role: 'user', content: message }
    ]);
    
    console.log('Response:', response);
    console.log('Used provider:', currentProvider);
  };

  return (
    <div>
      <p>Provider: {currentProvider}</p>
      <button onClick={() => handleSend('Hola')}>
        {isLoading ? 'Enviando...' : 'Enviar'}
      </button>
    </div>
  );
}`}
                    </pre>
                  </div>

                  <Separator />

                  {/* Ejemplo 2 */}
                  <div className="space-y-2">
                    <h4 className="font-medium">2. Análisis de contacto con contexto CRM</h4>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`import { useHybridAI } from '@/hooks/admin/ai-hybrid';

function ContactAnalyzer({ contact }) {
  const { chat } = useHybridAI({ mode: 'hybrid_auto' });

  const analyzeContact = async () => {
    const response = await chat([
      { 
        role: 'system', 
        content: 'Eres un analista CRM experto.' 
      },
      { 
        role: 'user', 
        content: \`Analiza este contacto y sugiere acciones:
          Nombre: \${contact.name}
          Última interacción: \${contact.lastContact}
          Valor potencial: \${contact.dealValue}\`
      }
    ], {
      entityType: 'contact',
      entityId: contact.id,
      context: {
        recentActivity: contact.activities,
        dealStage: contact.stage
      }
    });

    return response;
  };
}`}
                    </pre>
                  </div>

                  <Separator />

                  {/* Ejemplo 3 */}
                  <div className="space-y-2">
                    <h4 className="font-medium">3. Modo solo local para datos sensibles</h4>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`import { useHybridAI } from '@/hooks/admin/ai-hybrid';

function SensitiveDataProcessor() {
  const { chat, isLocalAvailable } = useHybridAI({ 
    mode: 'local_only' 
  });

  const processSensitiveData = async (data: string) => {
    if (!isLocalAvailable) {
      throw new Error('Local AI required for sensitive data');
    }

    // Los datos nunca saldrán del servidor local
    const response = await chat([
      { role: 'user', content: data }
    ]);

    return response;
  };
}`}
                    </pre>
                  </div>

                  <Separator />

                  {/* Ejemplo 4 */}
                  <div className="space-y-2">
                    <h4 className="font-medium">4. Monitoreo de créditos y alertas</h4>
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`import { useAICredits } from '@/hooks/admin/ai-hybrid';

function CreditMonitor() {
  const { balance, alerts, usage } = useAICredits();

  return (
    <div>
      <h3>Balance: \${balance.available.toFixed(2)}</h3>
      
      {alerts.filter(a => !a.acknowledged).map(alert => (
        <div key={alert.id} className="alert">
          {alert.message}
        </div>
      ))}
      
      <div>
        <p>Requests hoy: {usage.totalRequests}</p>
        <p>Tokens usados: {usage.totalTokens}</p>
        <p>Costo total: \${usage.totalCost.toFixed(4)}</p>
      </div>
    </div>
  );
}`}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AIHybridDocumentation;
