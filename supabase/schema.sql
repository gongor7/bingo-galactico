-- Bingo Galáctico — esquema Supabase
-- Ejecuta todo este archivo en: Supabase Dashboard → SQL Editor → New query → Run.
-- Es idempotente: puedes ejecutarlo varias veces sin romper nada.

-- ── Tablas ────────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  host_token text not null,
  phase      text not null default 'lobby', -- lobby | playing | finished
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id        uuid primary key default gen_random_uuid(),
  room_id   uuid not null references public.rooms (id) on delete cascade,
  nick      text not null,
  score     int  not null default 0,
  card      jsonb,             -- Cartón 5×5 (celdas o null para la libre central)
  marks     jsonb not null default '[]',  -- claves marcadas
  joined_at timestamptz not null default now(),
  unique (room_id, nick)
);

create index if not exists players_room_idx on public.players (room_id);

-- ── Realtime (opcional: presencia/broadcast no lo exigen, pero habilita
--    postgres_changes para observabilidad y futuras mejoras) ───────────────
alter table public.rooms   replica identity full;
alter table public.players replica identity full;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;

-- ── RLS ───────────────────────────────────────────────────────────────────
-- Juego de fiesta sin login: el anon key es público en el cliente y estas
-- políticas permiten leer/escribir salas y jugadores sin autenticación.
-- Trade-off aceptado (ver README): cualquiera con la URL puede escribir.
-- Endurecer con auth antes de exponer el proyecto públicamente en producción.
alter table public.rooms   enable row level security;
alter table public.players enable row level security;

drop policy if exists "rooms_party_full_access" on public.rooms;
create policy "rooms_party_full_access" on public.rooms
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "players_party_full_access" on public.players;
create policy "players_party_full_access" on public.players
  for all to anon, authenticated using (true) with check (true);
