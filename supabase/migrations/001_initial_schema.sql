-- ============================================================
-- ShareBooks MVP — Schema completo
-- ============================================================

-- 1) PROFILES (1:1 com auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  location_text text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) LISTINGS
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  school_name text not null,
  grade text not null,
  subject text,
  title text not null,
  publisher text,
  edition text,
  condition text not null check (condition in ('new', 'good', 'marked')),
  deal_type text not null check (deal_type in ('sale', 'donation')),
  price_cents int,
  location_text text,
  delivery_method text not null default 'flexible' check (delivery_method in ('pickup', 'flexible')),
  status text not null default 'active' check (status in ('active', 'paused', 'sold', 'donated', 'removed')),
  views_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_listings_school on public.listings(school_name);
create index idx_listings_grade on public.listings(grade);
create index idx_listings_title on public.listings using gin(to_tsvector('portuguese', title));
create index idx_listings_status on public.listings(status);
create index idx_listings_user on public.listings(user_id);
create index idx_listings_created on public.listings(created_at desc);

-- 3) LISTING_PHOTOS
create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_photos_listing on public.listing_photos(listing_id);

-- 4) CONVERSATIONS
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(listing_id, buyer_id, seller_id)
);

create index idx_conversations_buyer on public.conversations(buyer_id);
create index idx_conversations_seller on public.conversations(seller_id);

-- 5) MESSAGES
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id, created_at);

-- 6) FAVORITES
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, listing_id)
);

-- ============================================================
-- TRIGGER: criar profile ao signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger trg_listings_updated_at
  before update on public.listings
  for each row execute function public.update_updated_at();

create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.update_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- PROFILES
alter table public.profiles enable row level security;

create policy "Profiles: leitura pública"
  on public.profiles for select
  using (true);

create policy "Profiles: usuário edita próprio"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- LISTINGS
alter table public.listings enable row level security;

create policy "Listings: leitura pública (não removidos)"
  on public.listings for select
  using (status != 'removed' or user_id = auth.uid());

create policy "Listings: inserir próprio"
  on public.listings for insert
  with check (auth.uid() = user_id);

create policy "Listings: editar próprio"
  on public.listings for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Listings: deletar próprio"
  on public.listings for delete
  using (auth.uid() = user_id);

-- LISTING_PHOTOS
alter table public.listing_photos enable row level security;

create policy "Photos: leitura pública"
  on public.listing_photos for select
  using (true);

create policy "Photos: inserir dono do listing"
  on public.listing_photos for insert
  with check (
    exists (
      select 1 from public.listings
      where id = listing_id and user_id = auth.uid()
    )
  );

create policy "Photos: deletar dono do listing"
  on public.listing_photos for delete
  using (
    exists (
      select 1 from public.listings
      where id = listing_id and user_id = auth.uid()
    )
  );

-- CONVERSATIONS
alter table public.conversations enable row level security;

create policy "Conversations: participantes"
  on public.conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

create policy "Conversations: buyer cria"
  on public.conversations for insert
  with check (auth.uid() = buyer_id);

create policy "Conversations: participantes atualizam"
  on public.conversations for update
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- MESSAGES
alter table public.messages enable row level security;

create policy "Messages: participantes leem"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Messages: sender insere"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

create policy "Messages: sender marca leitura"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- FAVORITES
alter table public.favorites enable row level security;

create policy "Favorites: próprios"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Favorites: inserir próprio"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Favorites: deletar próprio"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Storage: upload autenticado"
  on storage.objects for insert
  with check (
    bucket_id = 'listing-photos'
    and auth.role() = 'authenticated'
  );

create policy "Storage: leitura pública"
  on storage.objects for select
  using (bucket_id = 'listing-photos');

create policy "Storage: deletar próprio"
  on storage.objects for delete
  using (
    bucket_id = 'listing-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- REALTIME: habilitar para messages
-- ============================================================
alter publication supabase_realtime add table public.messages;
