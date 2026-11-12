-- Hư Giới: nhiệm vụ ngày, điểm danh 7 ngày và hộp thư ở cấp tài khoản.
-- Additive migration; dữ liệu private trong schema game, không cấp quyền PostgREST.
-- Phần thưởng chỉ được phát trong transaction có receipt idempotent ở account_receipts.

create table if not exists game.account_state (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  doc jsonb not null default '{}'::jsonb
    check (jsonb_typeof(doc) = 'object'
      and octet_length(convert_to(doc::text, 'UTF8')) <= 16384),
  updated_at bigint not null
);

create table if not exists game.account_receipts (
  owner_id uuid not null references game.account_state(owner_id) on delete cascade,
  request_id text not null check (length(request_id) between 1 and 128),
  fingerprint text not null,
  response jsonb not null check (jsonb_typeof(response) = 'object'),
  created_at bigint not null,
  expires_at bigint not null,
  primary key (owner_id, request_id)
);
create index if not exists game_account_receipts_expires_at
  on game.account_receipts(expires_at);

create table if not exists game.account_mail (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  seed_key text,
  kind text not null check (kind in ('system', 'event', 'support', 'compensation')),
  title text not null check (length(title) between 1 and 120),
  body text not null check (length(body) between 1 and 2000),
  attachments jsonb not null default '{}'::jsonb
    check (jsonb_typeof(attachments) = 'object'),
  created_at bigint not null,
  expires_at bigint,
  claimed_at bigint
);
-- Mỗi thư mẫu chỉ gieo một lần cho mỗi tài khoản.
create unique index if not exists game_account_mail_seed
  on game.account_mail(owner_id, seed_key) where seed_key is not null;
create index if not exists game_account_mail_owner_created
  on game.account_mail(owner_id, created_at desc, id);

alter table game.account_state enable row level security;
alter table game.account_receipts enable row level security;
alter table game.account_mail enable row level security;

revoke all on game.account_state, game.account_receipts, game.account_mail
  from public, anon, authenticated;
revoke all on all sequences in schema game from public, anon, authenticated;

comment on table game.account_state is
  'Trạng thái cấp tài khoản: nhiệm vụ ngày, baseline tiến độ và điểm danh 7 ngày.';
comment on table game.account_receipts is
  'Receipt idempotent cho claim nhiệm vụ/điểm danh/thư; không phát thưởng hai lần.';
comment on table game.account_mail is
  'Hộp thư hệ thống/sự kiện/hỗ trợ; quà đính kèm chỉ nhận một lần.';

-- Dọn receipt tài khoản quá hạn bằng job riêng, không sửa job player hiện hành.
do $$
begin
  if to_regclass('cron.job') is not null then
    if not exists (select 1 from cron.job where jobname = 'hugioi-cleanup-account-receipts') then
      perform cron.schedule(
        'hugioi-cleanup-account-receipts',
        '15 */3 * * *',
        'delete from game.account_receipts where expires_at <= floor(extract(epoch from now()) * 1000)::bigint;'
      );
    end if;
  end if;
end $$;
