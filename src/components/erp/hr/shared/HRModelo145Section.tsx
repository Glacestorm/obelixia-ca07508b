/**
 * HRModelo145Section — Campos del Modelo 145 (Comunicación de datos al pagador)
 * Art. 88 Reglamento IRPF — Datos necesarios para el cálculo de retenciones
 * 
 * Secciones:
 * 1. Situación familiar y discapacidad del perceptor
 * 2. Hijos y descendientes (<25 años o discapacitados)
 * 3. Ascendientes (>65 años o discapacitados)
 * 4. Pensiones compensatorias y anualidades por alimentos
 * 5. Deducción vivienda habitual (pre-2013)
 * 6. Movilidad geográfica y rentas irregulares
 */

import { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import {
  Users, Heart, Home, MapPin, Plus, Trash2, AlertCircle, Baby, UserRound
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ======== TIPOS ========

export interface Descendant {
  birth_year: string;
  adoption_year?: string;
  disability_33_65: boolean;
  disability_65_plus: boolean;
  needs_help: boolean;
  sole_custody: boolean;  // cómputo por entero
}

export interface Ascendant {
  birth_year: string;
  disability_33_65: boolean;
  disability_65_plus: boolean;
  needs_help: boolean;
  other_descendants_count: string;  // nº descendientes con los que convive
}

export interface Modelo145Data {
  // 1. Situación familiar
  family_situation: '1' | '2' | '3' | '';
  spouse_nif: string;
  // Discapacidad del perceptor
  disability_degree: 'none' | '33_65' | '65_plus';
  disability_needs_help: boolean;
  // Movilidad geográfica
  geographic_mobility: boolean;
  mobility_date: string;
  // Rentas irregulares previas
  prior_irregular_income: boolean;
  // 2. Descendientes
  descendants: Descendant[];
  // 3. Ascendientes
  ascendants: Ascendant[];
  // 4. Pensiones y anualidades
  compensatory_pension: string;  // importe anual
  child_support: string;         // anualidades por alimentos
  // 5. Vivienda habitual
  housing_deduction: boolean;
  // Fecha comunicación M145
  communication_date: string;
}

export const EMPTY_MODELO145: Modelo145Data = {
  family_situation: '',
  spouse_nif: '',
  disability_degree: 'none',
  disability_needs_help: false,
  geographic_mobility: false,
  mobility_date: '',
  prior_irregular_income: false,
  descendants: [],
  ascendants: [],
  compensatory_pension: '',
  child_support: '',
  housing_deduction: false,
  communication_date: '',
};

const EMPTY_DESCENDANT: Descendant = {
  birth_year: '',
  adoption_year: '',
  disability_33_65: false,
  disability_65_plus: false,
  needs_help: false,
  sole_custody: false,
};

const EMPTY_ASCENDANT: Ascendant = {
  birth_year: '',
  disability_33_65: false,
  disability_65_plus: false,
  needs_help: false,
  other_descendants_count: '',
};

// ======== COMPONENTES AUXILIARES ========

function CheckboxField({ label, checked, onChange, className }: { label: string; checked: boolean; onChange: (v: boolean) => void; className?: string }) {
  return (
    <label className={cn("flex items-center gap-2 cursor-pointer text-xs", className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-input" />
      <span>{label}</span>
    </label>
  );
}

// ======== COMPONENTE PRINCIPAL ========

interface HRModelo145SectionProps {
  data: Modelo145Data;
  onChange: (data: Modelo145Data) => void;
  portalContainer?: HTMLElement | null;
}

export function HRModelo145Section({ data, onChange, portalContainer }: HRModelo145SectionProps) {
  const update = useCallback(<K extends keyof Modelo145Data>(field: K, value: Modelo145Data[K]) => {
    onChange({ ...data, [field]: value });
  }, [data, onChange]);

  // Descendants
  const addDescendant = () => update('descendants', [...data.descendants, { ...EMPTY_DESCENDANT }]);
  const removeDescendant = (i: number) => update('descendants', data.descendants.filter((_, idx) => idx !== i));
  const updateDescendant = (i: number, field: keyof Descendant, value: any) => {
    const next = [...data.descendants];
    next[i] = { ...next[i], [field]: value };
    onChange({ ...data, descendants: next });
  };

  // Ascendants
  const addAscendant = () => update('ascendants', [...data.ascendants, { ...EMPTY_ASCENDANT }]);
  const removeAscendant = (i: number) => update('ascendants', data.ascendants.filter((_, idx) => idx !== i));
  const updateAscendant = (i: number, field: keyof Ascendant, value: any) => {
    const next = [...data.ascendants];
    next[i] = { ...next[i], [field]: value };
    onChange({ ...data, ascendants: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800">
          Modelo 145
        </Badge>
        <span className="text-xs text-muted-foreground">Comunicación de datos al pagador (Art. 88 RIRPF)</span>
      </div>

      <Accordion type="multiple" defaultValue={['family']} className="w-full space-y-2">
        {/* ======== 1. SITUACIÓN FAMILIAR Y DISCAPACIDAD ======== */}
        <AccordionItem value="family" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              1. Situación familiar y discapacidad
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Situación familiar</Label>
              <Select value={data.family_situation || '__none'} onValueChange={(v) => update('family_situation', v === '__none' ? '' : v as any)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seleccionar situación" />
                </SelectTrigger>
                <SelectContent portalContainer={portalContainer} position="popper">
                  <SelectItem value="__none">Sin especificar</SelectItem>
                  <SelectItem value="1">
                    <span className="text-xs">1 - Soltero/a, viudo/a, divorciado/a con hijos a cargo exclusivo</span>
                  </SelectItem>
                  <SelectItem value="2">
                    <span className="text-xs">2 - Casado/a (cónyuge rentas ≤ 1.500€/año)</span>
                  </SelectItem>
                  <SelectItem value="3">
                    <span className="text-xs">3 - Otras situaciones</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {data.family_situation === '2' && (
              <div className="space-y-1.5">
                <Label className="text-xs">NIF del cónyuge</Label>
                <Input
                  value={data.spouse_nif}
                  onChange={(e) => update('spouse_nif', e.target.value)}
                  placeholder="12345678Z"
                  className="text-xs"
                  maxLength={9}
                />
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium">Discapacidad del perceptor</Label>
              <Select value={data.disability_degree} onValueChange={(v) => update('disability_degree', v as any)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portalContainer={portalContainer} position="popper">
                  <SelectItem value="none">Sin discapacidad reconocida</SelectItem>
                  <SelectItem value="33_65">≥ 33% e &lt; 65%</SelectItem>
                  <SelectItem value="65_plus">≥ 65%</SelectItem>
                </SelectContent>
              </Select>
              {data.disability_degree !== 'none' && (
                <CheckboxField
                  label="Necesidad acreditada de ayuda de terceras personas o movilidad reducida"
                  checked={data.disability_needs_help}
                  onChange={(v) => update('disability_needs_help', v)}
                />
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <CheckboxField
                label="Movilidad geográfica (traslado de municipio por aceptación de empleo)"
                checked={data.geographic_mobility}
                onChange={(v) => update('geographic_mobility', v)}
              />
              {data.geographic_mobility && (
                <div className="ml-6 space-y-1">
                  <Label className="text-xs">Fecha del traslado</Label>
                  <Input
                    type="date"
                    value={data.mobility_date}
                    onChange={(e) => update('mobility_date', e.target.value)}
                    className="text-xs w-48"
                  />
                </div>
              )}
            </div>

            <CheckboxField
              label="Ha percibido rentas irregulares (>2 años) en los 5 ejercicios anteriores con reducción Art. 18.2 LIRPF no aplicada en autoliquidación"
              checked={data.prior_irregular_income}
              onChange={(v) => update('prior_irregular_income', v)}
            />
          </AccordionContent>
        </AccordionItem>

        {/* ======== 2. HIJOS Y DESCENDIENTES ======== */}
        <AccordionItem value="descendants" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4 text-blue-500" />
              2. Hijos y descendientes
              {data.descendants.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{data.descendants.length}</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <p className="text-xs text-muted-foreground">
              Menores de 25 años (o mayores si discapacitados) que conviven con el perceptor y con rentas ≤ 8.000€/año.
            </p>

            {data.descendants.map((d, i) => (
              <div key={i} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Descendiente {i + 1}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeDescendant(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Año nacimiento</Label>
                    <Input
                      value={d.birth_year}
                      onChange={(e) => updateDescendant(i, 'birth_year', e.target.value)}
                      placeholder="2010"
                      className="text-xs"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Año adopción/acogimiento</Label>
                    <Input
                      value={d.adoption_year || ''}
                      onChange={(e) => updateDescendant(i, 'adoption_year', e.target.value)}
                      placeholder="(si aplica)"
                      className="text-xs"
                      maxLength={4}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <CheckboxField label="Discapacidad ≥ 33% e < 65%" checked={d.disability_33_65} onChange={(v) => updateDescendant(i, 'disability_33_65', v)} />
                  <CheckboxField label="Discapacidad ≥ 65%" checked={d.disability_65_plus} onChange={(v) => updateDescendant(i, 'disability_65_plus', v)} />
                  {(d.disability_33_65 || d.disability_65_plus) && (
                    <CheckboxField label="Necesidad de ayuda de terceras personas / movilidad reducida" checked={d.needs_help} onChange={(v) => updateDescendant(i, 'needs_help', v)} className="ml-4" />
                  )}
                  <CheckboxField label="Cómputo por entero (convive exclusivamente con el perceptor)" checked={d.sole_custody} onChange={(v) => updateDescendant(i, 'sole_custody', v)} />
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addDescendant} className="w-full text-xs">
              <Plus className="h-3 w-3 mr-1" /> Añadir descendiente
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ======== 3. ASCENDIENTES ======== */}
        <AccordionItem value="ascendants" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 text-purple-500" />
              3. Ascendientes
              {data.ascendants.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{data.ascendants.length}</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <p className="text-xs text-muted-foreground">
              Mayores de 65 años (o menores si discapacitados) que conviven ≥ 6 meses/año con rentas ≤ 8.000€/año.
            </p>

            {data.ascendants.map((a, i) => (
              <div key={i} className="p-3 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Ascendiente {i + 1}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAscendant(i)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Año nacimiento</Label>
                    <Input
                      value={a.birth_year}
                      onChange={(e) => updateAscendant(i, 'birth_year', e.target.value)}
                      placeholder="1950"
                      className="text-xs"
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nº descendientes convivientes</Label>
                    <Input
                      value={a.other_descendants_count}
                      onChange={(e) => updateAscendant(i, 'other_descendants_count', e.target.value)}
                      placeholder="(vacío si sólo Vd.)"
                      className="text-xs"
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <CheckboxField label="Discapacidad ≥ 33% e < 65%" checked={a.disability_33_65} onChange={(v) => updateAscendant(i, 'disability_33_65', v)} />
                  <CheckboxField label="Discapacidad ≥ 65%" checked={a.disability_65_plus} onChange={(v) => updateAscendant(i, 'disability_65_plus', v)} />
                  {(a.disability_33_65 || a.disability_65_plus) && (
                    <CheckboxField label="Necesidad de ayuda de terceras personas / movilidad reducida" checked={a.needs_help} onChange={(v) => updateAscendant(i, 'needs_help', v)} className="ml-4" />
                  )}
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" onClick={addAscendant} className="w-full text-xs">
              <Plus className="h-3 w-3 mr-1" /> Añadir ascendiente
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* ======== 4. PENSIONES Y ANUALIDADES ======== */}
        <AccordionItem value="pensions" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              4. Pensiones compensatorias y anualidades
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <p className="text-xs text-muted-foreground">
              Fijadas por resolución judicial.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pensión compensatoria al cónyuge (€/año)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.compensatory_pension}
                  onChange={(e) => update('compensatory_pension', e.target.value)}
                  placeholder="0.00"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Anualidades por alimentos a hijos (€/año)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={data.child_support}
                  onChange={(e) => update('child_support', e.target.value)}
                  placeholder="0.00"
                  className="text-xs"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ======== 5. DEDUCCIÓN VIVIENDA HABITUAL ======== */}
        <AccordionItem value="housing" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm font-medium py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-teal-500" />
              5. Deducción vivienda habitual
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <div className="flex items-start gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Solo aplicable a adquisiciones o rehabilitaciones anteriores al 01/01/2013 con financiación ajena
                y retribuciones íntegras &lt; 33.007,20€/año.
              </p>
            </div>
            <CheckboxField
              label="Efectúa pagos por préstamo de vivienda habitual con derecho a deducción"
              checked={data.housing_deduction}
              onChange={(v) => update('housing_deduction', v)}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Fecha comunicación */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="space-y-1">
          <Label className="text-xs">Fecha de comunicación del Modelo 145</Label>
          <Input
            type="date"
            value={data.communication_date}
            onChange={(e) => update('communication_date', e.target.value)}
            className="text-xs w-48"
          />
        </div>
        <p className="text-xs text-muted-foreground italic max-w-xs text-right">
          Art. 88 RIRPF — El perceptor debe comunicar variaciones en el plazo de 10 días.
        </p>
      </div>
    </div>
  );
}

export default HRModelo145Section;
