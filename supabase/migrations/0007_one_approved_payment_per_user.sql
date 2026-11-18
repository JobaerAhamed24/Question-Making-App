create unique index if not exists payments_one_approved_per_user_idx
  on public.payments (user_id)
  where status = 'approved';
