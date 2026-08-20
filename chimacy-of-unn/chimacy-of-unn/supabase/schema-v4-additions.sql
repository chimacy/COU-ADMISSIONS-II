-- ============================================================
-- CHIMACY OF UNN — Schema v4 additions
-- Run this AFTER schema.sql, schema-v2-additions.sql, and schema-v3-additions.sql.
-- 100% additive. Fixes two real gaps found on review:
--   1. Payments confirmed manually via Checkout (the common bank
--      transfer/cash path) never triggered a notification - only
--      Flutterwave-verified payments did.
--   2. Changing a request's status never notified other admins.
-- ============================================================

-- ---------------------------------------------------------------
-- Notify on manual payment confirmation (quotations.paid -> true)
-- This complements trg_sync_request_on_paid (schema-v2), which updates the
-- linked request's status - this trigger adds the actual notification.
-- ---------------------------------------------------------------
create or replace function public.notify_payment_confirmed_manual()
returns trigger as $$
begin
  if new.paid = true and (old.paid is distinct from new.paid) then
    insert into public.notifications (type, title, body, request_id)
    select
      'payment_confirmed',
      'Payment confirmed',
      coalesce(new.client_name, 'A client') || ' paid ' || new.paid_amount || ' for ' || coalesce(new.programme_name, 'their programme') || ' (' || coalesce(new.payment_method, 'manual') || ').',
      r.id
    from public.requests r
    where r.linked_quotation_id = new.id
    limit 1;

    -- Also notify even when this quotation has no linked request (e.g. a
    -- client created directly via New Client, not through the portal).
    if not exists (select 1 from public.requests where linked_quotation_id = new.id) then
      insert into public.notifications (type, title, body)
      values (
        'payment_confirmed',
        'Payment confirmed',
        coalesce(new.client_name, 'A client') || ' paid ' || new.paid_amount || ' for ' || coalesce(new.programme_name, 'their programme') || ' (' || coalesce(new.payment_method, 'manual') || ').'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_payment_manual on public.quotations;
create trigger trg_notify_payment_manual
after update on public.quotations
for each row execute function public.notify_payment_confirmed_manual();

-- ---------------------------------------------------------------
-- Notify on request status changes (so other logged-in admins see it
-- without needing to already have that request open).
-- ---------------------------------------------------------------
create or replace function public.notify_request_status_change()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (type, title, body, request_id)
    values (
      'status_update',
      'Request updated',
      coalesce(new.full_name, 'A request') || '''s request (' || new.request_number || ') is now ' || replace(new.status, '_', ' ') || '.',
      new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_notify_request_status on public.requests;
create trigger trg_notify_request_status
after update on public.requests
for each row execute function public.notify_request_status_change();

-- ============================================================
-- DONE.
-- ============================================================
