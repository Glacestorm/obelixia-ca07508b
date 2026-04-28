import { describe, expect, it, vi } from 'vitest';

import {
  computeSourceDocumentFingerprint,
  fetchBoeAgreementMetadata,
  fetchBoibAgreementMetadata,
  fetchRegconAgreementMetadata,
  type AgreementSourceHttpAdapter,
} from '@/engines/erp/hr/collectiveAgreementsSourceFetchers';

import { BOE_SEARCH_RESPONSE_FIXTURE } from './fixtures/collective-agreements/boe-search-response.fixture';
import { BOIB_SEARCH_RESPONSE_FIXTURE } from './fixtures/collective-agreements/boib-search-response.fixture';
import { REGCON_MANUAL_PAYLOAD_FIXTURE } from './fixtures/collective-agreements/regcon-search-response.fixture';

function makeMockAdapter(
  response: { status: number; body: unknown }
): { adapter: AgreementSourceHttpAdapter; spy: ReturnType<typeof vi.fn> } {
  const spy = vi.fn().mockResolvedValue(response);
  return {
    adapter: { get: spy as unknown as AgreementSourceHttpAdapter['get'] },
    spy,
  };
}

describe('B5C — collectiveAgreementsSourceFetchers', () => {
  describe('BOE fetcher', () => {
    it('produces RawAgreementMetadata[] from BOE fixture via mock adapter', async () => {
      const { adapter, spy } = makeMockAdapter(BOE_SEARCH_RESPONSE_FIXTURE);
      const result = await fetchBoeAgreementMetadata(
        { source: 'BOE', query: 'convenio colectivo' },
        adapter
      );
      expect(spy).toHaveBeenCalledOnce();
      expect(result.source).toBe('BOE');
      expect(result.sourceAccessMode).toBe('http_adapter');
      // Two valid agreement entries, two noise entries filtered out.
      expect(result.items.length).toBe(2);
      expect(result.items[0].source).toBe('BOE');
      expect(result.items[0].agreementCode).toBe('99000005011981');
      expect(result.warnings.some((w) => w.startsWith('BOE_FILTERED_NON_AGREEMENT_ITEMS'))).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('does not invent CNAE or vigencia when the source omits them', async () => {
      const { adapter } = makeMockAdapter(BOE_SEARCH_RESPONSE_FIXTURE);
      const result = await fetchBoeAgreementMetadata(
        { source: 'BOE' },
        adapter
      );
      const securityItem = result.items.find((i) => i.sourceId === 'BOE-A-2025-67890');
      expect(securityItem).toBeDefined();
      expect(securityItem?.cnaeCodes).toBeUndefined();
      expect(securityItem?.effectiveStartDate).toBeUndefined();
      expect(securityItem?.effectiveEndDate).toBeUndefined();
    });

    it('falls back to manual_upload mode when no adapter is provided', async () => {
      const result = await fetchBoeAgreementMetadata({ source: 'BOE' });
      expect(result.sourceAccessMode).toBe('manual_upload');
      expect(result.items).toEqual([]);
      expect(result.warnings).toContain('SOURCE_REQUIRES_MANUAL_CONNECTOR_VALIDATION');
    });

    it('returns errors on non-200 HTTP status', async () => {
      const { adapter } = makeMockAdapter({ status: 503, body: null });
      const result = await fetchBoeAgreementMetadata(
        { source: 'BOE' },
        adapter
      );
      expect(result.items).toEqual([]);
      expect(result.errors[0]?.reason).toBe('BOE_HTTP_NON_200');
    });
  });

  describe('BOIB fetcher', () => {
    it('produces RawAgreementMetadata[] for Baleares from BOIB fixture', async () => {
      const { adapter } = makeMockAdapter(BOIB_SEARCH_RESPONSE_FIXTURE);
      const result = await fetchBoibAgreementMetadata(
        { source: 'BOIB' },
        adapter
      );
      expect(result.items.length).toBe(3);
      const codes = result.items.map((i) => i.agreementCode);
      expect(codes).toEqual(
        expect.arrayContaining(['COM-GEN-IB', 'PAN-PAST-IB', 'HOST-IB'])
      );
      expect(result.items.every((i) => i.autonomousRegion === 'IB')).toBe(true);
      // The subvenciones noise row must be filtered out.
      expect(
        result.items.find((i) => i.officialName.toLowerCase().includes('subvenc'))
      ).toBeUndefined();
    });

    it('falls back to manual_upload when no adapter is provided', async () => {
      const result = await fetchBoibAgreementMetadata({ source: 'BOIB' });
      expect(result.sourceAccessMode).toBe('manual_upload');
      expect(result.warnings).toContain('SOURCE_REQUIRES_MANUAL_CONNECTOR_VALIDATION');
    });
  });

  describe('REGCON fetcher', () => {
    it('warns about manual connector when no manualPayload is provided', async () => {
      const result = await fetchRegconAgreementMetadata({ source: 'REGCON' });
      expect(result.sourceAccessMode).toBe('manual_upload');
      expect(result.items).toEqual([]);
      expect(result.warnings).toContain('SOURCE_REQUIRES_MANUAL_CONNECTOR_VALIDATION');
      expect(result.warnings).toContain('REGCON_NO_PUBLIC_API_USE_MANUAL_UPLOAD');
    });

    it('parses items when an operator supplies a manual payload', async () => {
      const result = await fetchRegconAgreementMetadata({
        source: 'REGCON',
        manualPayload: REGCON_MANUAL_PAYLOAD_FIXTURE,
      });
      expect(result.items.length).toBe(2);
      expect(result.items[0].source).toBe('REGCON');
      expect(result.items[0].agreementCode).toBe('90001234012025');
      expect(result.items[0].cnaeCodes).toEqual(['6201']);
      // Item without cnae must NOT have one invented.
      expect(result.items[1].cnaeCodes).toBeUndefined();
    });
  });

  describe('No real network in tests', () => {
    it('does not call global fetch when only adapter is used', async () => {
      const realFetch = globalThis.fetch;
      const fetchSpy = vi.fn();
      // Replace global fetch with a spy to assert it is never called.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = fetchSpy;
      try {
        const { adapter } = makeMockAdapter(BOE_SEARCH_RESPONSE_FIXTURE);
        await fetchBoeAgreementMetadata({ source: 'BOE' }, adapter);
        await fetchBoibAgreementMetadata(
          { source: 'BOIB' },
          (await makeMockAdapter(BOIB_SEARCH_RESPONSE_FIXTURE)).adapter
        );
        await fetchRegconAgreementMetadata({
          source: 'REGCON',
          manualPayload: REGCON_MANUAL_PAYLOAD_FIXTURE,
        });
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (globalThis as any).fetch = realFetch;
      }
    });
  });

  describe('computeSourceDocumentFingerprint', () => {
    it('is deterministic for identical input', () => {
      const a = computeSourceDocumentFingerprint({
        title: 'Convenio X',
        publicationDate: '2025-01-01',
        documentUrl: 'https://example.com/a.pdf',
      });
      const b = computeSourceDocumentFingerprint({
        title: 'Convenio X',
        publicationDate: '2025-01-01',
        documentUrl: 'https://example.com/a.pdf',
      });
      expect(a).toBe(b);
      expect(a.startsWith('fnv1a32:')).toBe(true);
    });

    it('changes when the title changes', () => {
      const a = computeSourceDocumentFingerprint({
        title: 'Convenio X',
        publicationDate: '2025-01-01',
        sourceUrl: 'https://example.com/x',
      });
      const b = computeSourceDocumentFingerprint({
        title: 'Convenio Y',
        publicationDate: '2025-01-01',
        sourceUrl: 'https://example.com/x',
      });
      expect(a).not.toBe(b);
    });

    it('changes when the publicationDate changes', () => {
      const a = computeSourceDocumentFingerprint({
        title: 'Convenio X',
        publicationDate: '2025-01-01',
      });
      const b = computeSourceDocumentFingerprint({
        title: 'Convenio X',
        publicationDate: '2025-02-01',
      });
      expect(a).not.toBe(b);
    });

    it('changes when the documentUrl changes', () => {
      const a = computeSourceDocumentFingerprint({
        title: 'Convenio X',
        documentUrl: 'https://example.com/a.pdf',
      });
      const b = computeSourceDocumentFingerprint({
        title: 'Convenio X',
        documentUrl: 'https://example.com/b.pdf',
      });
      expect(a).not.toBe(b);
    });

    it('does not depend solely on publication_url (sourceUrl)', () => {
      const onlyUrlA = computeSourceDocumentFingerprint({
        sourceUrl: 'https://example.com/a',
      });
      const onlyUrlB = computeSourceDocumentFingerprint({
        sourceUrl: 'https://example.com/a',
        title: 'Different title',
      });
      // Same sourceUrl, different title → fingerprint must differ.
      expect(onlyUrlA).not.toBe(onlyUrlB);
    });
  });
});
