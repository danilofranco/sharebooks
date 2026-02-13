-- ============================================================
-- ShareBooks MVP — Dados de exemplo (seed)
-- ============================================================
-- IMPORTANTE: Rode DEPOIS de ter criado pelo menos 2 usuários via sign-up.
-- Substitua os UUIDs abaixo pelos IDs reais dos seus usuários.
-- Você pode encontrar os IDs em auth.users ou profiles.

-- Exemplo com UUIDs placeholder (substitua antes de rodar):
-- Usuário 1: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- Usuário 2: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb

-- Se quiser seed automático, crie os usuários primeiro e depois rode:

DO $$
DECLARE
  u1 uuid;
  u2 uuid;
  l1 uuid;
  l2 uuid;
  l3 uuid;
  l4 uuid;
  l5 uuid;
  l6 uuid;
BEGIN
  -- Pega os 2 primeiros usuários existentes
  SELECT id INTO u1 FROM public.profiles ORDER BY created_at LIMIT 1;
  SELECT id INTO u2 FROM public.profiles ORDER BY created_at OFFSET 1 LIMIT 1;

  IF u1 IS NULL OR u2 IS NULL THEN
    RAISE NOTICE 'Precisa de pelo menos 2 usuários cadastrados para seed. Cadastre via /auth/sign-up.';
    RETURN;
  END IF;

  -- Atualizar perfis
  UPDATE public.profiles SET full_name = 'Maria Silva', location_text = 'Vila Mariana, SP' WHERE id = u1;
  UPDATE public.profiles SET full_name = 'João Santos', location_text = 'Pinheiros, SP' WHERE id = u2;

  -- Listings do u1
  INSERT INTO public.listings (id, user_id, school_name, grade, subject, title, publisher, condition, deal_type, price_cents, location_text, status)
  VALUES
    (gen_random_uuid(), u1, 'Colégio Bandeirantes', '6º ano', 'Matemática', 'Projeto Teláris — Matemática 6º ano', 'Ática', 'good', 'sale', 4500, 'Vila Mariana, SP', 'active')
  RETURNING id INTO l1;

  INSERT INTO public.listings (id, user_id, school_name, grade, subject, title, publisher, condition, deal_type, price_cents, location_text, status)
  VALUES
    (gen_random_uuid(), u1, 'Colégio Bandeirantes', '7º ano', 'Português', 'Singular & Plural — Leitura e Produção', 'Moderna', 'new', 'sale', 6000, 'Vila Mariana, SP', 'active')
  RETURNING id INTO l2;

  INSERT INTO public.listings (id, user_id, school_name, grade, subject, title, publisher, condition, deal_type, price_cents, location_text, status)
  VALUES
    (gen_random_uuid(), u1, 'Escola Móbile', '1º EM', 'Física', 'Fundamentos de Física — Vol. 1', 'Moderna', 'marked', 'donation', null, 'Vila Mariana, SP', 'active')
  RETURNING id INTO l3;

  -- Listings do u2
  INSERT INTO public.listings (id, user_id, school_name, grade, subject, title, publisher, condition, deal_type, price_cents, location_text, status)
  VALUES
    (gen_random_uuid(), u2, 'Colégio Santa Cruz', '8º ano', 'História', 'História Sociedade & Cidadania 8', 'FTD', 'good', 'sale', 3500, 'Pinheiros, SP', 'active')
  RETURNING id INTO l4;

  INSERT INTO public.listings (id, user_id, school_name, grade, subject, title, publisher, condition, deal_type, price_cents, location_text, status)
  VALUES
    (gen_random_uuid(), u2, 'Colégio Santa Cruz', '9º ano', 'Ciências', 'Ciências Naturais — Aprendendo com o cotidiano', 'Moderna', 'good', 'sale', 2800, 'Pinheiros, SP', 'active')
  RETURNING id INTO l5;

  INSERT INTO public.listings (id, user_id, school_name, grade, subject, title, publisher, condition, deal_type, price_cents, location_text, status)
  VALUES
    (gen_random_uuid(), u2, 'Escola Stance Dual', '2º EM', 'Inglês', 'English File Upper-Intermediate', 'Oxford', 'new', 'donation', null, 'Pinheiros, SP', 'active')
  RETURNING id INTO l6;

  RAISE NOTICE 'Seed concluído! 6 anúncios criados para % e %', u1, u2;
END;
$$;
