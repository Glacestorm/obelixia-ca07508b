

# AI Command Center — Implementacion por Fases

Basado en el documento PDF v2.0, se implementaran las 8 fases (0-7) de forma incremental. Empezamos con las Fases 0 y 1 juntas (son la base obligatoria).

---

## FASE 0 + FASE 1 — Fundacion + Modulo + Live Operations Hub

### Base de Datos (Migration)

1. **Crear tabla `erp_ai_approval_queue`**: cola de aprobaciones con campos `agent_code`, `domain`, `task_type`, `status` (pending/approved/rejected/escalated), `priority` (1-10), `semaphore` (red/yellow/green), `confidence_score`, `payload_summary