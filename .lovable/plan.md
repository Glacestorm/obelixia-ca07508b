
# Plan: Enrutar IA Local a través de Edge Function

## Problema Identificado
El navegador bloquea las conexiones directas a tu servidor Ollama (`https://192.168.20.174:11443`) debido a la política de seguridad (CSP) de la plataforma. Esto no es un problema de CORS ni de PNA - es una restricción a nivel de navegador que no podemos cambiar.

## Solución Propuesta
Cambiar la arquitectura para que todas las llamadas a Ollama pasen por el backend en lugar de ir directamente desde el navegador. El backend (Edge Function) no tiene restricciones de CSP y puede conectarse libremente a cualquier servidor.

```text
ANTES (bloqueado por CSP):
┌─────────────┐         ┌─────────────────┐
│  Navegador  │ ──X──►  │  Ollama (LAN)   │
│  (Copilot)  │  CSP!   │ 192.168.20.174  │
└─────────────┘         └─────────────────┘

DESPUÉS (funciona):
┌─────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Navegador  │ ──────► │  Edge Function  │ ──────► │  Ollama (LAN)   │
│  (Copilot)  │ HTTPS   │  (Backend)      │  HTTP   │ 192.168.20.174  │
└─────────────┘         └─────────────────┘         └─────────────────┘
```

## Cambios Necesarios

### 1. Modificar `useAICopilot.ts`
- Eliminar la función `callLocalOllama` que hace `fetch` directo
- Crear una nueva función `callLocalViaEdgeFunction` que llame a `crm-ai-local-bridge`
- Pasar la URL de Ollama configurada como parámetro

### 2. Actualizar `crm-ai-local-bridge` Edge Function  
- Añadir soporte para temperatura y maxTokens configurables
- Mejorar el manejo de errores para dar feedback claro
- Asegurar que respeta la URL de Ollama pasada desde el cliente

### 3. Actualizar componente de configuración
- Mostrar mensaje informativo explicando que la conexión pasa por el backend
- Añadir indicador visual cuando se usa el modo proxy

## Resultado Esperado
- El Copilot podrá conectarse a tu servidor Ollama sin errores de CSP
- La configuración de URL (`https://192.168.20.174:11443`) seguirá funcionando
- El fallback a Lovable AI seguirá operativo si Ollama no responde

## Detalles Técnicos

### Cambio en `useAICopilot.ts` (extracto)
```typescript
// ANTES: Llamada directa bloqueada por CSP
const response = await fetch(`${ollamaUrl}/api/chat`, { ... });

// DESPUÉS: Via Edge Function (permitido)
const { data, error } = await supabase.functions.invoke('crm-ai-local-bridge', {
  body: {
    action: 'chat',
    model: selectedModel,
    messages: messagesWithSystem,
    ollamaUrl: settings.ollamaUrl,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
  }
});
```

### Cambio en Edge Function (extracto)
```typescript
// Aceptar parámetros adicionales
const { 
  temperature = 0.7,
  maxTokens = 2000,
  ...
} = await req.json();

// Usar en la llamada a Ollama
options: {
  temperature,
  num_predict: maxTokens,
}
```

## Notas Importantes
- El certificado SSL autofirmado ya no es necesario para el navegador (solo el backend se conecta)
- El proxy Nginx con HTTPS ya no es estrictamente necesario - podrías usar HTTP directo desde el backend
- Sin embargo, mantener HTTPS es buena práctica si la VM está en una red compartida
