-- Supabase SQL Editor'da çalıştır (001 migration'dan sonra).
-- Organic drift scheduler 'organic_drift' source değeri insert ediyor.

ALTER TABLE house_point_events
  DROP CONSTRAINT IF EXISTS house_point_events_source_check;

ALTER TABLE house_point_events
  ADD CONSTRAINT house_point_events_source_check
  CHECK (source IN (
    'player_action',
    'missed_class',
    'natural_drift',
    'event_spike',
    'world_event',
    'conversation_event',
    'organic_drift'
  ));
