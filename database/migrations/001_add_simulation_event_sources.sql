-- Supabase SQL Editor'da çalıştır.
-- world_simulation.py 'world_event' ve 'conversation_event' source değerleri insert ediyor;
-- mevcut CHECK constraint bunları reddediyor (400).

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
    'conversation_event'
  ));
