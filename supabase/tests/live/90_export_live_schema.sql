-- READ-ONLY schema export for a faithful Gate B baseline.
--
-- Designed to be run by a NON-TECHNICAL operator in the Supabase dashboard
-- "SQL Editor". It only SELECTs. It writes nothing and changes nothing.
--
-- Why this and not pg_dump: the migration history in this repo is not replayable
-- from scratch (the numeric 001/003/005 lineage and the date-prefixed lineage
-- conflict), so a real schema snapshot of the live database is the only faithful
-- baseline. This export captures exactly what the idempotency migration depends
-- on: columns + types + nullability + defaults, enums, constraints, RLS policies
-- and triggers.
--
-- Run QUERY A first, then QUERY B. Export each as CSV and send both files.

-- ═══════════════════════════════════════════════════════════════════════════
-- QUERY A — tables, columns, enums, constraints, policies, triggers
-- ═══════════════════════════════════════════════════════════════════════════
select 'column' as section,
       c.table_name as object,
       c.column_name as detail,
       c.data_type || ' | udt=' || c.udt_name
         || ' | null=' || c.is_nullable
         || ' | def=' || coalesce(c.column_default, '-') as extra
from information_schema.columns c
where c.table_schema = 'public'

union all
select 'enum', t.typname, e.enumlabel, ''
from pg_type t
join pg_enum e on e.enumtypid = t.oid
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'

union all
select 'constraint', rel.relname, con.conname, pg_get_constraintdef(con.oid)
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public' and con.contype in ('c', 'u', 'f', 'p')

union all
select 'policy', p.tablename, p.policyname,
       p.cmd || ' | using=' || coalesce(p.qual, '-') || ' | check=' || coalesce(p.with_check, '-')
from pg_policies p
where p.schemaname = 'public'

union all
select 'trigger', cl.relname, tg.tgname, pg_get_triggerdef(tg.oid)
from pg_trigger tg
join pg_class cl on cl.oid = tg.tgrelid
join pg_namespace n on n.oid = cl.relnamespace
where n.nspname = 'public' and not tg.tgisinternal

order by 1, 2, 3;


-- ═══════════════════════════════════════════════════════════════════════════
-- QUERY B — applied migration history (resolves the lineage question)
-- ═══════════════════════════════════════════════════════════════════════════
select m.version,
       m.name,
       array_length(m.statements, 1) as statement_count
from supabase_migrations.schema_migrations m
order by m.version;
