-- Role'n'Rolls — Rich metadata bubbles on lore entities.
--
-- The detail panel needs to show arbitrary key/value "caractéristiques"
-- and graded "indicateurs" (stat bars) per entity — this is freeform data
-- so we keep it in a single JSONB column rather than polluting the main
-- row shape.
--
-- Shape:
--   {
--     "meta":  [{ "k": "Région", "v": "Côte Nord" }, ...],
--     "stats": [{ "k": "Prospérité", "v": 82, "c": "gold" }, ...],
--     "tags":  ["Capitale", "Ancienne"]
--   }
--
-- All three keys optional. Clients validate + default.

alter table public.lore_entities
  add column if not exists custom_data jsonb not null default '{}'::jsonb;
