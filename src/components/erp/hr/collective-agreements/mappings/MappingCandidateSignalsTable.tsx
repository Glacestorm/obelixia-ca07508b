/**
 * B10C.2B.2C — Renders candidate signals (e.g., from B10C.2A preview).
 * Read-only. No payroll, no bridge, no flag.
 */
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface MappingCandidateSignal {
  key: string;
  label: string;
  value: string | number | boolean | null;
  weight?: number;
}

export function MappingCandidateSignalsTable({
  signals,
}: {
  signals: MappingCandidateSignal[];
}) {
  if (!signals || signals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic" data-testid="mapping-signals-empty">
        Sin signals asociadas a este candidato.
      </p>
    );
  }
  return (
    <Table data-testid="mapping-signals-table">
      <TableHeader>
        <TableRow>
          <TableHead>Signal</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead className="text-right">Peso</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {signals.map((s) => (
          <TableRow key={s.key} data-testid={`mapping-signal-${s.key}`}>
            <TableCell className="font-medium">{s.label}</TableCell>
            <TableCell>{String(s.value ?? '—')}</TableCell>
            <TableCell className="text-right">{s.weight ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default MappingCandidateSignalsTable;