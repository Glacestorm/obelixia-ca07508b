import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DollarSign, Gift, Zap, BookOpen, Crown, Repeat, Plus, Save } from 'lucide-react';

const TIER_TYPES = [
  { value: 'lead_magnet', label: 'Lead Magnet', icon: Gift, price: '0€', color: 'bg-green-500/10' },
  { value: 'tripwire', label: 'Tripwire', icon: Zap, price: '9-29€', color: 'bg-blue-500/10' },
  { value: 'core', label: 'Curso Core', icon: BookOpen, price: '99-499€', color: 'bg-violet-500/10' },
  { value: 'premium', label: 'Premium/Cohorte', icon: Crown, price: '800-3000€', color: 'bg-amber-500/10' },
  { value: 'subscription', label: 'Continuidad', icon: Repeat, price: '15-79€/mes', color: 'bg-emerald-500/10' },
];

export function PricingLadderDesigner() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [tiers, setTiers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('academia_courses').select('id, title').order('title').then(({ data }) => { if (data) setCourses(data); });
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    supabase.from('academia_pricing_tiers').select('*').eq('course_id', selectedCourse).order('order_index').then(({ data }) => {
      if (data) setTiers(data);
    });
  }, [selectedCourse]);

  const addTier = async (tierType: string) => {
    if (!selectedCourse) return;
    const info = TIER_TYPES.find(t => t.value === tierType);
    const { error } = await supabase.from('academia_pricing_tiers').insert([{
      course_id: selectedCourse, tier_name: info?.label || tierType, tier_type: tierType,
      price: 0, order_index: tiers.length
    }] as any);
    if (error) { toast.error('Error'); return; }
    toast.success('Nivel añadido');
    supabase.from('academia_pricing_tiers').select('*').eq('course_id', selectedCourse).order('order_index').then(({ data }) => { if (data) setTiers(data); });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500">
          <DollarSign className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Escalera de Precios</h2>
          <p className="text-sm text-muted-foreground">Diseña tu product ladder: de gratis a premium</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger><SelectValue placeholder="Selecciona un curso..." /></SelectTrigger>
            <SelectContent>
              {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Visual Ladder */}
      <div className="flex flex-col gap-3">
        {TIER_TYPES.map((tier, i) => {
          const existing = tiers.find(t => t.tier_type === tier.value);
          return (
            <Card key={tier.value} className={`${tier.color} border-l-4 border-l-primary/50`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <tier.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{tier.label}</p>
                    <p className="text-xs text-muted-foreground">Rango: {tier.price}</p>
                  </div>
                </div>
                {existing ? (
                  <Badge>{existing.price}€</Badge>
                ) : selectedCourse ? (
                  <Button size="sm" variant="outline" onClick={() => addTier(tier.value)}>
                    <Plus className="h-3 w-3 mr-1" /> Añadir
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default PricingLadderDesigner;
