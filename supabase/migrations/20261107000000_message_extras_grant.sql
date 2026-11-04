-- Messages only allow inserting the columns granted here (see 20261031000000_messages.sql), so the
-- reply and attachment columns from 20261106000000_message_extras.sql need adding too.
-- Without this, every send fails with "permission denied for table messages".

grant insert (reply_to, attachment_path, attachment_name, attachment_type, attachment_size)
  on public.messages to authenticated;
