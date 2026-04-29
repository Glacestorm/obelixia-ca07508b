import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import type { UnifiedSearchFilters } from '@/hooks/erp/hr/useAgreementUnifiedSearch';

interface Props {
  loading?: boolean;
  onSearch: (filters: UnifiedSearchFilters) => void;
}

export function AgreementUnifiedSearch({ loading, onSearch }: Props) {
  const [text, setText] = useState('');
  const [internalCode, setInternalCode] = useState('');
  const [agreementCode, setAgreementCode] = useState('');
  const [cnae, setCnae] = useState('');
  const [sector, setSector] = useState('');
  const [province, setProvince] = useState('');
  const [ccaa, setCcaa] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      text: text || undefined,
      internal_code: internalCode || undefined,
      agreement_code: agreementCode || undefined,
      cnae: cnae || undefined,
      sector: sector || undefined,
      province: province || undefined,
      ccaa: ccaa || undefined,
    });
  };

  return (
    <Card data-testid="agreement-unified-search">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4" /> Buscador unificado de convenios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3">
            <Label htmlFor="ag-text">Texto libre</Label>
            <Input
              id="ag-text"
              placeholder="Nombre, código…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ag-internal">Internal code</Label>
            <Input id="ag-internal" value={internalCode} onChange={(e) => setInternalCode(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ag-agcode">Agreement code / REGCON</Label>
            <Input id="ag-agcode" value={agreementCode} onChange={(e) => setAgreementCode(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ag-cnae">CNAE</Label>
            <Input id="ag-cnae" value={cnae} onChange={(e) => setCnae(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ag-sector">Sector</Label>
            <Input id="ag-sector" value={sector} onChange={(e) => setSector(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ag-prov">Provincia</Label>
            <Input id="ag-prov" value={province} onChange={(e) => setProvince(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ag-ccaa">CCAA</Label>
            <Input id="ag-ccaa" value={ccaa} onChange={(e) => setCcaa(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Buscando…' : 'Buscar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default AgreementUnifiedSearch;