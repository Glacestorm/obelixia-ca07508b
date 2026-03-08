import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MarketplaceExtension {
  id: string;
  extension_key: string;
  extension_name: string;
  short_description: string | null;
  description: string | null;
  author_name: string;
  author_id: string | null;
  developer_id: string | null;
  category: string;
  target_module: string | null;
  version: string;
  icon_url: string | null;
  screenshots: string[];
  price: number;
  is_free: boolean;
  is_featured: boolean;
  is_verified: boolean;
  is_published: boolean;
  rating_average: number;
  rating_count: number;
  download_count: number;
  tags: string[];
  changelog: string | null;
  requirements: Record<string, unknown>;
  compatibility_info: Record<string, unknown>;
  revenue_share_percent: number;
  created_at: string;
  updated_at: string;
}

export interface ExtensionReview {
  id: string;
  extension_id: string;
  user_id: string;
  user_name: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  helpful_count: number;
  is_verified_purchase: boolean;
  created_at: string;
}

export interface MarketplaceDeveloper {
  id: string;
  user_id: string;
  developer_name: string;
  company_name: string | null;
  email: string;
  total_extensions: number;
  total_revenue: number;
  total_downloads: number;
  is_verified: boolean;
  status: string;
}

export interface MarketplaceStats {
  total_extensions: number;
  total_developers: number;
  total_purchases: number;
  total_revenue: number;
  platform_revenue: number;
}

interface ExtensionFilters {
  category?: string;
  target_module?: string;
  is_free?: boolean;
  search?: string;
  featured_only?: boolean;
}

export function useMarketplaceExtensions() {
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>([]);
  const [selectedExtension, setSelectedExtension] = useState<MarketplaceExtension | null>(null);
  const [reviews, setReviews] = useState<ExtensionReview[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExtensions = useCallback(async (filters?: ExtensionFilters) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'list_extensions', filters },
      });
      if (fnError) throw fnError;
      if (data?.success) {
        setExtensions(data.extensions || []);
        return data.extensions;
      }
      throw new Error(data?.error || 'Failed to fetch extensions');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      console.error('[useMarketplaceExtensions] fetchExtensions:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchExtensionDetail = useCallback(async (extensionId: string) => {
    setIsLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'get_extension', extension_id: extensionId },
      });
      if (fnError) throw fnError;
      if (data?.success) {
        setSelectedExtension(data.extension);
        setReviews(data.reviews || []);
        return { extension: data.extension, reviews: data.reviews, hasPurchased: data.has_purchased };
      }
      return null;
    } catch (err) {
      console.error('[useMarketplaceExtensions] fetchDetail:', err);
      toast.error('Error al cargar detalle de extensión');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const installExtension = useCallback(async (extensionId: string, installationId?: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'install_extension', extension_id: extensionId, installation_id: installationId },
      });
      if (fnError) throw fnError;
      if (data?.success) {
        toast.success('Extensión instalada correctamente');
        return true;
      }
      if (data?.requires_purchase) {
        toast.info(`Esta extensión requiere compra (${data.price}€)`);
        return false;
      }
      throw new Error(data?.error);
    } catch (err) {
      console.error('[useMarketplaceExtensions] install:', err);
      toast.error('Error al instalar extensión');
      return false;
    }
  }, []);

  const uninstallExtension = useCallback(async (extensionId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'uninstall_extension', extension_id: extensionId },
      });
      if (fnError) throw fnError;
      if (data?.success) {
        toast.success('Extensión desinstalada');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[useMarketplaceExtensions] uninstall:', err);
      toast.error('Error al desinstalar extensión');
      return false;
    }
  }, []);

  const purchaseExtension = useCallback(async (extensionId: string, installationId?: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'process_payment', extension_id: extensionId, installation_id: installationId },
      });
      if (fnError) throw fnError;
      if (data?.success) {
        toast.success(`Compra realizada — Developer: ${data.revenue_split.developer}€ | Plataforma: ${data.revenue_split.platform}€`);
        return data;
      }
      return null;
    } catch (err) {
      console.error('[useMarketplaceExtensions] purchase:', err);
      toast.error('Error al procesar compra');
      return null;
    }
  }, []);

  const submitReview = useCallback(async (extensionId: string, reviewData: { rating: number; title?: string; content?: string }) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'submit_review', extension_id: extensionId, review_data: reviewData },
      });
      if (fnError) throw fnError;
      if (data?.success) {
        toast.success('Reseña publicada');
        return data.review;
      }
      return null;
    } catch (err) {
      console.error('[useMarketplaceExtensions] submitReview:', err);
      toast.error('Error al publicar reseña');
      return null;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('marketplace-manager', {
        body: { action: 'get_stats' },
      });
      if (fnError) throw fnError;
      if (data?.success) {
        setStats(data.stats);
        return data.stats;
      }
      return null;
    } catch (err) {
      console.error('[useMarketplaceExtensions] fetchStats:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchExtensions();
    fetchStats();
  }, [fetchExtensions, fetchStats]);

  return {
    extensions,
    selectedExtension,
    reviews,
    stats,
    isLoading,
    error,
    fetchExtensions,
    fetchExtensionDetail,
    installExtension,
    uninstallExtension,
    purchaseExtension,
    submitReview,
    fetchStats,
    setSelectedExtension,
  };
}

export default useMarketplaceExtensions;
