# Cum să vezi mesajele private ca admin în Supabase

## De ce nu vezi mesajele în Supabase UI?

**RLS (Row Level Security) blochează automat accesul** în Supabase UI. Chiar dacă ești admin, RLS se aplică și vezi doar mesajele pentru care ești autorizat.

## Cum puteai vedea mesajele ÎNAINTE (fără criptare):

### Opțiunea 1: SQL Editor cu SECURITY DEFINER
```sql
-- În Supabase SQL Editor, rulează:
SELECT * FROM private_messages 
ORDER BY created_at DESC 
LIMIT 100;
```
**NU FUNCȚIONEAZĂ** - RLS se aplică și aici.

### Opțiunea 2: Bypass RLS temporar
```sql
-- Doar pentru debugging - NU în producție!
SET LOCAL row_security = off;
SELECT * FROM private_messages;
RESET row_security;
```
**NU FUNCȚIONEAZĂ** - Supabase nu permite `SET LOCAL` pentru useri non-superuser.

### Opțiunea 3: Funcție cu SECURITY DEFINER
```sql
CREATE OR REPLACE FUNCTION admin_view_all_messages()
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  recipient_id UUID,
  subject TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifică dacă ești admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    pm.id,
    pm.sender_id,
    pm.recipient_id,
    pm.subject,
    pm.content,  -- ÎNAINTE: vedeai textul necriptat
    pm.created_at
  FROM private_messages pm
  ORDER BY pm.created_at DESC;
END;
$$;
```

**ACUM CU CRIPTARE:**
```sql
-- Chiar dacă rulezi funcția de mai sus, vezi:
SELECT 
  id,
  sender_id,
  recipient_id,
  subject,
  content,  -- NULL pentru mesaje criptate
  encrypted_content,  -- Text criptat (ilizibil)
  encryption_iv,
  is_encrypted,
  created_at
FROM private_messages;
```

**Rezultat:** Vezi doar text criptat - nu poți decripta fără cheia derivată din ID-urile utilizatorilor!

## De ce tabelele par goale în Supabase UI?

1. **RLS se aplică automat** - Supabase UI respectă RLS policies
2. **Nu ești autentificat ca unul dintre utilizatorii din conversație**
3. **Mesajele există**, dar RLS le ascunde

## Cum să verifici că mesajele există:

### Metoda 1: SQL Editor cu funcție admin
```sql
-- Creează funcția (doar o dată)
CREATE OR REPLACE FUNCTION admin_count_messages()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  
  RETURN (SELECT COUNT(*) FROM private_messages);
END;
$$;

-- Apelează funcția
SELECT admin_count_messages();
```

### Metoda 2: Verifică direct (doar dacă ai postgres role)
```sql
-- Doar dacă ai acces postgres (superuser)
SELECT COUNT(*) FROM private_messages;
```

## Concluzie:

- **ÎNAINTE:** Dacă aveai acces postgres sau foloseai funcții SECURITY DEFINER, puteai vedea mesajele necriptate
- **ACUM:** Chiar dacă ai acces, vezi doar text criptat - nu poți decripta fără cheia utilizatorilor
- **RLS protejează accesul** - Supabase UI respectă automat RLS
- **Criptarea protejează conținutul** - chiar dacă ai acces, nu poți citi mesajele

