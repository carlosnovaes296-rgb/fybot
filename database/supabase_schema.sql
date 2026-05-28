-- ################################################################################
-- MEDICAL CLINIC MANAGEMENT SAAS - SUPABASE / POSTGRESQL ARCHITECTURE
-- Author: AI Coding Agent (Expert Architect)
-- ################################################################################

-- 1. EXTENSIONS & SCHEMAS
create extension if not exists "uuid-ossp";

-- 2. ENUMS
create type user_role as enum ('platform_admin', 'clinic_admin', 'doctor', 'receptionist', 'patient');
create type appointment_status as enum ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
create type payment_status as enum ('pending', 'paid', 'partially_paid', 'refunded', 'cancelled');
create type file_category as enum ('exam', 'prescription', 'id_card', 'other');

-- 3. CORE TABLES (Tenancy & Auth)

-- Clinics (Tenants)
create table clinics (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  cnpj text unique,
  address jsonb,
  settings jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone -- Soft delete
);

-- Profiles (Extension of auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  cpf text unique,
  professional_id text, -- CRM for doctors
  specialty text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Clinic Membership (Multi-tenant Link)
create table clinic_members (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid references clinics(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  role user_role not null default 'patient',
  is_active boolean default true,
  joined_at timestamp with time zone default now(),
  unique(clinic_id, profile_id)
);

-- 4. CLINICAL DATA

-- Patients
create table patients (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid references clinics(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null, -- Null if patient doesn't have login
  full_name text not null,
  birth_date date not null,
  gender text,
  cpf text,
  email text,
  phone text,
  blood_type text,
  allergies text[],
  emergency_contact jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone
);

-- Appointments
create table appointments (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid references clinics(id) on delete cascade,
  doctor_id uuid references profiles(id) on delete restrict,
  patient_id uuid references patients(id) on delete restrict,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  status appointment_status default 'scheduled',
  reason text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  check (end_time > start_time)
);

-- Medical Records (Prontuário)
create table medical_records (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid references clinics(id) on delete cascade,
  appointment_id uuid references appointments(id),
  doctor_id uuid references profiles(id) on delete restrict,
  patient_id uuid references patients(id) on delete cascade,
  diagnosis text,
  prescription text,
  observation text,
  vitals jsonb, -- { bp: "120/80", heart_rate: 72, etc }
  content_encrypted text, -- Recommendation for high security
  version integer default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Files & Exams
create table storage_files (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  uploader_id uuid references profiles(id),
  file_name text not null,
  file_path text not null, -- Supabase Storage path
  file_type text,
  category file_category default 'other',
  size_bytes bigint,
  created_at timestamp with time zone default now()
);

-- 5. FINANCIAL

-- Payments/Transactions
create table payments (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_id uuid references patients(id),
  appointment_id uuid references appointments(id),
  amount decimal(12,2) not null,
  method text, -- 'credit_card', 'pix', 'cash'
  status payment_status default 'pending',
  transaction_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 6. AUDIT LOGS (Compliance)
create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  clinic_id uuid references clinics(id),
  user_id uuid references auth.users(id),
  table_name text not null,
  record_id uuid not null,
  action text not null, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data jsonb,
  new_data jsonb,
  user_ip text,
  user_agent text,
  created_at timestamp with time zone default now()
);

-- 7. PERFORMANCE INDEXES
create index idx_clinic_members_profile on clinic_members(profile_id);
create index idx_clinic_members_clinic on clinic_members(clinic_id);
create index idx_appointments_clinic_date on appointments(clinic_id, start_time);
create index idx_medical_records_patient on medical_records(patient_id);
create index idx_patients_clinic_cpf on patients(clinic_id, cpf) where deleted_at is null;
create index idx_audit_logs_record on audit_logs(record_id);

-- 8. FUNCTIONS & TRIGGERS

-- Function to handle timestamp updates
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply timestamp trigger to tables
create trigger set_updated_at before update on clinics for each row execute procedure handle_updated_at();
create trigger set_updated_at before update on profiles for each row execute procedure handle_updated_at();
create trigger set_updated_at before update on patients for each row execute procedure handle_updated_at();
create trigger set_updated_at before update on appointments for each row execute procedure handle_updated_at();
create trigger set_updated_at before update on medical_records for each row execute procedure handle_updated_at();
create trigger set_updated_at before update on payments for each row execute procedure handle_updated_at();

-- Medical Audit Trigger
create or replace function audit_record_change()
returns trigger as $$
begin
  insert into audit_logs (clinic_id, user_id, table_name, record_id, action, old_data, new_data)
  values (
    case when tg_op = 'DELETE' then (old.clinic_id) else (new.clinic_id) end,
    auth.uid(),
    tg_table_name,
    case when tg_op = 'DELETE' then (old.id) else (new.id) end,
    tg_op,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return null;
end;
$$ language plpgsql;

create trigger audit_medical_records after insert or update or delete on medical_records for each row execute procedure audit_record_change();

-- 9. ROW LEVEL SECURITY (RLS) policies

-- Enable RLS
alter table clinics enable row level security;
alter table profiles enable row level security;
alter table clinic_members enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table medical_records enable row level security;
alter table storage_files enable row level security;
alter table payments enable row level security;

-- Helper function: Get user's clinics and their role
create or replace function get_my_clinic_role(cid uuid)
returns user_role as $$
  select role from clinic_members where clinic_id = cid and profile_id = auth.uid() limit 1;
$$ language sql security definer;

-- Example Policies (Multi-tenant)

-- CLINICS: Members can view their clinic
create policy "Members can view clinic" on clinics for select
  using ( exists ( select 1 from clinic_members where clinic_id = clinics.id and profile_id = auth.uid() ) );

-- PATIENTS: Members can view, admins/receptionists/doctors can edit
create policy "Clinic staff can manage patients" on patients for all
  using ( get_my_clinic_role(clinic_id) in ('clinic_admin', 'doctor', 'receptionist') );

-- APPOINTMENTS: Staff and the patient themselves (if profile linked)
create policy "Staff manage appointments" on appointments for all
  using ( get_my_clinic_role(clinic_id) in ('clinic_admin', 'doctor', 'receptionist') );

-- MEDICAL RECORDS: HIGH SECURITY - Only doctors and clinic admins (audit purpose)
create policy "Clinical staff access records" on medical_records for all
  using ( get_my_clinic_role(clinic_id) in ('clinic_admin', 'doctor') );

-- PROFILES: Everyone can view others in the same clinic (for chat/lookup)
create policy "Fellow clinic members can view profiles" on profiles for select
  using ( exists ( 
    select 1 from clinic_members m1 
    join clinic_members m2 on m1.clinic_id = m2.clinic_id
    where m1.profile_id = auth.uid() and m2.profile_id = profiles.id
  ) );

-- 10. STORAGE BUCKETS (Recommended structure)
-- Bucket: 'exams'
-- Policy: (storage.foldername(name))[1] == clinic_id and auth.uid() in (get clinic members)
