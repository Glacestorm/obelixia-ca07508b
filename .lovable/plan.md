# Plan por Fases: Solucionar Recursion Infinita en CRM Modular Dashboard

## Resumen del Problema

Al intentar crear el "CRM Modular Dashboard completo con todos los modulos CRM existentes y sus agentes especializados coordinados por el supervisor", se produce recursion infinita. Este problema tiene **multiples fuentes** que debemos abordar en fases.

---

## FASE 1: Corregir Politicas RLS con Recursion Potencial

### Problema Identificado
Las siguientes politicas RLS consultan tablas que a su vez dependen de otras politicas RLS, creando cadenas de recursion:

**1. `crm_teams` - Politica "Users can view workspace teams"**
```sql
-- PROBLEMATICA: Consulta crm_user_workspaces directamente sin SECURITY DEFINER
EXISTS (
  SELECT 1 FROM crm_user_workspaces
  WHERE workspace_id = crm_teams.workspace_id
  AND user_id = auth.uid()
  AND is_active = true
)
```

**2. `crm_team_members` - Politica "Users can view team members"**
```sql
-- PROBLEMATICA: Consulta crm_teams y crm_user_workspaces sin SECURITY DEFINER
EXISTS (
  SELECT 1 FROM crm_teams t
  JOIN crm_user_workspaces uw ON uw.workspace_id = t.workspace_id
  WHERE t.id = crm_team_members.team_id
  AND uw.user_id = auth.uid()
  AND uw.is_active = true
)
```

**3. `crm_roles` - Politica "Users can view roles in their workspaces"**
```sql
-- PROBLEMATICA: Subquery a crm_user_workspaces sin SECURITY DEFINER
workspace_id IN (
  SELECT crm_user_workspaces.workspace_id
  FROM crm_user_workspaces
  WHERE crm_user_workspaces.user_id = auth.uid()
  AND crm_user_workspaces.is_active = true
)
```

**4. `crm_role_permissions` - Politica similar con subquery anidada**

**5. `crm_workspaces` - Politica "Admins can update their workspaces"**
```sql
-- PROBLEMATICA: JOIN multiple sin SECURITY DEFINER
id IN (
  SELECT uw.workspace_id
  FROM crm_user_workspaces uw
  JOIN crm_roles r ON r.id = uw.role_id
  JOIN crm_role_permissions rp ON rp.role_id = r.id
  JOIN crm_permissions p ON p.id = rp.permission_id
  WHERE uw.user_id = auth.uid() AND p.key = 'admin.all'
)
```

### Solucion Fase 1
Crear funciones SECURITY DEFINER y actualizar las politicas:

```sql
-- 1. Funcion para verificar pertenencia a workspace
CREATE OR REPLACE FUNCTION public.crm_user_belongs_to_workspace(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM crm_user_workspaces
    WHERE user_id = _user_id AND workspace_id = _workspace_id AND is_active = true
  )
$$;

-- 2. Funcion para obtener workspaces del usuario
CREATE OR REPLACE FUNCTION public.crm_get_user_workspaces(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT workspace_id FROM crm_user_workspaces
  WHERE user_id = _user_id AND is_active = true
$$;

-- 3. Funcion para verificar si es admin del workspace
CREATE OR REPLACE FUNCTION public.crm_is_workspace_admin(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM crm_user_workspaces uw
    JOIN crm_roles r ON r.id = uw.role_id
    JOIN crm_role_permissions rp ON rp.role_id = r.id
    JOIN crm_permissions p ON p.id = rp.permission_id
    WHERE uw.user_id = _user_id 
      AND uw.workspace_id = _workspace_id
      AND p.key = 'admin.all'
  )
$$;
```

Luego actualizar politicas:
```sql
-- crm_teams
DROP POLICY IF EXISTS "Users can view workspace teams" ON public.crm_teams;
CREATE POLICY "Users can view workspace teams" ON public.crm_teams FOR SELECT
USING (public.crm_user_belongs_to_workspace(auth.uid(), workspace_id));

-- crm_roles
DROP POLICY IF EXISTS "Users can view roles in their workspaces" ON public.crm_roles;
CREATE POLICY "Users can view roles in their workspaces" ON public.crm_roles FOR SELECT
USING (workspace_id IN (SELECT public.crm_get_user_workspaces(auth.uid())));

-- etc.
```

---

## FASE 2: Corregir useEffect Loops en Hooks CRM

### Problema Identificado
Multiples hooks tienen dependencias ciclicas en useCallback/useEffect:

**1. `useCRMContacts.ts` (linea 220-222)**
```typescript
useEffect(() => {
  fetchContacts();
}, [fetchContacts]); // fetchContacts depende de currentWorkspace, filters
```
El problema: `fetchContacts` cambia cada vez que `filters` cambia, lo que puede causar renders infinitos si algun componente actualiza filters en respuesta a datos.

**2. `useCRMDeals.ts` (linea 225-227)**
```typescript
useEffect(() => {
  fetchDeals();
}, [fetchDeals]); // fetchDeals depende de filters
```

**3. `useCRMActivities.ts` (linea 170-172)**
```typescript
useEffect(() => {
  fetchActivities();
}, [fetchActivities]);
```

**4. `CRMAgentsPanel.tsx` (linea 173-175)**
```typescript
useEffect(() => {
  initializeAgents();
}, [initializeAgents]); // initializeAgents es useCallback sin deps estables
```

### Solucion Fase 2
Estabilizar las dependencias usando refs o separando efectos:

```typescript
// Patron seguro para fetch inicial
const isInitialMount = useRef(true);

useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false;
    fetchContacts();
  }
}, []); // Solo en mount

// Efecto separado para cambios de workspace
useEffect(() => {
  if (!isInitialMount.current && currentWorkspace?.id) {
    fetchContacts();
  }
}, [currentWorkspace?.id]); // Solo cuando cambia workspace
```

---

## FASE 3: Optimizar Inicializacion de Agentes CRM

### Problema Identificado
`useCRMModuleAgents` tiene multiples estados y refs que se actualizan en cascada:

```typescript
// Linea 310-313: Ref que se actualiza en cada render
const supervisorOrchestrateRef = useRef(supervisorOrchestrate);
useEffect(() => {
  supervisorOrchestrateRef.current = supervisorOrchestrate;
}, [supervisorOrchestrate]); // Cambia frecuentemente
```

### Solucion Fase 3
1. Mover la logica de inicializacion fuera del componente
2. Usar un patron de "lazy initialization"
3. Implementar debouncing para operaciones costosas

```typescript
// Inicializacion lazy
const [isInitialized, setIsInitialized] = useState(false);

const initializeOnce = useCallback(async () => {
  if (isInitialized) return;
  setIsInitialized(true);
  await initializeAgents();
}, [isInitialized, initializeAgents]);
```

---

## FASE 4: Corregir CRMContext Provider

### Problema Identificado
`useCRMContext.tsx` tiene un useEffect que depende de `refreshWorkspaces` (linea 153-155):

```typescript
useEffect(() => {
  refreshWorkspaces();
}, [refreshWorkspaces]);
```

`refreshWorkspaces` es un useCallback que depende de `user?.id`, lo cual es correcto, pero si hay multiples CRMProvider anidados o el componente se re-monta frecuentemente, puede causar cascadas.

### Solucion Fase 4
1. Agregar guard para evitar fetches duplicados
2. Usar AbortController para cancelar requests pendientes

```typescript
const [isFetching, setIsFetching] = useState(false);
const abortControllerRef = useRef<AbortController | null>(null);

const refreshWorkspaces = useCallback(async () => {
  if (!user?.id || isFetching) return;
  
  // Cancelar request anterior
  abortControllerRef.current?.abort();
  abortControllerRef.current = new AbortController();
  
  setIsFetching(true);
  // ... fetch logic
}, [user?.id, isFetching]);
```

---

## FASE 5: Verificar Edge Functions CRM

### Verificar
1. `crm-module-agent` - Edge function que usa los agentes
2. Asegurar que no haya loops en llamadas recursivas

### Archivos a revisar
- `supabase/functions/crm-module-agent/index.ts`

---

## Archivos Criticos para Implementacion

| Archivo | Razon |
|---------|-------|
| `supabase/migrations/NEW_MIGRATION.sql` | Crear funciones SECURITY DEFINER y actualizar RLS policies |
| `src/hooks/crm/useCRMContext.tsx` | Corregir useEffect loop en provider |
| `src/hooks/crm/useCRMContacts.ts` | Estabilizar fetchContacts |
| `src/hooks/crm/useCRMDeals.ts` | Estabilizar fetchDeals |
| `src/hooks/crm/agents/useCRMModuleAgents.ts` | Optimizar inicializacion de agentes |
| `src/components/crm/agents/CRMAgentsPanel.tsx` | Corregir initializeAgents useEffect |

---

## Orden de Implementacion

1. **FASE 1** (Prioritaria): Migracion SQL para RLS - Esto elimina la recursion a nivel de base de datos
2. **FASE 2**: Corregir hooks de datos (Contacts, Deals, Activities)
3. **FASE 3**: Optimizar hook de agentes
4. **FASE 4**: Reforzar CRMContext
5. **FASE 5**: Verificar edge functions

---

## Estimacion de Impacto

- **Fase 1**: Elimina ~60% de los problemas de recursion (nivel DB)
- **Fase 2-3**: Elimina ~30% (nivel React state)
- **Fase 4-5**: Elimina ~10% restante (edge cases)

---

## Notas Importantes

1. La funcion `has_crm_permission` YA tiene SECURITY DEFINER, por lo que las tablas `crm_contacts`, `crm_deals`, `crm_activities` estan protegidas correctamente.

2. El problema principal esta en las tablas de configuracion (`crm_teams`, `crm_roles`, `crm_workspaces`) cuyos policies NO usan funciones SECURITY DEFINER.

3. Los hooks React necesitan estabilizar sus dependencias para evitar re-renders en cascada.
