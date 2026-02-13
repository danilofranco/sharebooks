-- ============================================================
-- ShareBooks — Constraints de texto (OWASP A05 — defesa em profundidade)
-- ============================================================
-- Mesmo que o server sanitize, o DB é a última linha de defesa.

-- PROFILES
alter table public.profiles
  add constraint chk_profiles_full_name_len check (char_length(full_name) <= 200),
  add constraint chk_profiles_location_len check (location_text is null or char_length(location_text) <= 200);

-- LISTINGS
alter table public.listings
  add constraint chk_listings_title_len check (char_length(title) between 3 and 200),
  add constraint chk_listings_school_len check (char_length(school_name) between 1 and 200),
  add constraint chk_listings_grade_len check (char_length(grade) between 1 and 50),
  add constraint chk_listings_subject_len check (subject is null or char_length(subject) <= 100),
  add constraint chk_listings_publisher_len check (publisher is null or char_length(publisher) <= 100),
  add constraint chk_listings_edition_len check (edition is null or char_length(edition) <= 50),
  add constraint chk_listings_location_len check (location_text is null or char_length(location_text) <= 200),
  add constraint chk_listings_price_range check (price_cents is null or (price_cents >= 0 and price_cents <= 9999900));

-- MESSAGES
alter table public.messages
  add constraint chk_messages_body_len check (char_length(body) between 1 and 2000);

-- ORDERS
alter table public.orders
  add constraint chk_orders_amount_positive check (amount_cents > 0),
  add constraint chk_orders_fee_positive check (platform_fee_cents >= 0),
  add constraint chk_orders_seller_amount check (seller_amount_cents >= 0),
  add constraint chk_orders_notes_len check (notes is null or char_length(notes) <= 500);
