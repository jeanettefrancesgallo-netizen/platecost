-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Generic updated_at maintenance, reused by every table with that column.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
