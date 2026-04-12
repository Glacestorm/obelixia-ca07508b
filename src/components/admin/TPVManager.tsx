import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CreditCard, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface TPVStats {
  terminal_id: string;
  terminal_identifier: string;
  provider: string;
  company_name: string;
  monthly_volume: number;
  commission_rate: number;
  is_active: boolean;
}

export function TPVManager() {
  const [stats, setStats] = useState<TPVStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTPVStats();
  }, []);

  const fetchTPVStats = async () => {
    try {
      setLoading(true);

      const { data: terminals, error: terminalsError } = await supabase
        .from('company_tpv_terminals')
        .select(`
          id,
          terminal_id,
          provider,
          monthly_volume,
          commission_rate,
          status,
          company_id
        `)
        .order('monthly_volume', { ascending: false });

      if (terminalsError) throw terminalsError;

      // Fetch company names
      const companyIds = [...new Set((terminals || []).map(t => t.company_id))];
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .in('id', companyIds);

      if (companiesError) throw companiesError;

      const companiesMap = new Map(companies?.map(c => [c.id, c.name]));

      // Combine data
      const statsData: TPVStats[] = (terminals || []).map((terminal) => ({
        terminal_id: terminal.id,
        terminal_identifier: terminal.terminal_id || '',
        provider: terminal.provider || '',
        company_name: companiesMap.get(terminal.company_id) || 'Desconocida',
        monthly_volume: terminal.monthly_volume || 0,
        commission_rate: terminal.commission_rate || 0,
        is_active: terminal.status === 'active',
      }));

      setStats(statsData);
    } catch (error) {
      console.error('Error fetching TPV stats:', error);
      toast.error('Error al cargar estadísticas de TPV');
    } finally {
      setLoading(false);
    }
  };

  const filteredStats = stats.filter((stat) => {
    if (filterProvider !== 'all' && stat.provider !== filterProvider) return false;
    if (searchTerm && !stat.company_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !stat.terminal_identifier.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getTotalMonthlyVolume = () => {
    return filteredStats.reduce((sum, stat) => sum + stat.monthly_volume, 0);
  };

  const getAverageCommission = () => {
    const activeTerminals = filteredStats.filter(s => s.is_active);
    if (activeTerminals.length === 0) return '0.00';
    const total = activeTerminals.reduce((sum, stat) => sum + stat.commission_rate, 0);
    return (total / activeTerminals.length).toFixed(2);
  };

  // Derive unique providers for filter
  const uniqueProviders = [...new Set(stats.map(s => s.provider).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Terminales</CardDescription>
            <CardTitle className="text-3xl">{filteredStats.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Volumen Mensual Total</CardDescription>
            <CardTitle className="text-2xl">
              {getTotalMonthlyVolume().toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Volumen Anual Estimado</CardDescription>
            <CardTitle className="text-2xl">
              {(getTotalMonthlyVolume() * 12).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comisión Media</CardDescription>
            <CardTitle className="text-3xl">{getAverageCommission()}%</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Terminales activos: {filteredStats.filter(s => s.is_active).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gestión de Terminales TPV
          </CardTitle>
          <CardDescription>Vista global de todos los terminales del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-4">
            <Input
              placeholder="Buscar por empresa o terminal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Select value={filterProvider} onValueChange={setFilterProvider}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proveedores</SelectItem>
                {uniqueProviders.map((provider) => (
                  <SelectItem key={provider} value={provider}>{provider}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Terminal</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="text-right">Vol. Mensual</TableHead>
                <TableHead className="text-right">Vol. Anual (est.)</TableHead>
                <TableHead className="text-right">Comisión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No se encontraron terminales
                  </TableCell>
                </TableRow>
              ) : (
                filteredStats.map((stat) => (
                  <TableRow key={stat.terminal_id}>
                    <TableCell>
                      <Badge variant={stat.is_active ? "default" : "secondary"}>
                        {stat.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{stat.company_name}</TableCell>
                    <TableCell>{stat.terminal_identifier}</TableCell>
                    <TableCell>{stat.provider || 'N/A'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {stat.monthly_volume.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {(stat.monthly_volume * 12).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">{stat.commission_rate}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
