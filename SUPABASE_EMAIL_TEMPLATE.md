# 📧 Configurarea Template-ului de Email Supabase

## Problema
Supabase trimite email-uri cu template-ul default care nu funcționează corect cu aplicația noastră.

## Soluția

### 1. Accesează Supabase Dashboard
1. Mergi la [supabase.com](https://supabase.com)
2. Selectează proiectul Fish Trophy
3. Mergi la **Authentication** → **Email Templates**

### 2. Configurează Template-ul de Confirmare

**Template:** `Confirm your signup`

**Subject:** `Confirmă-ți contul Fish Trophy`

**Body (HTML):**
```html
<h2>Bine ai venit la Fish Trophy!</h2>

<p>Salut!</p>

<p>Contul tău Fish Trophy a fost creat cu succes. Pentru a-l activa, te rugăm să confirmi email-ul apăsând pe link-ul de mai jos:</p>

<p><a href="{{ .ConfirmationURL }}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Confirmă contul</a></p>

<p>Dacă nu ai creat acest cont, te rugăm să ignori acest email.</p>

<p>Cu respect,<br>
Echipa Fish Trophy</p>

<hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;">
<p style="color: #6b7280; font-size: 12px;">
  Fish Trophy - Platforma Pescarilor din România<br>
  <a href="https://fishtrophy.ro" style="color: #3b82f6;">fishtrophy.ro</a>
</p>
```

### 3. Configurează Redirect URL

În **Authentication** → **URL Configuration**:

**Site URL:** `https://fishtrophy.ro`

**Redirect URLs:** 
- `https://fishtrophy.ro/email-confirmation`
- `https://fishtrophy.ro/profile`
- `http://localhost:3000/email-confirmation` (pentru development)

### 4. Testează

După configurare, testează înregistrarea unui cont nou pentru a vedea dacă email-ul arată corect.

## Note Importante

- Template-ul folosește `{{ .ConfirmationURL }}` care este variabila corectă pentru Supabase
- Link-ul va redirecționa către `/email-confirmation` cu parametrii necesari
- Pagina de confirmare va gestiona automat confirmarea contului
