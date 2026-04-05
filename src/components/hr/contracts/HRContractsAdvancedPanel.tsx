/**
 * HRContractsAdvancedPanel — Panel avanzado de contratos
 * Bounded context HR — no toca HRContractsPanel del ERP legacy
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FileText, RefreshCw, CheckCircle, Clock, AlertTriangle, Ban,
  ArrowRightLeft, ShieldCheck, CalendarClock, ArrowLeft, CalendarIcon,
  ClipboardSignature, Save,
} from 'lucide-react';
import { useHRContracts, type HRContractAdvanced } from '@/hooks/hr/useHRContracts';
import { canExtendContract, SS_BONUS_CATALOG } from '@/lib/hr/contractEngine';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  draft: { label: 'Borrador', color: 'bg-muted text-muted-foreground', icon: Clock },
  active: { label: 'Activo', color: 'bg-primary/10 text-primary', icon: CheckCircle },
  extended: { label: 'Prorrogado', color: 'bg-amber-500/10 text-amber-600', icon: CalendarClock },
  suspended: { label: 'Suspendido', color: 'bg-orange-500/10 text-orange-600', icon: AlertTriangle },
  terminated: { label: 'Finalizado', color: 'bg-muted text-muted-foreground', icon: Ban },
};

/* ─── Jornada Inicial Section ─── */
function JornadaInicialSection() {
  const [initialHours, setInitialHours] = useState('');
  const [initialType, setInitialType] = useState('');
  const [initialCoeff, setInitialCoeff] = useState('');
  const [initialEndDate, setInitialEndDate] = useState<Date | undefined>();

  return (
    <div className="space-y-3 p-3 rounded-lg border border-dashed border-primary/20 bg-primary/5">
      <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">
        Jornada inicial (al inicio de la relación laboral)
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Nro. horas jornada inicial</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            placeholder="0"
            value={initialHours}
            onChange={e => setInitialHours(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo jornada inicial</Label>
          <Select value={initialType} onValueChange={setInitialType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="completa">Completa</SelectItem>
              <SelectItem value="parcial-manana">Parcial-mañana</SelectItem>
              <SelectItem value="parcial-tarde">Parcial-tarde</SelectItem>
              <SelectItem value="irregular">Irregular</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Coeficiente jornada inicial</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.01}
            placeholder="0.00 – 1.00"
            value={initialCoeff}
            onChange={e => setInitialCoeff(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha fin prevista jornada inicial</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-8 w-full justify-start text-left text-xs font-normal',
                  !initialEndDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {initialEndDate ? format(initialEndDate, 'dd/MM/yyyy') : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={initialEndDate}
                onSelect={setInitialEndDate}
                locale={es}
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

/* ─── Cláusula en Contrat@ Section ─── */
function ClausulaContratSection() {
  const [clauseText, setClauseText] = useState('');
  const [clauseType, setClauseType] = useState('');
  const [signDate, setSignDate] = useState<Date | undefined>();
  const [docRef, setDocRef] = useState('');

  const charCount = clauseText.length;
  const maxChars = 2000;

  const handleSave = () => {
    toast.success('Cláusula guardada (requiere integración con firma digital)');
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Texto de la cláusula</Label>
          <span className={cn(
            'text-[10px]',
            charCount > maxChars ? 'text-destructive' : 'text-muted-foreground',
          )}>
            {charCount}/{maxChars}
          </span>
        </div>
        <Textarea
          placeholder="Redacte el contenido de la cláusula..."
          value={clauseText}
          onChange={e => setClauseText(e.target.value.slice(0, maxChars))}
          className="min-h-[100px] text-xs"
          maxLength={maxChars}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Tipo de cláusula</Label>
          <Select value={clauseType} onValueChange={setClauseType}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no_competencia">No competencia</SelectItem>
              <SelectItem value="confidencialidad">Confidencialidad</SelectItem>
              <SelectItem value="dedicacion_exclusiva">Dedicación exclusiva</SelectItem>
              <SelectItem value="permanencia">Permanencia</SelectItem>
              <SelectItem value="otra">Otra</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fecha firma cláusula</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'h-8 w-full justify-start text-left text-xs font-normal',
                  !signDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {signDate ? format(signDate, 'dd/MM/yyyy') : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={signDate}
                onSelect={setSignDate}
                locale={es}
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Referencia documento</Label>
        <Input
          placeholder="Ej: CLU-2026-001"
          value={docRef}
          onChange={e => setDocRef(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <Button size="sm" className="w-full text-xs" onClick={handleSave}>
        <Save className="h-3 w-3 mr-1" />
        Guardar cláusula
      </Button>
    </div>
  );
}

/* ─── Contract Detail View ─── */
function ContractDetail({ contract, onBack }: { contract: HRContractAdvanced; onBack: () => void }) {
  const [detailTab, setDetailTab] = useState('info');
  const status = contract.status || (contract.is_active ? 'active' : 'terminated');
  const cfg = statusConfig[status] || statusConfig.active;
  const isPartTime = !!contract.part_time_coefficient || contract.workday_type === 'parcial';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium flex-1">
          {contract.contract_code || contract.contract_type}
        </span>
        <Badge className={cn('text-[10px]', cfg.color)}>{cfg.label}</Badge>
      </div>

      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList className="grid w-full grid-cols-3 mb-3">
          <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
          <TabsTrigger value="jornada" className="text-xs">Jornada</TabsTrigger>
          <TabsTrigger value="clausula" className="text-xs flex items-center gap-1">
            <ClipboardSignature className="h-3 w-3" />
            Cláusula en Contrat@
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-0">
          <ScrollArea className="h-[340px]">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] uppercase text-muted-foreground">Inicio</span>
                  <span className="font-medium">{contract.start_date}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-muted-foreground">Fin</span>
                  <span className="font-medium">{contract.end_date ?? '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-muted-foreground">Salario base</span>
                  <span className="font-medium">
                    {contract.base_salary?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-muted-foreground">Jornada actual</span>
                  <span className="font-medium">
                    {contract.part_time_coefficient
                      ? `${(contract.part_time_coefficient * 100).toFixed(1)}%`
                      : contract.workday_type ?? 'Completa'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-muted-foreground">Categoría</span>
                  <span className="font-medium">{contract.category ?? '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-muted-foreground">Grupo profesional</span>
                  <span className="font-medium">{contract.professional_group ?? '—'}</span>
                </div>
              </div>
              {contract.notes && (
                <>
                  <Separator />
                  <div className="text-xs">
                    <span className="block text-[10px] uppercase text-muted-foreground mb-1">Notas</span>
                    <p className="text-muted-foreground">{contract.notes}</p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="jornada" className="mt-0">
          <ScrollArea className="h-[340px]">
            <div className="space-y-4">
              {/* Current part-time info */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tiempo parcial actual
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="block text-[10px] uppercase text-muted-foreground">Coeficiente</span>
                    <span className="font-medium">
                      {contract.part_time_coefficient
                        ? `${(contract.part_time_coefficient * 100).toFixed(1)}%`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-muted-foreground">Horas semanales</span>
                    <span className="font-medium">{contract.working_hours ?? '—'}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Jornada inicial block */}
              <JornadaInicialSection />

              {!isPartTime && (
                <p className="text-[10px] text-muted-foreground italic">
                  La jornada inicial es relevante cuando el contrato comenzó con una jornada distinta a la actual.
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="clausula" className="mt-0">
          <ScrollArea className="h-[340px]">
            <ClausulaContratSection />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Contract Row (clickable) ─── */
function ContractRow({ c, onSelect }: { c: HRContractAdvanced; onSelect: () => void }) {
  const status = c.status || (c.is_active ? 'active' : 'terminated');
  const cfg = statusConfig[status] || statusConfig.active;
  const Icon = cfg.icon;
  const extCheck = canExtendContract(c.contract_type, c.extension_count ?? 0, c.start_date, c.end_date ?? null);
  const bonus = c.ss_bonus_code ? SS_BONUS_CATALOG.find(b => b.code === c.ss_bonus_code) : null;

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors space-y-2 cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">
            {c.contract_code || c.contract_type}
          </span>
          {c.ta2_movement_code && (
            <Badge variant="outline" className="text-[9px]">
              TA.2: {c.ta2_movement_code}
            </Badge>
          )}
        </div>
        <Badge className={cn('text-[10px]', cfg.color)}>{cfg.label}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="block text-[10px] uppercase">Inicio</span>
          <span className="font-medium text-foreground">{c.start_date}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Fin</span>
          <span className="font-medium text-foreground">{c.end_date ?? '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Salario base</span>
          <span className="font-medium text-foreground">
            {c.base_salary?.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) ?? '—'}
          </span>
        </div>
        <div>
          <span className="block text-[10px] uppercase">Jornada</span>
          <span className="font-medium text-foreground">
            {c.part_time_coefficient
              ? `${(c.part_time_coefficient * 100).toFixed(1)}%`
              : c.workday_type ?? 'Completa'}
          </span>
        </div>
      </div>

      {/* Advanced info */}
      <div className="flex flex-wrap gap-1.5">
        {(c.extension_count ?? 0) > 0 && (
          <Badge variant="secondary" className="text-[9px]">
            <CalendarClock className="h-3 w-3 mr-1" />
            {c.extension_count} prórroga(s)
          </Badge>
        )}
        {bonus && (
          <Badge variant="secondary" className="text-[9px]">
            <ShieldCheck className="h-3 w-3 mr-1" />
            {bonus.label} ({bonus.percentage}%)
          </Badge>
        )}
        {c.conversion_from_contract_id && (
          <Badge variant="secondary" className="text-[9px]">
            <ArrowRightLeft className="h-3 w-3 mr-1" />
            Conversión
          </Badge>
        )}
        {c.maternity_reserve_until && (
          <Badge variant="secondary" className="text-[9px]">
            Reserva hasta {c.maternity_reserve_until}
          </Badge>
        )}
        {extCheck.allowed && status === 'active' && (
          <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
            Prorrogable
          </Badge>
        )}
      </div>
    </div>
  );
}

export function HRContractsAdvancedPanel() {
  const [tab, setTab] = useState('all');
  const [selectedContract, setSelectedContract] = useState<HRContractAdvanced | null>(null);
  const { contracts, isLoading, refetch } = useHRContracts();

  const active = contracts.filter(c => c.is_active || c.status === 'active');
  const withBonus = contracts.filter(c => c.ss_bonus_code);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Contratos Avanzados
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
        {!selectedContract && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="p-2 rounded bg-primary/5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Activos</p>
              <p className="text-lg font-bold">{active.length}</p>
            </div>
            <div className="p-2 rounded bg-amber-500/5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Con bonificación</p>
              <p className="text-lg font-bold">{withBonus.length}</p>
            </div>
            <div className="p-2 rounded bg-muted text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Total</p>
              <p className="text-lg font-bold">{contracts.length}</p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-2">
        {selectedContract ? (
          <ContractDetail
            contract={selectedContract}
            onBack={() => setSelectedContract(null)}
          />
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-3 mb-3">
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="active" className="text-xs">Activos</TabsTrigger>
              <TabsTrigger value="bonus" className="text-xs">Bonificados</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <ContractsList contracts={contracts} isLoading={isLoading} onSelect={setSelectedContract} />
            </TabsContent>
            <TabsContent value="active" className="mt-0">
              <ContractsList contracts={active} isLoading={isLoading} onSelect={setSelectedContract} />
            </TabsContent>
            <TabsContent value="bonus" className="mt-0">
              <ContractsList contracts={withBonus} isLoading={isLoading} onSelect={setSelectedContract} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function ContractsList({
  contracts,
  isLoading,
  onSelect,
}: {
  contracts: HRContractAdvanced[];
  isLoading: boolean;
  onSelect: (c: HRContractAdvanced) => void;
}) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground text-sm">Cargando contratos...</div>;
  }
  if (contracts.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No hay contratos</div>;
  }
  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {contracts.map(c => (
          <ContractRow key={c.id} c={c} onSelect={() => onSelect(c)} />
        ))}
      </div>
    </ScrollArea>
  );
}

export default HRContractsAdvancedPanel;
