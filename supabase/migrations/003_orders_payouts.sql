-- ============================================================
-- ShareBooks — Orders & Payouts (MercadoPago Checkout Pro)
-- ============================================================

-- ORDERS
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents int not null,
  platform_fee_cents int not null default 0,
  seller_amount_cents int not null,
  fee_percent numeric(5,2) not null default 10.00,
  status text not null default 'created'
    check (status in ('created','pending_payment','paid','canceled','refunded','completed')),
  provider text not null default 'mercadopago'
    check (provider in ('stripe','mercadopago')),
  provider_payment_id text,
  provider_preference_id text,
  checkout_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_buyer on public.orders(buyer_id);
create index idx_orders_seller on public.orders(seller_id);
create index idx_orders_listing on public.orders(listing_id);
create index idx_orders_status on public.orders(status);

-- PAYOUTS (repasse ao vendedor — MVP: manual)
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents int not null,
  status text not null default 'pending'
    check (status in ('pending','paid','failed')),
  provider_payout_id text,
  created_at timestamptz not null default now()
);

create index idx_payouts_seller on public.payouts(seller_id);
create index idx_payouts_order on public.payouts(order_id);

-- Trigger updated_at para orders
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at();

-- RLS: ORDERS
alter table public.orders enable row level security;

create policy "Orders: participantes leem"
  on public.orders for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Orders: buyer cria"
  on public.orders for insert
  with check (auth.uid() = buyer_id);

create policy "Orders: participantes e admin atualizam"
  on public.orders for update
  using (
    auth.uid() = buyer_id
    or auth.uid() = seller_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS: PAYOUTS
alter table public.payouts enable row level security;

create policy "Payouts: seller e admin leem"
  on public.payouts for select
  using (
    auth.uid() = seller_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Função helper: calcular comissão com fee mínimo
create or replace function public.calculate_fee(
  amount int,
  fee_pct numeric default 10.00,
  min_fee int default 500
)
returns table(platform_fee int, seller_amount int)
language sql
immutable
as $$
  select
    greatest(round(amount * fee_pct / 100)::int, min_fee) as platform_fee,
    amount - greatest(round(amount * fee_pct / 100)::int, min_fee) as seller_amount;
$$;
