
-- Storage bucket for energy module documents (invoices, contracts PDFs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('energy-documents', 'energy-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for energy-documents bucket
CREATE POLICY "energy_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'energy-documents');

CREATE POLICY "energy_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'energy-documents');

CREATE POLICY "energy_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'energy-documents');

CREATE POLICY "energy_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'energy-documents');
