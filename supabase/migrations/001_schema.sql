create extension if not exists "pgcrypto";

create table games (
  id            uuid primary key default gen_random_uuid(),
  room_code     text unique not null,
  phase         text not null default 'waiting',  -- waiting | battle | ended
  player0_id    uuid,
  player1_id    uuid,
  player2_id    uuid,
  player3_id    uuid,
  current_turn  int not null default 0,
  eliminated    int[] not null default '{}',
  winner        int,
  created_at    timestamptz not null default now()
);

create table invites (
  token     text primary key,
  game_id   uuid not null references games(id) on delete cascade,
  slot      int not null,   -- 1, 2, or 3
  used      boolean not null default false
);

create table units (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references games(id) on delete cascade,
  owner      int not null,  -- 0-3
  type       text not null,
  hp         int not null,
  max_hp     int not null,
  x          int not null,
  y          int not null,
  moved      boolean not null default false,
  attacked   boolean not null default false
);

-- Indexes for common queries
create index on units(game_id);
create index on invites(game_id);

-- Enable Row Level Security
alter table games enable row level security;
alter table invites enable row level security;
alter table units enable row level security;

-- Allow read access to all authenticated/anon users (Edge Functions handle writes)
create policy "read games" on games for select using (true);
create policy "read invites" on invites for select using (true);
create policy "read units" on units for select using (true);

-- Enable Realtime on these tables
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table units;
