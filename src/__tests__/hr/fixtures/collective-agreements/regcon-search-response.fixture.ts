/**
 * B5C — REGCON search response fixture.
 *
 * REGCON does not expose a stable public REST API at this point; the
 * fetcher is wired in `manual_upload` mode and consumes pre-prepared
 * payloads. This fixture mimics what an operator would upload.
 */

export const REGCON_MANUAL_PAYLOAD_FIXTURE = {
  source: 'REGCON',
  uploadedAt: '2025-04-01T10:00:00Z',
  items: [
    {
      sourceId: 'REGCON-90001234',
      agreementCode: '90001234012025',
      officialName: 'Convenio colectivo de empresa Acme S.A.',
      publicationDate: '2025-02-20',
      documentUrl:
        'https://expinterweb.mites.gob.es/regcon/pub/convenio/90001234',
      jurisdictionCode: 'ES',
      scopeType: 'company',
      cnaeCodes: ['6201'],
    },
    {
      sourceId: 'REGCON-90005678',
      agreementCode: '90005678012025',
      officialName: 'Convenio colectivo de empresa Foo Holdings',
      publicationDate: '2025-04-01',
      jurisdictionCode: 'ES',
      scopeType: 'group',
    },
  ],
};
