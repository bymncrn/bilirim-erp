CREATE POLICY "Company can read own pdks documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pdks-documents' AND (storage.foldername(name))[1] = (public.current_company_id())::text);

CREATE POLICY "Company can upload own pdks documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pdks-documents' AND (storage.foldername(name))[1] = (public.current_company_id())::text);

CREATE POLICY "Company can update own pdks documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pdks-documents' AND (storage.foldername(name))[1] = (public.current_company_id())::text)
WITH CHECK (bucket_id = 'pdks-documents' AND (storage.foldername(name))[1] = (public.current_company_id())::text);

CREATE POLICY "Company can delete own pdks documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pdks-documents' AND (storage.foldername(name))[1] = (public.current_company_id())::text);