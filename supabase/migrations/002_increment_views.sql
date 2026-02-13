-- Função para incrementar views sem expor update direto
create or replace function public.increment_views(listing_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.listings
  set views_count = views_count + 1
  where id = listing_id;
end;
$$;
