-- game_clock() intentionally returns wall-clock time and must not be treated as STABLE by PostgreSQL.
alter function public.game_clock() volatile;
