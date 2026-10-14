-- Economy audit ledger reserved for trade/auction/system grants and sinks.

create table public.economy_ledger (
  id bigint generated always as identity primary key,
  tx_type text not null check (tx_type in ('trade','auction','auction_fee','system_grant','system_sink')),
  from_user_id uuid references auth.users(id),
  to_user_id uuid references auth.users(id),
  asset_type text not null,
  asset_id text,
  quantity numeric not null default 1 check (quantity > 0),
  currency_amount bigint not null default 0 check (currency_amount >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
