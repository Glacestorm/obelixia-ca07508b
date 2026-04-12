import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowUpDown, 
  Search, 
  RefreshCw, 
  ArrowDownCircle, 
  ArrowUpCircle,
  Receipt
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  description: string | null;
  counterparty_name: string | null;
  amount: number;
  transaction_date: string;
  category_name: string | null;
  status: string | null;
  currency: string | null;
}

interface TransactionsListProps {
  companyId: string;
}

const PAGE_SIZE = 25;

function formatAmount(amount: number, currency?: string | null): string {
  const abs = Math.abs(amount);
  const cur = currency || 'EUR';
  try {
    return abs.toLocaleString('es-ES', {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
    });
  } catch {
    return `${abs.toFixed(2)} ${cur}`;
  }
}

export function TransactionsList({ companyId }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const fetchTransactions = useCallback(async (pageNum: number, search: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('erp_bank_transactions')
        .select('id, description, counterparty_name, amount, transaction_date, category_name, status, currency', { count: 'exact' })
        .eq('company_id', companyId)
        .order('transaction_date', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.or(`description.ilike.%${search}%,counterparty_name.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setTransactions(data as Transaction[] || []);
      setTotalCount(count);
      setHasMore(((pageNum + 1) * PAGE_SIZE) < (count || 0));
    } catch (err) {
      console.error('[TransactionsList] fetch error:', err);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    setPage(0);
    fetchTransactions(0, searchTerm);
  }, [companyId, fetchTransactions, searchTerm]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchTransactions(newPage, searchTerm);
  };

  const totalPages = totalCount != null ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  // Loading skeleton
  if (isLoading && transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            Movimientos bancarios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-primary" />
            Movimientos bancarios
            {totalCount != null && (
              <Badge variant="secondary" className="ml-1 text-xs font-normal">
                {totalCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fetchTransactions(page, searchTerm)}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descripción o contraparte..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Empty state */}
        {!isLoading && transactions.length === 0 && (
          <div className="py-12 text-center">
            <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              {searchTerm ? 'Sin resultados para esta búsqueda' : 'No hay movimientos registrados'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {searchTerm ? 'Prueba con otros términos' : 'Los movimientos aparecerán aquí cuando se importen'}
            </p>
          </div>
        )}

        {/* Transaction rows */}
        {transactions.length > 0 && (
          <div className={cn("divide-y", isLoading && "opacity-60 pointer-events-none")}>
            {transactions.map((tx) => {
              const isPositive = tx.amount >= 0;
              const label = tx.counterparty_name || tx.description || 'Movimiento';
              const subtitle = tx.description && tx.counterparty_name ? tx.description : null;

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 gap-4"
                >
                  {/* Left: icon + text */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "mt-0.5 p-1.5 rounded-md shrink-0",
                      isPositive ? "bg-green-500/10" : "bg-red-500/10"
                    )}>
                      {isPositive
                        ? <ArrowDownCircle className="h-4 w-4 text-green-600" />
                        : <ArrowUpCircle className="h-4 w-4 text-red-600" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(tx.transaction_date), 'dd MMM yyyy', { locale: es })}
                        </span>
                        {tx.category_name && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-xs text-muted-foreground">{tx.category_name}</span>
                          </>
                        )}
                        {subtitle && (
                          <>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{subtitle}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: amount */}
                  <span className={cn(
                    "text-sm font-semibold tabular-nums whitespace-nowrap",
                    isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {isPositive ? '+' : '−'} {formatAmount(tx.amount, tx.currency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Pág. {page + 1} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={page === 0 || isLoading}
                onClick={() => handlePageChange(page - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={!hasMore || isLoading}
                onClick={() => handlePageChange(page + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TransactionsList;
