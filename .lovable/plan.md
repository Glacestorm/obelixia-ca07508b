

# S4.4A-1: Reducción selectiva de service_role — COMPLETADO

## Funciones migradas

### 1. hr-board-pack
- **9/9 operaciones → userClient** (0 adminClient residual)
- Eliminado: creación manual de `supabase` (service_role) y auth gate inline
- Añadido: `validateTenantAccess(req, companyId)` → `userClient`

### 2. erp-hr-compliance-enterprise
- **~33/~45 operaciones → userClient**
- **~12 operaciones en adminClient**: `seed_demo` (DELETE + INSERT sin DELETE RLS policies)
- Eliminado: creación manual de `supabase` (service_role) y auth gate inline
- Añadido: `validateTenantAccess(req, companyId)` → `userClient` + `adminClient`

### 3. erp-hr-innovation-discovery
- **8/10 operaciones → userClient**
- **2 operaciones en adminClient**: setTimeout (JWT puede expirar post-response)
- Eliminado: creación manual de `adminClient`/`userClient` y auth gate inline
- Añadido: `validateTenantAccess(req, company_id)` → `userClient` + `adminClient`

## Resumen

| Función | Ops totales | → userClient | → adminClient | Motivo residual |
|---------|:-----------:|:------------:|:-------------:|-----------------|
| hr-board-pack | 9 | **9** | 0 | — |
| erp-hr-compliance-enterprise | ~45 | **~33** | ~12 | seed_demo (sin DELETE policies) |
| erp-hr-innovation-discovery | 10 | **8** | 2 | setTimeout (JWT expirado) |
| **TOTAL** | **~64** | **~50** | **~14** | |

## Confirmación
- ✅ Contratos API sin cambios
- ✅ Lógica de negocio sin cambios
- ✅ CORS y error sanitization intactos
- ✅ 3 funciones desplegadas exitosamente
