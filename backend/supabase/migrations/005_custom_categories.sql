-- ============================================================
-- CATAT.IN - Migration 005: Custom Categories Support
-- Mengubah kolom kategori menjadi teks agar pengguna bisa
-- menambahkan kategori secara custom sesuai keinginan.
-- Aman untuk schema cloud lama maupun schema yang sudah
-- memakai category_id pada tabel budgets.
-- ============================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'category'
  ) then
    execute '
      alter table public.transactions
      alter column category type varchar(100) using category::varchar(100)
    ';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'budgets'
      and column_name = 'category'
  ) then
    execute '
      alter table public.budgets
      alter column category type varchar(100) using category::varchar(100)
    ';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_type
    where typname = 'transaction_category'
  )
  and not exists (
    select 1
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and a.attnum > 0
      and not a.attisdropped
      and t.typname = 'transaction_category'
  ) then
    drop type transaction_category;
  end if;
end $$;
