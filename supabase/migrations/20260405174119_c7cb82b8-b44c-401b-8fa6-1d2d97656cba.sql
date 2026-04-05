-- Add is_approved column to profiles (default false for new registrations)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT false;

-- Set all existing users as approved
UPDATE public.profiles SET is_approved = true WHERE is_approved = false;

-- Create policy: superadmins can update approval status
CREATE POLICY "Superadmins can update user approval"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'superadmin'
  )
);