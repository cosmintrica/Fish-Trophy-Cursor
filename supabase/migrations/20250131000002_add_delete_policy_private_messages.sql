-- Add DELETE policy for private_messages
-- Migration: 20250131000002_add_delete_policy_private_messages.sql
-- 
-- PROBLEMA: Mesajele nu se șterg fizic din baza de date când ambele părți le-au șters
-- SOLUȚIA: Adăugăm o policy care permite ștergerea fizică a mesajelor când ambele părți le-au șters
-- SIGUR: Doar utilizatorii care sunt sender sau recipient pot șterge mesajele

-- Policy pentru DELETE: utilizatorii pot șterge mesajele unde sunt sender sau recipient
-- și unde ambele părți au setat flag-ul de ștergere
CREATE POLICY "Users can delete messages when both parties deleted"
  ON public.private_messages
  FOR DELETE
  USING (
    -- User must be sender or recipient
    (auth.uid() = sender_id OR auth.uid() = recipient_id)
    AND
    -- Both parties must have deleted the message
    (is_deleted_by_sender = true AND is_deleted_by_recipient = true)
  );

