alter table public.events
add column receipt_template text not null default 'classic';

alter table public.events
add constraint events_receipt_template_check
check (receipt_template in ('classic', 'gradient'));
