
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Calculator, CheckCircle, AlertTriangle, FileText, 
  ArrowRight, Save, RotateCcw, BookOpen 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface DatasetDocument {
  type: 'factura_compra' | 'factura_venta' | 'banco' | 'nomina' | 'amortizacion';
  date: string;
  concept: string;
  amount?: number;
  base?: number;
  iva?: number;
  total?: number;
  provider?: string;
  client?: string;
  flow?: 'in' | 'out';
}

interface JournalEntryLine {
  account: string;
  debit: number;
  credit: number;
}

interface JournalEntry {
  id: string;
  date: string;
  concept: string;
  lines: JournalEntryLine[];
}

interface SimulationState {
  entries: JournalEntry[];
  score?: number;
  feedback?: any;
}

export const AccountingSimulator = ({ lessonId, datasetId }: { lessonId: string, datasetId?: string }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState<DatasetDocument[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [currentEntry, setCurrentEntry] = useState<JournalEntry>({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    concept: '',
    lines: [
      { account: '', debit: 0, credit: 0 },
      { account: '', debit: 0, credit: 0 }
    ]
  });
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  // Load dataset
  useEffect(() => {
    if (!datasetId) return;
    
    const loadDataset = async () => {
      const { data, error } = await supabase
        .from('academia_simulator_datasets')
        .select('data')
        .eq('id', datasetId)
        .single();
        
      if (data?.data && (data.data as any).documents) {
        setDocuments((data.data as any).documents);
      }
    };
    
    loadDataset();
  }, [datasetId]);

  // Calculations for Ledger and Balance Sheet
  const ledger = useMemo(() => {
    const accs: Record<string, { debit: number, credit: number, balance: number }> = {};
    
    entries.forEach(entry => {
      entry.lines.forEach(line => {
        if (!accs[line.account]) accs[line.account] = { debit: 0, credit: 0, balance: 0 };
        accs[line.account].debit += line.debit;
        accs[line.account].credit += line.credit;
        accs[line.account].balance = accs[line.account].debit - accs[line.account].credit;
      });
    });
    
    return accs;
  }, [entries]);

  const trialBalance = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    Object.values(ledger).forEach(acc => {
      totalDebit += acc.debit;
      totalCredit += acc.credit;
    });
    return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
  }, [ledger]);

  // Handlers
  const addLine = () => {
    setCurrentEntry(prev => ({
      ...prev,
      lines: [...prev.lines, { account: '', debit: 0, credit: 0 }]
    }));
  };

  const updateLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    const newLines = [...currentEntry.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setCurrentEntry(prev => ({ ...prev, lines: newLines }));
  };

  const saveEntry = () => {
    const totalDebit = currentEntry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = currentEntry.lines.reduce((sum, l) => sum + Number(l.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error(`El asiento no cuadra. Descuadre: ${(totalDebit - totalCredit).toFixed(2)}€`);
      return;
    }

    if (currentEntry.lines.some(l => !l.account)) {
      toast.error('Faltan cuentas contables');
      return;
    }

    setEntries(prev => [...prev, currentEntry]);
    setCurrentEntry({
      id: crypto.randomUUID(),
      date: currentEntry.date,
      concept: '',
      lines: [
        { account: '', debit: 0, credit: 0 },
        { account: '', debit: 0, credit: 0 }
      ]
    });
    toast.success('Asiento registrado');
  };

  const validateWithAI = async () => {
    if (!datasetId) return;
    setIsValidating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('erp-accounting-supervisor', {
        body: {
          action: 'validate_entries',
          journal_entries: entries,
          dataset_id: datasetId
        }
      });

      if (error) throw error;
      
      setFeedback(data);
      if (data.score >= 80) {
        toast.success(`¡Excelente! Puntuación: ${data.score}/100`);
      } else {
        toast.warning(`Revisa los errores. Puntuación: ${data.score}/100`);
      }
    } catch (err) {
      console.error('Error validating:', err);
      toast.error('Error al validar el ejercicio');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Left Panel: Documents & Feedback */}
      <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documentación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.map((doc, idx) => (
              <div key={idx} className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline">{doc.type.replace('_', ' ').toUpperCase()}</Badge>
                  <span className="text-xs text-muted-foreground">{doc.date}</span>
                </div>
                <p className="font-medium text-sm">{doc.concept || `Factura ${doc.provider || doc.client}`}</p>
                <div className="mt-2 text-right font-mono font-bold text-primary">
                  {doc.total ? doc.total.toFixed(2) : doc.amount?.toFixed(2)}€
                </div>
                {doc.base && (
                  <div className="text-xs text-right text-muted-foreground">
                    Base: {doc.base} | IVA: {doc.iva}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {feedback && (
          <Card className={feedback.score >= 50 ? "border-green-500/50" : "border-red-500/50"}>
            <CardHeader>
              <CardTitle className="text-lg flex justify-between">
                Resultado Corrección
                <Badge variant={feedback.score >= 50 ? "default" : "destructive"}>
                  {feedback.score}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-4">{feedback.feedback_general}</p>
              {feedback.errors?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Errores detectados:</h4>
                  {feedback.errors.map((err: any, i: number) => (
                    <div key={i} className="text-xs p-2 bg-red-50 dark:bg-red-900/20 text-red-600 rounded">
                      <span className="font-bold">Asiento {err.entry_index + 1}:</span> {err.message}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Panel: Simulator Workspace */}
      <div className="lg:col-span-2 flex flex-col h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start border-b rounded-none px-4 bg-background">
            <TabsTrigger value="journal">Libro Diario</TabsTrigger>
            <TabsTrigger value="ledger">Libro Mayor</TabsTrigger>
            <TabsTrigger value="balance">Balance Sumas y Saldos</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4 bg-muted/10">
            <TabsContent value="journal" className="space-y-6 mt-0">
              {/* Entry Input Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Nuevo Asiento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>Fecha</Label>
                      <Input type="date" value={currentEntry.date} onChange={e => setCurrentEntry({...currentEntry, date: e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label>Concepto</Label>
                      <Input placeholder="Descripción del asiento..." value={currentEntry.concept} onChange={e => setCurrentEntry({...currentEntry, concept: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground mb-1 px-1">
                      <div className="col-span-2">Cuenta (3-4 dígitos)</div>
                      <div className="col-span-3">Debe</div>
                      <div className="col-span-3">Haber</div>
                    </div>
                    
                    {currentEntry.lines.map((line, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2">
                          <Input 
                            placeholder="572" 
                            maxLength={4}
                            value={line.account} 
                            onChange={e => updateLine(i, 'account', e.target.value)} 
                            className="font-mono"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={line.debit || ''} 
                            onChange={e => updateLine(i, 'debit', parseFloat(e.target.value))} 
                            className={line.debit > 0 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" : ""}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={line.credit || ''} 
                            onChange={e => updateLine(i, 'credit', parseFloat(e.target.value))}
                            className={line.credit > 0 ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200" : ""}
                          />
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" onClick={addLine} className="text-xs text-muted-foreground hover:text-primary">
                      + Añadir línea
                    </Button>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="text-xs font-mono text-muted-foreground">
                      Total Debe: {currentEntry.lines.reduce((s, l) => s + l.debit, 0).toFixed(2)} | 
                      Total Haber: {currentEntry.lines.reduce((s, l) => s + l.credit, 0).toFixed(2)}
                    </div>
                    <Button onClick={saveEntry} size="sm" className="gap-2">
                      <Save className="h-4 w-4" /> Registrar Asiento
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Journal History */}
              <div className="space-y-4">
                {entries.map((entry, idx) => (
                  <div key={entry.id} className="bg-card border rounded-lg p-4 text-sm shadow-sm">
                    <div className="flex justify-between mb-2 text-xs text-muted-foreground font-medium border-b pb-2">
                      <span>Asiento #{idx + 1} - {entry.date}</span>
                      <span>{entry.concept}</span>
                    </div>
                    {entry.lines.map((line, lIdx) => (
                      <div key={lIdx} className="grid grid-cols-12 gap-4 py-1 hover:bg-muted/50">
                        <div className="col-span-2 font-mono text-muted-foreground">{line.account}</div>
                        <div className="col-span-6">{/* Account Name Placeholder */}</div>
                        <div className="col-span-2 text-right font-mono">{line.debit > 0 ? line.debit.toFixed(2) : '-'}</div>
                        <div className="col-span-2 text-right font-mono">{line.credit > 0 ? line.credit.toFixed(2) : '-'}</div>
                      </div>
                    ))}
                  </div>
                ))}
                
                {entries.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground italic">
                    No hay asientos registrados. Utiliza el formulario superior.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ledger" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(ledger).sort().map(([acc, data]) => (
                  <Card key={acc} className="overflow-hidden">
                    <div className="bg-muted px-3 py-2 text-center font-bold font-mono border-b">
                      Cuenta {acc}
                    </div>
                    <div className="grid grid-cols-2 divide-x h-32">
                      <div className="p-2">
                        <div className="text-xs text-muted-foreground text-center border-b mb-1">DEBE</div>
                        <div className="text-right font-mono text-sm">{data.debit > 0 ? data.debit.toFixed(2) : ''}</div>
                      </div>
                      <div className="p-2">
                        <div className="text-xs text-muted-foreground text-center border-b mb-1">HABER</div>
                        <div className="text-right font-mono text-sm">{data.credit > 0 ? data.credit.toFixed(2) : ''}</div>
                      </div>
                    </div>
                    <div className="bg-muted/50 px-3 py-2 flex justify-between text-sm border-t">
                      <span className="text-muted-foreground">Saldo:</span>
                      <span className={`font-bold font-mono ${data.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {Math.abs(data.balance).toFixed(2)} {data.balance >= 0 ? 'D' : 'H'}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="balance" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    Balance de Sumas y Saldos
                    {!trialBalance.balanced && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> Descuadre
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cuenta</TableHead>
                        <TableHead className="text-right">Sumas Debe</TableHead>
                        <TableHead className="text-right">Sumas Haber</TableHead>
                        <TableHead className="text-right">Saldo Deudor</TableHead>
                        <TableHead className="text-right">Saldo Acreedor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(ledger).sort().map(([acc, data]) => (
                        <TableRow key={acc}>
                          <TableCell className="font-mono font-medium">{acc}</TableCell>
                          <TableCell className="text-right font-mono">{data.debit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">{data.credit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {data.balance > 0 ? data.balance.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {data.balance < 0 ? Math.abs(data.balance).toFixed(2) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell>TOTALES</TableCell>
                        <TableCell className="text-right font-mono">{trialBalance.totalDebit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{trialBalance.totalCredit.toFixed(2)}</TableCell>
                        <TableCell colSpan={2} className="text-center text-xs text-muted-foreground">
                          {trialBalance.balanced ? 'CUADRADO' : 'DESCUADRADO'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          <div className="border-t p-4 bg-background flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {entries.length} asientos registrados
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEntries([])} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Reiniciar
              </Button>
              <Button 
                onClick={validateWithAI} 
                disabled={isValidating || entries.length === 0} 
                className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {isValidating ? (
                  <>Analizando...</>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" /> Validar Ejercicio con IA
                  </>
                )}
              </Button>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
