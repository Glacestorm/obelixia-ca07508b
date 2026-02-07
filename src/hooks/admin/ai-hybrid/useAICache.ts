/**
 * useAICache - Sistema de caché inteligente para respuestas de IA
 * Reduce costes almacenando respuestas frecuentes
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

// === INTERFACES ===
export interface CacheEntry {
  id: string;
  promptHash: string;
  prompt: string;
  response: string;
  model: string;
  provider: string;
  tokensUsed: number;
  costSaved: number;
  hitCount: number;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CacheConfig {
  maxEntries: number;
  maxSizeBytes: number;
  defaultTTLMinutes: number;
  similarityThreshold: number;
  enableFuzzyMatch: boolean;
  persistToStorage: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalCostSaved: number;
  sizeBytes: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxEntries: 1000,
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  defaultTTLMinutes: 60 * 24, // 24 hours
  similarityThreshold: 0.85,
  enableFuzzyMatch: true,
  persistToStorage: true,
};

const STORAGE_KEY = 'ai_response_cache';
const STATS_KEY = 'ai_cache_stats';

// Simple hash function for prompt
function hashPrompt(prompt: string, model: string): string {
  const str = `${model}:${prompt.toLowerCase().trim()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Normalize prompt for better matching
function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

// Calculate similarity between two strings (Jaccard similarity on words)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(normalizePrompt(str1).split(' '));
  const words2 = new Set(normalizePrompt(str2).split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Calculate size in bytes
function calculateSize(obj: unknown): number {
  return new Blob([JSON.stringify(obj)]).size;
}

// === HOOK ===
export function useAICache() {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  const [config, setConfig] = useState<CacheConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<CacheStats>({
    totalEntries: 0,
    totalHits: 0,
    totalMisses: 0,
    hitRate: 0,
    totalCostSaved: 0,
    sizeBytes: 0,
    oldestEntry: null,
    newestEntry: null,
  });
  
  const statsRef = useRef(stats);
  statsRef.current = stats;

  // === LOAD FROM STORAGE ===
  const loadFromStorage = useCallback(() => {
    if (!config.persistToStorage) return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedStats = localStorage.getItem(STATS_KEY);
      
      if (stored) {
        const entries: [string, CacheEntry][] = JSON.parse(stored);
        const now = new Date();
        
        // Filter out expired entries
        const validEntries = entries.filter(([, entry]) => 
          new Date(entry.expiresAt) > now
        );
        
        setCache(new Map(validEntries.map(([key, entry]) => [
          key,
          {
            ...entry,
            createdAt: new Date(entry.createdAt),
            lastAccessedAt: new Date(entry.lastAccessedAt),
            expiresAt: new Date(entry.expiresAt),
          }
        ])));
      }
      
      if (storedStats) {
        const parsed = JSON.parse(storedStats);
        setStats(prev => ({
          ...prev,
          ...parsed,
          oldestEntry: parsed.oldestEntry ? new Date(parsed.oldestEntry) : null,
          newestEntry: parsed.newestEntry ? new Date(parsed.newestEntry) : null,
        }));
      }
    } catch (err) {
      console.error('[useAICache] loadFromStorage error:', err);
    }
  }, [config.persistToStorage]);

  // === SAVE TO STORAGE ===
  const saveToStorage = useCallback(() => {
    if (!config.persistToStorage) return;
    
    try {
      const entries = Array.from(cache.entries());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      localStorage.setItem(STATS_KEY, JSON.stringify(statsRef.current));
    } catch (err) {
      console.error('[useAICache] saveToStorage error:', err);
    }
  }, [cache, config.persistToStorage]);

  // === GET FROM CACHE ===
  const get = useCallback((
    prompt: string,
    model: string
  ): CacheEntry | null => {
    const hash = hashPrompt(prompt, model);
    const exact = cache.get(hash);
    
    if (exact && new Date(exact.expiresAt) > new Date()) {
      // Update hit count and last accessed
      const updated = {
        ...exact,
        hitCount: exact.hitCount + 1,
        lastAccessedAt: new Date(),
      };
      cache.set(hash, updated);
      
      setStats(prev => ({
        ...prev,
        totalHits: prev.totalHits + 1,
        hitRate: (prev.totalHits + 1) / (prev.totalHits + prev.totalMisses + 1),
        totalCostSaved: prev.totalCostSaved + exact.costSaved / exact.hitCount,
      }));
      
      return updated;
    }
    
    // Try fuzzy match
    if (config.enableFuzzyMatch) {
      let bestMatch: CacheEntry | null = null;
      let bestSimilarity = 0;
      
      for (const entry of cache.values()) {
        if (entry.model !== model) continue;
        if (new Date(entry.expiresAt) <= new Date()) continue;
        
        const similarity = calculateSimilarity(prompt, entry.prompt);
        if (similarity >= config.similarityThreshold && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = entry;
        }
      }
      
      if (bestMatch) {
        const updated = {
          ...bestMatch,
          hitCount: bestMatch.hitCount + 1,
          lastAccessedAt: new Date(),
        };
        cache.set(bestMatch.promptHash, updated);
        
        setStats(prev => ({
          ...prev,
          totalHits: prev.totalHits + 1,
          hitRate: (prev.totalHits + 1) / (prev.totalHits + prev.totalMisses + 1),
          totalCostSaved: prev.totalCostSaved + bestMatch.costSaved / bestMatch.hitCount,
        }));
        
        return updated;
      }
    }
    
    // Cache miss
    setStats(prev => ({
      ...prev,
      totalMisses: prev.totalMisses + 1,
      hitRate: prev.totalHits / (prev.totalHits + prev.totalMisses + 1),
    }));
    
    return null;
  }, [cache, config]);

  // === SET IN CACHE ===
  const set = useCallback((
    prompt: string,
    response: string,
    options: {
      model: string;
      provider: string;
      tokensUsed: number;
      costPerToken: number;
      ttlMinutes?: number;
      metadata?: Record<string, unknown>;
    }
  ): CacheEntry => {
    const hash = hashPrompt(prompt, options.model);
    const now = new Date();
    const ttl = options.ttlMinutes || config.defaultTTLMinutes;
    
    const entry: CacheEntry = {
      id: crypto.randomUUID(),
      promptHash: hash,
      prompt,
      response,
      model: options.model,
      provider: options.provider,
      tokensUsed: options.tokensUsed,
      costSaved: options.tokensUsed * options.costPerToken,
      hitCount: 0,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + ttl * 60 * 1000),
      metadata: options.metadata,
    };
    
    // Check size limits
    const newSize = calculateSize(entry);
    let currentSize = calculateSize(Array.from(cache.values()));
    
    // Evict old entries if necessary
    if (cache.size >= config.maxEntries || currentSize + newSize > config.maxSizeBytes) {
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime());
      
      while (
        (cache.size >= config.maxEntries || currentSize + newSize > config.maxSizeBytes) &&
        entries.length > 0
      ) {
        const [key, evicted] = entries.shift()!;
        cache.delete(key);
        currentSize -= calculateSize(evicted);
      }
    }
    
    cache.set(hash, entry);
    
    setStats(prev => ({
      ...prev,
      totalEntries: cache.size,
      sizeBytes: currentSize + newSize,
      oldestEntry: prev.oldestEntry || now,
      newestEntry: now,
    }));
    
    return entry;
  }, [cache, config]);

  // === INVALIDATE ===
  const invalidate = useCallback((promptHash?: string, model?: string) => {
    if (promptHash) {
      cache.delete(promptHash);
    } else if (model) {
      for (const [key, entry] of cache.entries()) {
        if (entry.model === model) {
          cache.delete(key);
        }
      }
    } else {
      cache.clear();
    }
    
    setStats(prev => ({
      ...prev,
      totalEntries: cache.size,
      sizeBytes: calculateSize(Array.from(cache.values())),
    }));
    
    saveToStorage();
  }, [cache, saveToStorage]);

  // === CLEAR EXPIRED ===
  const clearExpired = useCallback(() => {
    const now = new Date();
    let removed = 0;
    
    for (const [key, entry] of cache.entries()) {
      if (new Date(entry.expiresAt) <= now) {
        cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      setStats(prev => ({
        ...prev,
        totalEntries: cache.size,
        sizeBytes: calculateSize(Array.from(cache.values())),
      }));
      saveToStorage();
    }
    
    return removed;
  }, [cache, saveToStorage]);

  // === UPDATE CONFIG ===
  const updateConfig = useCallback((updates: Partial<CacheConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // === GET TOP CACHED ===
  const getTopCached = useCallback((limit: number = 10): CacheEntry[] => {
    return Array.from(cache.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);
  }, [cache]);

  // === LOAD ON MOUNT ===
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // === PERIODIC CLEANUP ===
  useEffect(() => {
    const interval = setInterval(() => {
      clearExpired();
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [clearExpired]);

  // === SAVE ON CHANGE ===
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveToStorage();
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [cache, saveToStorage]);

  return {
    // Cache operations
    get,
    set,
    invalidate,
    clearExpired,
    
    // Config
    config,
    updateConfig,
    
    // Stats
    stats,
    getTopCached,
    
    // State
    cacheSize: cache.size,
  };
}

export default useAICache;
