# Clarificare Migrații 87, 88, 89

## Migrația 87: Fix All Forum RLS for INSERT/UPDATE/DELETE
**Scop**: Fix policy-urile RLS pentru INSERT/UPDATE/DELETE pe categorii, subcategorii și subforums.

**Cine poate face asta?**
- **DOAR ADMINII** (nu moderatorii)
- Folosește `is_forum_admin()` care verifică `profiles.role = 'admin'`
- Moderatorii NU pot gestiona categorii/subcategorii/subforums prin această migrație

**Dacă vrei ca moderatorii să poată gestiona categorii:**
- Ar trebui un sistem de permisiuni per categorie (mai complex)
- Sau o funcție `is_forum_moderator()` care să verifice moderatorii
- Sau un sistem de moderatori per categorie (foarte complex)

**Pentru moment**: Doar adminii pot face asta.

---

## Migrația 88: Forum Settings Table
**Scop**: Tabel pentru setări GLOBALE ale forumului.

**Ce face:**
- Creează tabelul `forum_settings` pentru setări globale
- Setări precum: `show_category_icons`, `show_subcategory_icons`, `show_subforum_icons`
- **Toți userii văd aceeași setare** (globală pentru toată aplicația)

**Exemplu:**
- Dacă adminul setează `show_subcategory_icons = false`, toți userii vor vedea subcategoriile fără iconuri

---

## Migrația 89: Add show_icon columns
**Scop**: Adaugă coloana `show_icon` per item (categorie/subcategorie/subforum).

**Ce face:**
- Adaugă coloana `show_icon BOOLEAN DEFAULT true` în:
  - `forum_categories.show_icon`
  - `forum_subcategories.show_icon`
  - `forum_subforums.show_icon`

**Diferența față de migrația 88:**
- **88**: Setare GLOBALĂ (toate categoriile/subcategoriile/subforumurile)
- **89**: Setare PER ITEM (fiecare categorie/subcategorie/subforum poate avea propriul setare)

**Cum funcționează împreună:**
1. Dacă toggle-ul global (88) este `false` → nu se afișează niciun icon (indiferent de setarea per item)
2. Dacă toggle-ul global (88) este `true` → se verifică setarea per item (89):
   - Dacă `show_icon = true` → se afișează iconul
   - Dacă `show_icon = false` → nu se afișează iconul

**Exemplu:**
- Toggle global: `show_subcategory_icons = true`
- Subcategoria A: `show_icon = true` → se afișează iconul
- Subcategoria B: `show_icon = false` → nu se afișează iconul (chiar dacă toggle-ul global e true)

