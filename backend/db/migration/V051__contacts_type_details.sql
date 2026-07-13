-- Per-type CRM contact fields. Type-specific attributes (agent license/brokerage
-- license/logo, escrow officer's inline assistant) live in a flexible JSONB blob so
-- the contact form can vary fields by "Type of Contact" without a wide, mostly-null table.
-- Shared fields (company, address, notes, email, phone, first/last/preferred) keep using
-- their existing columns.

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS details jsonb;
