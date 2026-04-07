-- Run this in your Supabase SQL Editor

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT CHECK (role IN ('student', 'admin')) DEFAULT 'student',
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_type TEXT CHECK (plan_type IN ('mensal', 'trimestral', 'semestral', 'anual')),
  status TEXT CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'inactive',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Teacher Availability (Expediente)
CREATE TABLE IF NOT EXISTS public.teacher_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sun, 1=Mon, ..., 6=Sat
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INTEGER DEFAULT 60
);

-- 3.5 Recurring Classes (Aulas Fixas Mensais)
CREATE TABLE IF NOT EXISTS public.recurring_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

-- 4. Appointments Table (Scheduled classes)
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('scheduled', 'cancelled', 'completed')) DEFAULT 'scheduled',
  meet_link TEXT, -- Fallback, though we'll use a fixed link globally
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Settings Table (For the fixed Google Meet Link)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_meet_link TEXT NOT NULL DEFAULT 'https://meet.google.com/xxx-xxxx-xxx'
);
INSERT INTO public.settings (fixed_meet_link) VALUES ('https://meet.google.com/example-link');

-- Function to handle new user registration automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'student');

  -- Create an inactive subscription for the new student
  INSERT INTO public.subscriptions (student_id, status)
  VALUES (new.id, 'inactive');

  RETURN NEW;
END;
$$;

-- Trigger to call the function on sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Temporarily disable RLS for rapid development
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- 6. Messages Table (Club Penguin Style)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  msg_type TEXT CHECK (msg_type IN ('text', 'emoji')) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- 7. Posts Table (For the Dashboard Feed)
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- 8. SECURITY & RLS POLICIES
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check se o request vem de admin
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: Admin vê e edita todos / Estudante vê a si e pode ver admins (pro chat)
CREATE POLICY "Profiles view policy" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin() OR role = 'admin');
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Subscriptions: Admin full / Estudante lê a sua
CREATE POLICY "Subscriptions view policy" ON public.subscriptions FOR SELECT USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Subscriptions admin modify" ON public.subscriptions FOR ALL USING (public.is_admin());

-- Teacher Availability: Todos leem / Admin edita
CREATE POLICY "Teacher Availability view" ON public.teacher_availability FOR SELECT USING (true);
CREATE POLICY "Teacher Availability admin modify" ON public.teacher_availability FOR ALL USING (public.is_admin());

-- Recurring Classes: Aluno lê sua / Admin full
CREATE POLICY "Recurring view" ON public.recurring_classes FOR SELECT USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Recurring modify" ON public.recurring_classes FOR ALL USING (public.is_admin());

-- Appointments: Aluno le/marca suas próprias / Admin full
CREATE POLICY "Appointments view" ON public.appointments FOR SELECT USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Appointments insert" ON public.appointments FOR INSERT WITH CHECK (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Appointments delete" ON public.appointments FOR DELETE USING (student_id = auth.uid() OR public.is_admin());
CREATE POLICY "Appointments update" ON public.appointments FOR UPDATE USING (student_id = auth.uid() OR public.is_admin());

-- Settings: Todos leem / Admin modifica
CREATE POLICY "Settings view" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Settings modify" ON public.settings FOR ALL USING (public.is_admin());

-- Messages: Apenas remetente e destinatário podem interagir
CREATE POLICY "Messages view" ON public.messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR public.is_admin());
CREATE POLICY "Messages insert" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid() OR public.is_admin());

-- Posts: Todos leem / Apenas Admin altera
CREATE POLICY "Posts view" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Posts insert" ON public.posts FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Posts update/delete" ON public.posts FOR ALL USING (public.is_admin());

-- 9. ADMIN MASTER & MULTI-TEACHER UPGRADE
-- Modificar constraint de role em profiles para aceitar admin_master
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'admin_master'));

-- Adicionar teacher_id nas tabelas de agenda
ALTER TABLE public.teacher_availability ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.recurring_classes ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create helper function for admin_master
CREATE OR REPLACE FUNCTION public.is_admin_master() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update RLS policies to reflect teacher_id ownership for admins

-- Drop old teacher_availability policies
DROP POLICY IF EXISTS "Teacher Availability view" ON public.teacher_availability;
DROP POLICY IF EXISTS "Teacher Availability admin modify" ON public.teacher_availability;

-- Remake Teacher Availability rules
CREATE POLICY "Teacher Availability view" ON public.teacher_availability FOR SELECT USING (true);
CREATE POLICY "Teacher Availability admin modify" ON public.teacher_availability FOR ALL USING (teacher_id = auth.uid() OR public.is_admin_master());

-- Drop old Recurring policies
DROP POLICY IF EXISTS "Recurring view" ON public.recurring_classes;
DROP POLICY IF EXISTS "Recurring modify" ON public.recurring_classes;

-- Remake Recurring rules
CREATE POLICY "Recurring Classes view" ON public.recurring_classes FOR SELECT USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_admin_master());
CREATE POLICY "Recurring Classes modify" ON public.recurring_classes FOR ALL USING (teacher_id = auth.uid() OR public.is_admin_master());

-- Drop old Appointments policies
DROP POLICY IF EXISTS "Appointments view" ON public.appointments;
DROP POLICY IF EXISTS "Appointments insert" ON public.appointments;
DROP POLICY IF EXISTS "Appointments delete" ON public.appointments;
DROP POLICY IF EXISTS "Appointments update" ON public.appointments;

-- Remake Appointments rules
CREATE POLICY "Appointments view" ON public.appointments FOR SELECT USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_admin_master());
CREATE POLICY "Appointments insert" ON public.appointments FOR INSERT WITH CHECK (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_admin_master());
CREATE POLICY "Appointments delete" ON public.appointments FOR DELETE USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_admin_master());
CREATE POLICY "Appointments update" ON public.appointments FOR UPDATE USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.is_admin_master());
