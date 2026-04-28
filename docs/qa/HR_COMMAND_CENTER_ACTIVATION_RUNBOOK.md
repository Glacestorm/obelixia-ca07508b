# HR Command Center — Activation Runbook

**Aviso legal previo:** Este runbook **no autoriza uso oficial**. Solo autoriza activación **interna o demo controlada**. El panel sigue siendo herramienta de readiness interna, no de presentación oficial.

---

## 1. Condiciones previas para activar

Antes de activar el flag, verificar todo lo siguiente:

- [ ] Suite HR verde: `bunx vitest run src/__tests__/hr/` → **103/103 o superior**.
- [ ] Auditoría HR Security: **GREEN** (S6/S7/S8).
- [ ] PR revisado manualmente por responsable técnico.
- [ ] Entorno destino **no productivo** (demo interna, staging interno).
- [ ] Responsable de activación asignado y nombrado en el PR.
- [ ] Plan de rollback claro y documentado en el PR (ver §6).
- [ ] Validado que no hay clientes finales con acceso al entorno.

---

## 2. Cómo activar

### Cambio mínimo

1. Abrir PR dedicado.
2. Editar `src/components/erp/hr/command-center/featureFlag.ts`:

   ```ts
   // Antes
   export const HR_COMMAND_CENTER_ENABLED = false;

   // Después
   export const HR_COMMAND_CENTER_ENABLED = true;
   ```

### Prohibido en este PR

- **No** tocar variables de entorno (`.env`, env vars de despliegue).
- **No** tocar la base de datos (sin migraciones, sin seeds, sin BD flags).
- **No** tocar `HRNavigationMenu`.
- **No** tocar `HRModule`.
- **No** tocar RLS, edge functions, migraciones, `supabase/config.toml`.
- **No** activar `persisted_priority_apply`.
- **No** desbloquear C3B3C2.

---

## 3. Comandos de validación

Tras el cambio, ejecutar:

```bash
bunx vitest run src/__tests__/hr/
```

Si están disponibles en `package.json`:

```bash
bun run build
bun run lint
```

Si no existen esos scripts, ejecutar los comandos disponibles en `package.json` (`bun run <script>`).

**Criterio:** todos los comandos disponibles deben pasar antes de mergear.

---

## 4. Checklist visual

Tras desplegar el cambio en el entorno objetivo, navegar al dashboard ejecutivo HR y confirmar:

- [ ] El dashboard ejecutivo principal sigue funcionando exactamente igual que antes.
- [ ] Aparece, **al final** del dashboard, la sección con `data-testid="hr-command-center-mount"`.
- [ ] Visible badge **"Experimental · Internal readiness"**.
- [ ] Visible texto: *"Vista interna no oficial. No sustituye dashboards existentes."*
- [ ] Card VPT/S9 muestra estado `internal_ready` y disclaimer no-oficial.
- [ ] Card Legal/Compliance muestra disclaimer de revisión legal/laboral.
- [ ] Card Integraciones oficiales muestra disclaimer "Ningún estado equivale a presentación oficial…".
- [ ] Card Alertas & Bloqueos muestra top riesgos / top acciones / próximos deadlines.
- [ ] Acciones legales y oficiales muestran chip **"Revisión humana"**.
- [ ] **No** existen botones que envíen TGSS / SEPE / AEAT / SILTRA / DELT@.
- [ ] **No** aparece ninguna entrada nueva en `HRNavigationMenu`.
- [ ] Consola del navegador limpia (sin errores rojos).

---

## 5. Checklist legal

- [ ] No se presenta el panel como "oficial" en demos ni comunicaciones.
- [ ] No se utiliza para realizar envíos a TGSS / SEPE / AEAT / SILTRA / DELT@.
- [ ] No se utiliza como certificación jurídica frente a auditores externos.
- [ ] Cualquier output legal u oficial es revisado por un responsable humano antes de cualquier acción externa.
- [ ] Se mantiene el discurso "internal readiness" en todo material asociado.

---

## 6. Rollback

Procedimiento de rollback inmediato:

1. Revertir `featureFlag.ts`:

   ```ts
   export const HR_COMMAND_CENTER_ENABLED = false;
   ```

2. Ejecutar suite HR:

   ```bash
   bunx vitest run src/__tests__/hr/
   ```

3. Verificar en el entorno que **no** se renderiza `data-testid="hr-command-center-mount"`.
4. Confirmar que `useHRCommandCenter` no se llama (DevTools / Network).

**No** requiere migración ni rollback de base de datos. **No** requiere tocar RLS ni edge functions.

---

## 7. Criterios de bloqueo

Bloquear la activación (o disparar rollback inmediato) si se observa cualquiera de:

- Tests HR fallan (cualquiera bajo `src/__tests__/hr/`).
- Auditoría HR Security en estado distinto de GREEN.
- Aparece estado `accepted` / `submitted` / `official_ready` **sin evidencia / respuesta / certificado** en card de Integraciones oficiales.
- VPT/S9 aparece como `official` o `regulatory_ready` (debe ser siempre `internal_ready`).
- `useHRCommandCenter` se ejecuta con flag OFF (rotura del lazy import).
- Aparece entrada del Command Center en `HRNavigationMenu` u otro menú principal.
- Errores de consola del navegador asociados al panel.
- Cualquier escritura inesperada (insert/update/delete) detectada en logs.

---

## 8. Registro de activación

Cada activación debe registrarse en la siguiente tabla (añadir fila al final):

| Fecha | Responsable | Entorno | Commit | Tests HR | Resultado | Rollback (si aplica) |
|---|---|---|---|---|---|---|
| _YYYY-MM-DD_ | _Nombre_ | _demo-internal / staging_ | _sha_ | _103/103_ | _OK / KO_ | _N/A o sha_ |

---

## 9. Estado legal

- Este runbook **no autoriza uso oficial** del HR Command Center.
- Solo autoriza **activación interna o demo controlada** en entornos no productivos.
- El panel mantiene su naturaleza de **lectura interna de readiness**.
- Cualquier presentación, envío o certificación frente a organismos oficiales (TGSS, SEPE, AEAT, SILTRA, DELT@, etc.) queda **fuera del alcance** de este runbook y de este panel.
- Para uso oficial, se requiere un proceso separado (ver Fase 8 en `HR_COMMAND_CENTER_CLOSURE.md`) con conectores certificados, evidencia archivada y revisión legal específica.
