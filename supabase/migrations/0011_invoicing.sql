-- 0011: invoicing (admin-only). Single firm: one business profile, firm-wide clients.
-- Money = integer paise (bigint), rates = basis points (18% = 1800), qty = thousandths.
-- Integrity lives here, not in the UI:
--   * RLS: every invoicing table is admin-only (staff can't read billing data via any URL/API).
--   * Numbers are allocated only when a draft is issued, inside issue_invoice() under a row
--     lock on the sequence, plus a unique constraint — no duplicates, no reuse.
--   * Issued invoices are frozen (trigger): seller/client/project are snapshotted at issue;
--     only cancel / share-link changes are allowed afterwards. Lines of non-drafts can't change.
--   * Payments go through record_payment() (locks the invoice, rejects overpayment) and are
--     voided, never deleted. Every lifecycle step writes invoice_events.
--   * Clients see an issued invoice only through get_shared_invoice(token) (unguessable uuid).

create type invoice_status as enum ('draft', 'issued', 'cancelled');
create type invoice_doc_type as enum ('tax_invoice', 'invoice', 'bill_of_supply', 'proforma');
create type invoice_tax_mode as enum ('exclusive', 'inclusive');
create type invoice_discount_kind as enum ('percent', 'fixed');
create type invoice_payment_method as enum ('upi', 'bank_transfer', 'cash', 'cheque', 'card', 'other');

-- ---- business profile (one row) ------------------------------------------------------
create table business_profile (
  id boolean primary key default true check (id),
  firm_name text not null check (length(trim(firm_name)) > 0),
  principal_name text,
  address text, city text, state text, pin text, country text not null default 'India',
  phone text, email text, website text,
  gst_registered boolean not null default false,
  gstin text check (gstin is null or gstin ~ '^[0-9A-Z]{15}$'),
  pan text check (pan is null or pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  registration text, -- e.g. Council of Architecture registration no.
  bank_details text, upi_id text,
  logo_data text check (logo_data is null or length(logo_data) < 400000),
  signature_data text check (signature_data is null or length(signature_data) < 400000),
  default_tax_rate int not null default 1800 check (default_tax_rate between 0 and 10000),
  default_tax_mode invoice_tax_mode not null default 'exclusive',
  default_due_days int not null default 15 check (default_due_days between 0 and 365),
  default_terms text, default_notes text,
  invoice_prefix text not null default 'INV' check (invoice_prefix ~ '^[A-Za-z0-9-]{1,12}$'),
  proforma_prefix text not null default 'PI' check (proforma_prefix ~ '^[A-Za-z0-9-]{1,12}$'),
  number_by_fy boolean not null default true,
  template text not null default 'minimal' check (template in ('minimal', 'editorial', 'modern')),
  accent_color text not null default '#FE5000' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  footer_note text,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) default auth.uid(),
  check (not gst_registered or gstin is not null)
);

-- ---- clients -------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  contact_person text, billing_address text, site_address text,
  state text, pin text, email text, phone text,
  gstin text check (gstin is null or gstin ~ '^[0-9A-Z]{15}$'),
  notes text,
  created_by uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- billing details for existing projects (admin-only; projects stay staff-visible) --
create table project_billing (
  project_id uuid primary key references projects(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  reference text,
  project_type text check (project_type in ('residential', 'commercial', 'institutional', 'hospitality', 'interior_design', 'renovation', 'other')),
  location text,
  site_state text, -- default place of supply for services on this property
  description text,
  contract_value bigint check (contract_value >= 0),
  agreed_fee bigint check (agreed_fee >= 0),
  billing_method text,
  start_date date, end_date date,
  notes text,
  updated_at timestamptz not null default now()
);

-- ---- invoices --------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  status invoice_status not null default 'draft',
  doc_type invoice_doc_type not null default 'tax_invoice',
  number text unique,
  prefix text, fy text, seq int,
  client_id uuid not null references clients(id) on delete restrict,
  project_id uuid references projects(id) on delete set null,
  invoice_date date not null default current_date,
  due_date date,
  po_reference text,
  place_of_supply text,
  tax_mode invoice_tax_mode not null default 'exclusive',
  discount_kind invoice_discount_kind,
  discount_value bigint not null default 0 check (discount_value >= 0),
  advance_adjusted bigint not null default 0 check (advance_adjusted >= 0),
  retention bigint not null default 0 check (retention >= 0),
  round_off boolean not null default true,
  notes text, terms text, payment_instructions text,
  template text not null default 'minimal' check (template in ('minimal', 'editorial', 'modern')),
  accent_color text check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  -- totals from lib/invoice/calc.ts, stored for the dashboard (documents recompute from lines)
  subtotal bigint not null default 0, discount_total bigint not null default 0,
  taxable_total bigint not null default 0, cgst_total bigint not null default 0,
  sgst_total bigint not null default 0, igst_total bigint not null default 0,
  tax_total bigint not null default 0, round_off_amount bigint not null default 0,
  total bigint not null default 0, payable bigint not null default 0,
  -- frozen at issue
  seller jsonb, buyer jsonb, project_snapshot jsonb,
  share_token uuid unique,
  issued_at timestamptz, cancelled_at timestamptz, cancel_reason text,
  duplicated_from uuid references invoices(id) on delete set null,
  created_by uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or number is not null),
  check (due_date is null or due_date >= invoice_date),
  check (payable >= 0)
);
create index invoices_client_idx on invoices (client_id);
create index invoices_status_idx on invoices (status, due_date);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  position int not null,
  description text not null check (length(trim(description)) > 0),
  category text,
  qty int not null check (qty > 0),
  unit text,
  rate bigint not null check (rate >= 0),
  discount_kind invoice_discount_kind,
  discount_value bigint not null default 0 check (discount_value >= 0),
  tax_rate int not null default 0 check (tax_rate between 0 and 10000),
  taxable bigint not null default 0, tax bigint not null default 0, total bigint not null default 0,
  unique (invoice_id, position)
);

create table invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete restrict,
  paid_on date not null,
  amount bigint not null check (amount > 0),
  method invoice_payment_method not null,
  reference text, notes text,
  voided_at timestamptz, void_reason text,
  created_by uuid references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index invoice_payments_invoice_idx on invoice_payments (invoice_id);

create table invoice_events (
  id bigint generated always as identity primary key,
  invoice_id uuid not null references invoices(id) on delete cascade,
  kind text not null,
  detail jsonb,
  actor uuid references profiles(id) default auth.uid(),
  at timestamptz not null default now()
);
create index invoice_events_invoice_idx on invoice_events (invoice_id, at);

create table invoice_sequences (
  prefix text not null,
  fy text not null default '',
  next_no int not null default 1 check (next_no > 0),
  primary key (prefix, fy)
);

-- ---- privileges: explicit (newer Supabase projects don't auto-grant new tables to the API
-- roles). RLS below still decides which rows; anon gets nothing but get_shared_invoice().
grant select, insert, update, delete on business_profile, clients, project_billing, invoices,
  invoice_lines, invoice_payments, invoice_events, invoice_sequences to authenticated;
grant usage, select on sequence invoice_events_id_seq to authenticated;

-- ---- RLS: admin-only everywhere ---------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['business_profile','clients','project_billing','invoices','invoice_lines',
                           'invoice_payments','invoice_events','invoice_sequences']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_admin on %I for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()))', t, t);
  end loop;
end $$;

-- ---- helpers ------------------------------------------------------------------------------
create or replace function public.invoice_fy(d date) returns text language sql immutable as $$
  select case when extract(month from d) >= 4
    then extract(year from d)::int || '-' || lpad(((extract(year from d)::int + 1) % 100)::text, 2, '0')
    else (extract(year from d)::int - 1) || '-' || lpad((extract(year from d)::int % 100)::text, 2, '0') end;
$$;

-- Keep in sync with formatInvoiceNumber() in lib/invoice/rules.ts.
create or replace function public.format_invoice_number(p text, fy text, n int) returns text
  language sql immutable as $$
  select case when coalesce(fy, '') = '' then p || '-' || lpad(n::text, 4, '0')
              else p || '/' || fy || '/' || lpad(n::text, 4, '0') end;
$$;

-- ---- freeze issued documents ------------------------------------------------------------
create or replace function public.guard_invoice() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then raise exception 'issued invoices cannot be deleted; cancel instead'; end if;
    return old;
  end if;
  if old.status = 'cancelled'
     and (to_jsonb(new) - array['share_token','updated_at']) is distinct from (to_jsonb(old) - array['share_token','updated_at']) then
    raise exception 'cancelled invoices cannot be changed';
  end if;
  if old.status = 'issued' then
    -- only cancellation and share-link rotation may touch an issued invoice
    if (to_jsonb(new) - array['status','cancelled_at','cancel_reason','share_token','updated_at'])
       is distinct from (to_jsonb(old) - array['status','cancelled_at','cancel_reason','share_token','updated_at']) then
      raise exception 'issued invoice % cannot be edited; duplicate it or cancel it', old.number;
    end if;
    if new.status not in ('issued', 'cancelled') then raise exception 'issued invoices cannot return to draft'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger invoices_guard before update or delete on invoices
  for each row execute function public.guard_invoice();

create or replace function public.guard_invoice_lines() returns trigger language plpgsql as $$
declare st invoice_status;
begin
  select status into st from invoices where id = coalesce(new.invoice_id, old.invoice_id);
  -- (parent already gone = cascade delete of a draft)
  if st is not null and st <> 'draft' then raise exception 'lines of an issued invoice cannot change'; end if;
  return coalesce(new, old);
end $$;
create trigger invoice_lines_guard before insert or update or delete on invoice_lines
  for each row execute function public.guard_invoice_lines();

-- ---- issue: allocate the number + snapshot, atomically ---------------------------------
create or replace function public.issue_invoice(p_id uuid) returns text
  language plpgsql set search_path = public as $$
declare
  inv invoices; bp business_profile; v_pfx text; v_fy text; n int; num text;
begin
  if not public.is_admin(auth.uid()) then raise exception 'only admins can issue invoices'; end if;
  select * into inv from invoices where id = p_id for update;
  if not found then raise exception 'invoice not found'; end if;
  if inv.status <> 'draft' then raise exception 'only drafts can be issued'; end if;
  if not exists (select 1 from invoice_lines where invoice_id = p_id) then raise exception 'add at least one line item'; end if;
  select * into bp from business_profile;
  if not found then raise exception 'set up the business profile first'; end if;
  if inv.doc_type = 'tax_invoice' and not bp.gst_registered then raise exception 'a tax invoice needs a GST-registered business profile'; end if;

  v_pfx := case when inv.doc_type = 'proforma' then bp.proforma_prefix else bp.invoice_prefix end;
  v_fy := case when bp.number_by_fy then public.invoice_fy(inv.invoice_date) else '' end;
  insert into invoice_sequences (prefix, fy) values (v_pfx, v_fy) on conflict do nothing;
  -- the UPDATE row lock serializes concurrent issuers on the same sequence
  update invoice_sequences s set next_no = s.next_no + 1 where s.prefix = v_pfx and s.fy = v_fy
    returning s.next_no - 1 into n;
  num := public.format_invoice_number(v_pfx, v_fy, n);

  update invoices set
    status = 'issued', number = num, prefix = v_pfx, fy = nullif(v_fy, ''), seq = n,
    issued_at = now(), share_token = gen_random_uuid(),
    seller = to_jsonb(bp) - 'id' - 'updated_by' - 'updated_at',
    buyer = (select to_jsonb(c) - 'created_by' - 'created_at' - 'updated_at' from clients c where c.id = inv.client_id),
    project_snapshot = (select jsonb_build_object('name', p.name, 'code', p.code, 'reference', pb.reference,
        'project_type', pb.project_type, 'location', pb.location)
      from projects p left join project_billing pb on pb.project_id = p.id where p.id = inv.project_id)
  where id = p_id;
  insert into invoice_events (invoice_id, kind, detail) values (p_id, 'issued', jsonb_build_object('number', num));
  return num;
end $$;

-- ---- payments ------------------------------------------------------------------------------
create or replace function public.record_payment(
  p_invoice uuid, p_paid_on date, p_amount bigint, p_method invoice_payment_method,
  p_reference text default null, p_notes text default null
) returns uuid language plpgsql set search_path = public as $$
declare inv invoices; paid bigint; pid uuid;
begin
  if not public.is_admin(auth.uid()) then raise exception 'only admins can record payments'; end if;
  select * into inv from invoices where id = p_invoice for update; -- serialize payments per invoice
  if not found then raise exception 'invoice not found'; end if;
  if inv.status <> 'issued' then raise exception 'payments can only be recorded on issued invoices'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'amount must be positive'; end if;
  select coalesce(sum(amount), 0) into paid from invoice_payments where invoice_id = p_invoice and voided_at is null;
  if paid + p_amount > inv.payable then
    raise exception 'payment exceeds the balance due (Rs %)', to_char((inv.payable - paid) / 100.0, 'FM999999999990.00');
  end if;
  insert into invoice_payments (invoice_id, paid_on, amount, method, reference, notes)
    values (p_invoice, p_paid_on, p_amount, p_method, nullif(trim(p_reference), ''), nullif(trim(p_notes), ''))
    returning id into pid;
  insert into invoice_events (invoice_id, kind, detail)
    values (p_invoice, 'payment_recorded', jsonb_build_object('payment_id', pid, 'amount', p_amount, 'method', p_method));
  return pid;
end $$;

create or replace function public.void_payment(p_payment uuid, p_reason text) returns void
  language plpgsql set search_path = public as $$
declare pay invoice_payments;
begin
  if not public.is_admin(auth.uid()) then raise exception 'only admins can void payments'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'give a reason for voiding'; end if;
  select * into pay from invoice_payments where id = p_payment for update;
  if not found or pay.voided_at is not null then raise exception 'payment not found or already voided'; end if;
  update invoice_payments set voided_at = now(), void_reason = trim(p_reason) where id = p_payment;
  insert into invoice_events (invoice_id, kind, detail)
    values (pay.invoice_id, 'payment_voided', jsonb_build_object('payment_id', p_payment, 'amount', pay.amount, 'reason', trim(p_reason)));
end $$;

create or replace function public.cancel_invoice(p_id uuid, p_reason text) returns void
  language plpgsql set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'only admins can cancel invoices'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'give a reason for cancelling'; end if;
  update invoices set status = 'cancelled', cancelled_at = now(), cancel_reason = trim(p_reason)
    where id = p_id and status = 'issued';
  if not found then raise exception 'only issued invoices can be cancelled (delete drafts instead)'; end if;
  insert into invoice_events (invoice_id, kind, detail) values (p_id, 'cancelled', jsonb_build_object('reason', trim(p_reason)));
end $$;

-- ---- client-facing read by share token (the only non-admin path) ---------------------------
create or replace function public.get_shared_invoice(p_token uuid) returns jsonb
  language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'invoice', to_jsonb(i) - 'created_by' - 'share_token' - 'duplicated_from',
    'lines', coalesce((select jsonb_agg(to_jsonb(l) order by l.position) from invoice_lines l where l.invoice_id = i.id), '[]'::jsonb),
    'paid', (select coalesce(sum(amount), 0) from invoice_payments p where p.invoice_id = i.id and p.voided_at is null)
  )
  from invoices i
  where i.share_token = p_token and i.status in ('issued', 'cancelled');
$$;
revoke all on function public.get_shared_invoice(uuid) from public;
grant execute on function public.get_shared_invoice(uuid) to anon, authenticated;

-- ---- atomic draft line save (delete + insert in one transaction) -------------------------
create or replace function public.replace_invoice_lines(p_invoice uuid, p_lines jsonb) returns void
  language plpgsql set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'only admins can edit invoices'; end if;
  perform 1 from invoices where id = p_invoice and status = 'draft' for update;
  if not found then raise exception 'only drafts can be edited'; end if;
  delete from invoice_lines where invoice_id = p_invoice;
  insert into invoice_lines (invoice_id, position, description, category, qty, unit, rate,
                             discount_kind, discount_value, tax_rate, taxable, tax, total)
  select p_invoice, l.position, l.description, l.category, l.qty, l.unit, l.rate,
         l.discount_kind, l.discount_value, l.tax_rate, l.taxable, l.tax, l.total
  from jsonb_to_recordset(p_lines) as l(position int, description text, category text, qty int, unit text,
       rate bigint, discount_kind invoice_discount_kind, discount_value bigint, tax_rate int,
       taxable bigint, tax bigint, total bigint);
end $$;
