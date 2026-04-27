/**
 * CASUISTICA-FECHAS-01 — Fase C3B3A
 * Tests del panel de conflictos local vs persistido.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HRCasuisticaConflictsPanel } from '../HRCasuisticaConflictsPanel';
import type { EffectiveResult } from '@/lib/hr/effectiveCasuistica';

function emptyResult(): EffectiveResult {
  return {
    effective: {
      enabled: true,
      pnrDias: 0,
      itAtDias: 0,
      reduccionJornadaPct: 0,
      atrasosITImporte: 0,
      atrasosITPeriodo: '',
      nacimientoTipo: 'paternidad',
      nacimientoDias: 0,
      nacimientoImporte: 0,
      periodFechaDesde: '',
      periodFechaHasta: '',
      periodDiasNaturales: 30,
      periodDiasEfectivos: 30,
      periodMotivo: 'mes_completo',
    },
    conflicts: [],
    sourceMap: {},
    appliedTraces: [],
    ignoredLocal: [],
    unmappedInformative: [],
    blockingForClose: false,
  };
}

describe('HRCasuisticaConflictsPanel — C3B3A', () => {
  it('no renderiza si no hay conflictos ni unmapped ni blockingForClose', () => {
    const { container } = render(
      <HRCasuisticaConflictsPanel result={emptyResult()} mode="persisted_priority" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza banner y tabla con conflicto PNR', () => {
    const result: EffectiveResult = {
      ...emptyResult(),
      conflicts: [
        {
          field: 'pnrDias',
          process: 'pnr',
          localValue: 3,
          persistedValue: 5,
          resolvedSource: 'persisted',
          legalReviewRequired: false,
          rationale: 'Persisted priority',
        },
      ],
      ignoredLocal: [
        { field: 'pnrDias', value: 3, reason: 'Local ignorado en cálculo.' },
      ],
    };
    render(<HRCasuisticaConflictsPanel result={result} mode="persisted_priority" />);
    expect(
      screen.getByText(/datos locales y procesos persistidos/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Vista informativa/i)).toBeInTheDocument();
    expect(screen.getAllByText(/PNR/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Persistido prioridad/i)).toBeInTheDocument();
    // local ignorado
    expect(screen.getByText(/Local ignorado en cálculo/i)).toBeInTheDocument();
  });

  it('muestra fuente propuesta para cada conflicto', () => {
    const result: EffectiveResult = {
      ...emptyResult(),
      conflicts: [
        {
          field: 'reduccionJornadaPct',
          process: 'reduccion',
          localValue: 50,
          persistedValue: 30,
          resolvedSource: 'persisted',
          legalReviewRequired: false,
          rationale: 'r',
        },
      ],
    };
    render(<HRCasuisticaConflictsPanel result={result} mode="persisted_priority" />);
    expect(screen.getByText(/Reducción jornada/i)).toBeInTheDocument();
    expect(screen.getByText(/Persistido prioridad/i)).toBeInTheDocument();
  });

  it('muestra unmapped como "No aplicado al motor"', () => {
    const result: EffectiveResult = {
      ...emptyResult(),
      unmappedInformative: [
        {
          source: 'payroll_incidents',
          recordId: 'desp-1',
          incidentType: 'desplazamiento_temporal',
        },
      ],
    };
    render(<HRCasuisticaConflictsPanel result={result} mode="persisted_priority" />);
    expect(screen.getByText(/No aplicado al cálculo/i)).toBeInTheDocument();
    expect(screen.getByText(/No aplicado al motor/i)).toBeInTheDocument();
    expect(screen.getByText(/desplazamiento_temporal/i)).toBeInTheDocument();
  });

  it('muestra badge "Requiere revisión legal" cuando aplica', () => {
    const result: EffectiveResult = {
      ...emptyResult(),
      conflicts: [
        {
          field: 'pnrDias',
          process: 'pnr',
          localValue: 1,
          persistedValue: 1,
          resolvedSource: 'persisted',
          legalReviewRequired: true,
          rationale: 'r',
        },
      ],
    };
    render(<HRCasuisticaConflictsPanel result={result} mode="persisted_priority" />);
    expect(screen.getAllByText(/Requiere revisión legal/i).length).toBeGreaterThan(0);
  });

  it('NO incluye botones que muten datos', () => {
    const result: EffectiveResult = {
      ...emptyResult(),
      conflicts: [
        {
          field: 'pnrDias',
          process: 'pnr',
          localValue: 3,
          persistedValue: 5,
          resolvedSource: 'persisted',
          legalReviewRequired: false,
          rationale: 'r',
        },
      ],
    };
    render(<HRCasuisticaConflictsPanel result={result} mode="persisted_priority" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('HRCasuisticaConflictsPanel — C3B3B-paso1 (modo visual)', () => {
  function withConflict(): EffectiveResult {
    return {
      ...emptyResult(),
      conflicts: [
        {
          field: 'pnrDias',
          process: 'pnr',
          localValue: 3,
          persistedValue: 5,
          resolvedSource: 'persisted',
          legalReviewRequired: false,
          rationale: 'Persisted priority',
        },
      ],
    };
  }

  it('en local_only muestra "Fuente aplicada al cálculo: Local"', () => {
    render(
      <HRCasuisticaConflictsPanel
        result={withConflict()}
        mode="persisted_priority"
        effectiveMode="local_only"
      />,
    );
    expect(screen.getByTestId('mode-banner-local-only')).toBeInTheDocument();
    expect(
      screen.getByText(/Fuente aplicada al cálculo: Local/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Fuente aplicada al cálculo/i)).toBeInTheDocument();
    // En la fila debe aparecer "Local aplicado" como fuente real.
    expect(screen.getAllByText(/Local aplicado/i).length).toBeGreaterThan(0);
  });

  it('en persisted_priority_preview indica que el cálculo sigue usando local', () => {
    render(
      <HRCasuisticaConflictsPanel
        result={withConflict()}
        mode="persisted_priority"
        effectiveMode="persisted_priority_preview"
      />,
    );
    expect(screen.getByTestId('mode-banner-preview')).toBeInTheDocument();
    expect(
      screen.getByText(/el\s+cálculo sigue usando datos locales/i),
    ).toBeInTheDocument();
    // Fuente aplicada real sigue siendo "Local aplicado" + badge "Vista preview".
    expect(screen.getAllByText(/Local aplicado/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Vista preview/i)).toBeInTheDocument();
  });

  it('en persisted_priority_apply muestra badge "Persistido aplicado" SOLO visualmente', () => {
    render(
      <HRCasuisticaConflictsPanel
        result={withConflict()}
        mode="persisted_priority"
        effectiveMode="persisted_priority_apply"
      />,
    );
    expect(screen.getByTestId('mode-banner-apply')).toBeInTheDocument();
    expect(screen.getByText(/no está activado en esta fase/i)).toBeInTheDocument();
    expect(screen.getByText(/Persistido aplicado/i)).toBeInTheDocument();
  });

  it('la columna "Fuente aplicada al cálculo" existe en la cabecera', () => {
    render(
      <HRCasuisticaConflictsPanel
        result={withConflict()}
        mode="persisted_priority"
        effectiveMode="local_only"
      />,
    );
    expect(
      screen.getByRole('columnheader', { name: /Fuente aplicada al cálculo/i }),
    ).toBeInTheDocument();
  });

  it('unmapped sigue mostrándose como "No aplicado al motor" en cualquier modo', () => {
    const result: EffectiveResult = {
      ...emptyResult(),
      unmappedInformative: [
        {
          source: 'payroll_incidents',
          recordId: 'desp-1',
          incidentType: 'desplazamiento_temporal',
        },
      ],
    };
    render(
      <HRCasuisticaConflictsPanel
        result={result}
        mode="persisted_priority"
        effectiveMode="persisted_priority_apply"
      />,
    );
    expect(screen.getByText(/No aplicado al motor/i)).toBeInTheDocument();
  });
});