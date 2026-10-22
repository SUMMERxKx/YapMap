-- RLS policies run their functions as the querying role, so the two membership helpers
-- used inside the messages policy must be executable by `authenticated`. They're safe to
-- expose this far: each only answers whether the CALLER (auth.uid()) is part of the given
-- chat or event, and the `private` schema is not reachable through the Data API anyway.
grant usage on schema private to authenticated;
grant execute on function
  private.is_chat_participant (uuid),
  private.is_event_member (uuid)
to authenticated;
