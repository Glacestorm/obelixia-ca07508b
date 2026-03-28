import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Complete knowledge base about ObelixIA system capabilities
const OBELIXIA_KNOWLEDGE = {
  description: "CRM Bancario Inteligente para gestión de carteras comerciales en entidades financieras",
  
  modules: {
    core: [
      "Dashboard comercial con KPIs en tiempo real",
      "Mapa interactivo de empresas con clustering y filtros avanzados",
      "Gestión completa de visitas comerciales con hojas de visita",
      "Sistema de objetivos y seguimiento de metas",
      "Gestión de contactos y relaciones empresariales",
    ],
    financial: [
      "Análisis de estados financieros (Balance, PyG, Flujo de Caja)",
      "Cálculo automático de ratios sectoriales",
      "Z-Score (Altman Original, Services, Zmijewski) por sector",
      "Probabilidad de default y riesgo crediticio",
      "Sistema RAG para consultas financieras con IA",
    ],
    compliance: [
      "Dashboard DORA/NIS2 completo",
      "Gestión de incidentes de seguridad",
      "Tests de estrés automatizados (7 escenarios)",
      "Sistema de auditoría por sectores",
      "Generación automática de informes para auditores",
      "ISO 27001, GDPR, Basel III/IV, MiFID II, APDA",
    ],
    ai: [
      "Asistente interno con voz para gestores",
      "Generación automática de planes de acción",
      "Parsing inteligente de PDFs financieros",
      "Análisis predictivo y recomendaciones",
      "Auto-remediación de problemas del sistema",
      "Sugerencias de bundles CNAE mediante IA",
    ],
    admin: [
      "Gestión de usuarios y roles (superadmin, director, gestor)",
      "Configuración de alertas y notificaciones",
      "Panel de salud del sistema con diagnósticos",
      "Gestión de productos y conceptos bancarios",
      "Importación masiva de datos desde Excel",
    ],
    // Nuevos módulos sectoriales CRM
    sectorCRM: [
      "CRM Salud - Gestión de pacientes y centros médicos",
      "CRM Inmobiliario - Propiedades, leads y transacciones",
      "CRM Educación - Alumnos, matrículas y seguimiento académico",
      "CRM Hostelería - Reservas, clientes y fidelización",
      "CRM Legal - Casos, clientes y facturación jurídica",
      "CRM Retail - Clientes, inventario y ventas omnicanal",
      "CRM Industrial - B2B, maquinaria y proyectos",
      "CRM Logística - Flotas, rutas y clientes de transporte",
      "CRM Agrícola - Explotaciones, cosechas y cooperativas",
      "CRM Energético - Plantas, contratos y mantenimiento",
      "CRM Bancario - Carteras, scoring y cumplimiento",
      "CRM Gobierno - Ciudadanos, trámites y servicios públicos",
    ],
    // Nuevos módulos sectoriales ERP
    sectorERP: [
      "ERP Salud - Gestión hospitalaria completa",
      "ERP Inmobiliario - Promociones y proyectos",
      "ERP Educativo - Gestión académica integral",
      "ERP Hostelería - Operaciones hoteleras",
      "ERP Legal - Gestión de despachos",
      "ERP Retail - Tiendas y ecommerce",
      "ERP Industrial - Producción y MRP",
      "ERP Logístico - Almacenes y distribución",
      "ERP Agrícola - Gestión agraria integral",
      "ERP Construcción - Proyectos y obras",
      "ERP Energético - Plantas y utilities",
    ],
    // Packs sectoriales 360°
    packs360: [
      "Pack Healthcare 360 - Solución completa para salud",
      "Pack Real Estate 360 - Gestión inmobiliaria integral",
      "Pack Education 360 - Plataforma educativa completa",
      "Pack Hospitality 360 - Gestión hotelera total",
      "Pack Professional 360 - Servicios profesionales",
      "Pack Retail 360 - Comercio unificado",
      "Pack Industry 360 - Fabricación inteligente",
      "Pack Logistics 360 - Cadena de suministro",
      "Pack Agriculture 360 - Gestión agraria",
      "Pack Energy 360 - Utilities y renovables",
      "Pack Banking 360 - Banca digital",
      "Pack Government 360 - Administración pública",
    ],
    // Módulos premium transversales
    premium: [
      "AI Copilot Enterprise - Asistente IA avanzado multimodal",
      "Analytics Executive Suite - BI ejecutivo con predicción",
      "Compliance Master - Cumplimiento normativo automatizado",
    ],
  },
  
  roles: {
    superadmin: "Acceso total al sistema, configuración y administración",
    director_comercial: "Vista global de todos los datos, gestión de equipos",
    director_oficina: "Vista de su oficina asignada y sus gestores",
    responsable_comercial: "Gestión de equipos comerciales",
    gestor: "Gestión de su cartera de empresas asignadas",
  },
  
  sectors: [
    "Banca y Finanzas", "Sanidad", "Retail", "Industria",
    "Construcción", "Hostelería", "Servicios Profesionales",
    "Agricultura", "Transporte y Logística", "Tecnología"
  ],
  
  deployment: {
    saas: "Despliegue en la nube, sin infraestructura propia",
    onpremise: "Instalación local para máximo control y seguridad",
    hybrid: "Combinación de ambos modelos según necesidades",
  },
  
  technology: {
    frontend: "React 19, TypeScript, Tailwind CSS, Shadcn/ui, Framer Motion",
    backend: "Supabase (PostgreSQL + Edge Functions)",
    maps: "MapLibre GL, Mapbox con soporte 3D",
    ai: "Integración con Gemini AI y Lovable AI Gateway",
    security: "WebAuthn/Passkeys, RLS, AES-256-GCM, MFA",
  },
  
  security: [
    "Autenticación multifactor con WebAuthn/Passkeys",
    "Biometría comportamental (patrones de tecleo/mouse)",
    "Row Level Security en todas las tablas",
    "Cifrado AES-256-GCM para datos sensibles",
    "Detección de fraude contextual AML",
    "Logs de auditoría completos e inmutables",
    "Headers de seguridad HTTP estrictos (HSTS, CSP)",
  ],
  
  languages: ["Español", "Inglés", "Catalán", "Francés"],
  
  contact: {
    name: "Jaime Fernández García",
    role: "Co-founder & Commercial Representative",
    email: "jfernandez@obelixia.com",
    phone: "+34 606 770 033",
    location: "León, España",
  },
};

function generateResponse(question: string): string {
  const q = question.toLowerCase().trim();
  
  // Greetings
  if (q.match(/^(hola|hello|hi|hey|buenos|buenas|saludos)/)) {
    return "¡Hola! 👋 Soy el asistente de ObelixIA. Estoy aquí para ayudarte a conocer nuestra plataforma. ¿Qué te gustaría saber?";
  }
  
  // Price questions - redirect to demo/visit
  if (q.includes('precio') || q.includes('cuesta') || q.includes('coste') || q.includes('price') || q.includes('cost') || q.includes('tarifa') || q.includes('licencia')) {
    return `📅 **Información personalizada**\n\nPara ofrecerte la mejor propuesta adaptada a tus necesidades, te invitamos a:\n\n• **Demo online**: Agenda una demostración personalizada\n• **Visita presencial**: Nuestro equipo puede visitarte\n\n**Contacto directo:**\n${OBELIXIA_KNOWLEDGE.contact.name}\n📧 ${OBELIXIA_KNOWLEDGE.contact.email}\n📞 ${OBELIXIA_KNOWLEDGE.contact.phone}\n\n¿Te gustaría que te contactemos para coordinar una demo?`;
  }
  
  // Features/functionality questions
  if (q.includes('función') || q.includes('característica') || q.includes('feature') || q.includes('puede hacer') || q.includes('qué hace') || q.includes('capacidad')) {
    const core = OBELIXIA_KNOWLEDGE.modules.core.slice(0, 3).map(f => `• ${f}`).join('\n');
    const financial = OBELIXIA_KNOWLEDGE.modules.financial.slice(0, 2).map(f => `• ${f}`).join('\n');
    return `✨ **Funcionalidades de ObelixIA**\n\n**Gestión Comercial:**\n${core}\n\n**Análisis Financiero:**\n${financial}\n\nTambién incluye módulos de compliance, IA y administración.\n\n¿Quieres que te explique alguna funcionalidad en detalle o prefieres verlo en una demo?`;
  }
  
  // Financial analysis
  if (q.includes('financier') || q.includes('balance') || q.includes('ratio') || q.includes('z-score') || q.includes('contab') || q.includes('análisis')) {
    const features = OBELIXIA_KNOWLEDGE.modules.financial.map(f => `• ${f}`).join('\n');
    return `📊 **Análisis Financiero**\n\n${features}\n\nCada empresa se analiza con ratios específicos de su sector CNAE.\n\n¿Te gustaría ver cómo funciona en una demo personalizada?`;
  }
  
  // Compliance questions
  if (q.includes('compliance') || q.includes('normativa') || q.includes('regulación') || q.includes('gdpr') || q.includes('dora') || q.includes('iso') || q.includes('audit')) {
    const features = OBELIXIA_KNOWLEDGE.modules.compliance.map(f => `• ${f}`).join('\n');
    return `🛡️ **Compliance y Normativas**\n\n${features}\n\nGeneramos automáticamente informes para auditores externos.\n\n¿Quieres coordinar una visita para ver el módulo de compliance en detalle?`;
  }
  
  // AI capabilities
  if (q.includes('ia') || q.includes('inteligencia artificial') || q.includes('ai') || q.includes('artificial') || q.includes('asistente')) {
    const features = OBELIXIA_KNOWLEDGE.modules.ai.map(f => `• ${f}`).join('\n');
    return `🤖 **Capacidades de IA**\n\n${features}\n\nLa IA está integrada en toda la plataforma para maximizar la productividad.\n\n¿Te gustaría una demo para ver la IA en acción?`;
  }
  
  // CRM sectorial
  if (q.includes('crm') && (q.includes('sector') || q.includes('salud') || q.includes('inmobil') || q.includes('educa') || q.includes('hotel') || q.includes('legal') || q.includes('retail') || q.includes('industri') || q.includes('logísti') || q.includes('agríco') || q.includes('energé') || q.includes('banc') || q.includes('gobierno'))) {
    const crmModules = OBELIXIA_KNOWLEDGE.modules.sectorCRM.slice(0, 6).map(f => `• ${f}`).join('\n');
    return `👥 **CRM Sectoriales**\n\nTenemos CRM especializados por sector:\n\n${crmModules}\n\n...y 6 más para otros sectores.\n\nCada CRM incluye campos, workflows y reportes específicos del sector.\n\n¿Qué sector te interesa? Podemos mostrarte una demo especializada.`;
  }

  // ERP sectorial
  if (q.includes('erp') && (q.includes('sector') || q.includes('salud') || q.includes('inmobil') || q.includes('educa') || q.includes('hotel') || q.includes('legal') || q.includes('retail') || q.includes('industri') || q.includes('logísti') || q.includes('agríco') || q.includes('construc') || q.includes('energé'))) {
    const erpModules = OBELIXIA_KNOWLEDGE.modules.sectorERP.slice(0, 6).map(f => `• ${f}`).join('\n');
    return `🏢 **ERP Sectoriales**\n\nERPs adaptados a cada industria:\n\n${erpModules}\n\n...y 5 más para otros sectores.\n\nCada ERP incluye procesos, contabilidad y reportes específicos.\n\n¿Qué sector necesitas? Te mostramos cómo funciona.`;
  }

  // Packs 360
  if (q.includes('pack') || q.includes('360') || q.includes('completo') || q.includes('integral') || q.includes('todo incluido')) {
    const packs = OBELIXIA_KNOWLEDGE.modules.packs360.slice(0, 4).map(f => `• ${f}`).join('\n');
    return `📦 **Packs Sectoriales 360°**\n\nSoluciones completas que incluyen CRM + ERP + Módulos específicos:\n\n${packs}\n\n...y 8 más para todos los sectores.\n\nCada Pack incluye todo lo necesario para digitalizar tu sector al completo.\n\n¿Te gustaría ver un Pack específico en una demo?`;
  }

  // Módulos premium
  if (q.includes('premium') || q.includes('enterprise') || q.includes('avanzado') || q.includes('copilot') || q.includes('analytics executive') || q.includes('compliance master')) {
    const premium = OBELIXIA_KNOWLEDGE.modules.premium.map(f => `• ${f}`).join('\n');
    return `💎 **Módulos Premium**\n\nCapacidades enterprise avanzadas:\n\n${premium}\n\nEstos módulos potencian cualquier sector con IA avanzada y analytics predictivo.\n\n¿Quieres conocer más sobre alguno en particular?`;
  }

  // Sectors/CNAE
  if (q.includes('sector') || q.includes('industria') || q.includes('cnae')) {
    const sectors = OBELIXIA_KNOWLEDGE.sectors.join(', ');
    return `🏢 **Sectores Soportados**\n\n${sectors}\n\n**Ofrecemos para cada sector:**\n• CRM especializado\n• ERP adaptado\n• Pack 360° completo\n\n¿Trabajas con algún sector específico? Podemos mostrarte cómo se adapta.`;
  }
  
  // Deployment
  if (q.includes('deploy') || q.includes('instalación') || q.includes('on-premise') || q.includes('cloud') || q.includes('saas') || q.includes('despliegue')) {
    return `☁️ **Opciones de Despliegue**\n\n• **SaaS**: ${OBELIXIA_KNOWLEDGE.deployment.saas}\n• **On-Premise**: ${OBELIXIA_KNOWLEDGE.deployment.onpremise}\n• **Hybrid**: ${OBELIXIA_KNOWLEDGE.deployment.hybrid}\n\nRecomendamos On-Premise o Hybrid para entidades bancarias por requisitos regulatorios.\n\n¿Quieres que te expliquemos cuál es mejor para tu caso en una visita?`;
  }
  
  // Technology
  if (q.includes('tecnología') || q.includes('tech') || q.includes('stack') || q.includes('react') || q.includes('supabase') || q.includes('desarrolla')) {
    return `🔧 **Tecnología**\n\n• **Frontend**: ${OBELIXIA_KNOWLEDGE.technology.frontend}\n• **Backend**: ${OBELIXIA_KNOWLEDGE.technology.backend}\n• **Mapas**: ${OBELIXIA_KNOWLEDGE.technology.maps}\n• **IA**: ${OBELIXIA_KNOWLEDGE.technology.ai}\n\nArquitectura escalable para 500-1000+ usuarios simultáneos.`;
  }
  
  // Security
  if (q.includes('seguridad') || q.includes('security') || q.includes('autenticación') || q.includes('mfa') || q.includes('protección')) {
    const security = OBELIXIA_KNOWLEDGE.security.slice(0, 5).map(s => `• ${s}`).join('\n');
    return `🔒 **Seguridad Bancaria**\n\n${security}\n\nCumplimos con PSD3/SCA para autenticación fuerte.\n\n¿Te gustaría ver los controles de seguridad en una demo?`;
  }
  
  // What is ObelixIA
  if (q.includes('qué es') || q.includes('what is') || q.match(/^obelixia$/)) {
    return `🧠 **ObelixIA**\n\n${OBELIXIA_KNOWLEDGE.description}\n\n**Incluye:**\n• Gestión de carteras con mapas interactivos\n• Análisis financiero automatizado\n• Cumplimiento normativo (DORA, ISO27001...)\n• IA integrada para productividad\n\nIdeal para bancos y entidades financieras en España, Andorra y Europa.\n\n¿Quieres conocerlo mejor en una demo personalizada?`;
  }
  
  // Demo request
  if (q.includes('demo') || q.includes('prueba') || q.includes('trial') || q.includes('probar') || q.includes('ver')) {
    return `🎮 **Demo de ObelixIA**\n\nOfrecemos dos opciones:\n\n**1. Demo Online Gratuita**\nPuedes probar la plataforma con datos de ejemplo haciendo clic en "Probar Demo Gratuita".\n\n**2. Demo Personalizada**\nNuestro equipo te muestra la plataforma adaptada a tu caso.\n\n**Contacto:**\n${OBELIXIA_KNOWLEDGE.contact.name}\n📧 ${OBELIXIA_KNOWLEDGE.contact.email}\n📞 ${OBELIXIA_KNOWLEDGE.contact.phone}\n\n¿Prefieres la demo online o una sesión personalizada?`;
  }
  
  // Contact
  if (q.includes('contacto') || q.includes('contact') || q.includes('hablar') || q.includes('llamar') || q.includes('email') || q.includes('teléfono')) {
    return `📞 **Contacto**\n\n**${OBELIXIA_KNOWLEDGE.contact.name}**\n${OBELIXIA_KNOWLEDGE.contact.role}\n\n📧 ${OBELIXIA_KNOWLEDGE.contact.email}\n📞 ${OBELIXIA_KNOWLEDGE.contact.phone}\n📍 ${OBELIXIA_KNOWLEDGE.contact.location}\n\nPodemos coordinar una visita presencial o una demo online según tu preferencia.`;
  }
  
  // Visit/meeting
  if (q.includes('visita') || q.includes('reunión') || q.includes('meeting') || q.includes('cita') || q.includes('presencial')) {
    return `📅 **Visita Presencial**\n\nNuestro equipo comercial puede visitarte para:\n\n• Presentación personalizada de la plataforma\n• Análisis de tus necesidades específicas\n• Demostración con casos de tu sector\n\n**Contacto:**\n${OBELIXIA_KNOWLEDGE.contact.name}\n📧 ${OBELIXIA_KNOWLEDGE.contact.email}\n📞 ${OBELIXIA_KNOWLEDGE.contact.phone}\n\n¿En qué ciudad te encuentras?`;
  }
  
  // Roles/users
  if (q.includes('rol') || q.includes('usuario') || q.includes('permiso') || q.includes('acceso') || q.includes('admin')) {
    const roles = Object.entries(OBELIXIA_KNOWLEDGE.roles).map(([role, desc]) => `• **${role}**: ${desc}`).join('\n');
    return `👥 **Roles de Usuario**\n\n${roles}\n\nCada rol tiene acceso controlado según sus responsabilidades.`;
  }
  
  // Languages
  if (q.includes('idioma') || q.includes('lenguaje') || q.includes('language') || q.includes('traducción')) {
    return `🌍 **Idiomas**\n\nObelixIA está disponible en:\n${OBELIXIA_KNOWLEDGE.languages.join(', ')}\n\nToda la interfaz se traduce automáticamente al seleccionar el idioma.`;
  }
  
  // Maps
  if (q.includes('mapa') || q.includes('map') || q.includes('geográf') || q.includes('ubicación') || q.includes('ruta')) {
    return `🗺️ **Mapas y Geolocalización**\n\n• Visualización de empresas en mapa interactivo\n• Clustering automático por densidad\n• Planificación de rutas de visita\n• Vista 3D de edificios\n• Filtros por sector, estado, gestor\n• Geocodificación automática de direcciones\n\n¿Te gustaría ver el sistema de mapas en una demo?`;
  }
  
  // Visits
  if (q.includes('visita comercial') || q.includes('hoja de visita') || q.includes('seguimiento')) {
    return `📋 **Gestión de Visitas**\n\n• Registro completo de visitas comerciales\n• Hojas de visita con análisis financiero\n• Planificación de rutas optimizadas\n• Calendario integrado con recordatorios\n• Historial y seguimiento de cada empresa\n\nEl sistema facilita el trabajo diario del gestor comercial.`;
  }
  
  // Goals/objectives
  if (q.includes('objetivo') || q.includes('meta') || q.includes('kpi') || q.includes('goal')) {
    return `🎯 **Sistema de Objetivos**\n\n• Definición de metas por gestor y oficina\n• Seguimiento en tiempo real del progreso\n• KPIs personalizables\n• Alertas automáticas de desviaciones\n• Comparativas entre equipos\n\nLos directores asignan objetivos y los gestores ven su progreso.`;
  }
  
  // Thanks
  if (q.includes('gracias') || q.includes('thank')) {
    return "¡De nada! 😊 Si tienes más preguntas o quieres coordinar una demo, aquí estoy. ¿Hay algo más en lo que pueda ayudarte?";
  }
  
  // Goodbye
  if (q.includes('adiós') || q.includes('adios') || q.includes('bye') || q.includes('hasta luego')) {
    return "¡Hasta pronto! 👋 Si necesitas más información, no dudes en escribirme o contactar con nuestro equipo para una demo personalizada.";
  }
  
  // Default response - suggest demo
  return `Gracias por tu interés. Puedo ayudarte con:\n\n• ✨ **Funcionalidades** - Qué puede hacer ObelixIA\n• 📊 **Análisis financiero** - Ratios y Z-Score\n• 🛡️ **Compliance** - DORA, ISO27001, GDPR\n• 🏢 **Sectores** - Multi-CNAE\n• 🤖 **IA** - Capacidades inteligentes\n• 🔒 **Seguridad** - Controles bancarios\n\n📅 También puedo ayudarte a coordinar una **demo personalizada** o **visita presencial**.\n\n¿Qué te interesa conocer?`;
}

export function ObelixiaChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! 👋 Soy el asistente de ObelixIA. Pregúntame sobre la plataforma o coordina una demo personalizada.',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

    const response = generateResponse(userMessage.content);
    
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    setIsTyping(false);
    setMessages(prev => [...prev, assistantMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50 pointer-events-auto"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg transition-all duration-300",
            "bg-gradient-to-br from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400",
            "border-2 border-white/20",
            isOpen && "rotate-90"
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                className="relative"
              >
                <Bot className="w-6 h-6 text-white" />
                <Sparkles className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)]"
          >
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-cyan-600 to-emerald-600 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Asistente ObelixIA</h3>
                    <p className="text-xs text-white/80">Disponible para ayudarte</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="h-[350px] p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-2",
                        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.role === 'user' 
                          ? 'bg-cyan-500/20' 
                          : 'bg-gradient-to-br from-cyan-500 to-emerald-500'
                      )}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <div className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                        message.role === 'user'
                          ? 'bg-cyan-500/20 text-white rounded-tr-sm'
                          : 'bg-white/10 text-gray-100 rounded-tl-sm'
                      )}>
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {isTyping && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Escribe tu pregunta..."
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-cyan-500"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping}
                    className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
