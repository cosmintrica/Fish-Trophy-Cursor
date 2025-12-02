# admin-forum

Gestionează tot ce ține de administrarea forumului FishTrophy.

Include două părți distincte:
1) Modul de administrare (admin panel)
2) Modul de editare direct în UI (inline edit mode)

────────────────────────────────────────
MODUL 1: ADMIN PANEL AL FORUMULUI
────────────────────────────────────────

Acest panel este separat de site și permite:
- gestionarea utilizatorilor forumului
- moderare: ban, mute, shadow ban
- vizualizare și gestionare loguri de reputație
- administrare badge-uri speciale
- gestionare și rezolvare rapoarte de braconaj
- vizualizare loguri activitate
- statistici forum

UI-ul trebuie să fie simplu, profesionist și orientat spre funcționalitate.
Nu include aici editarea structurii forumului.

────────────────────────────────────────
MODUL 2: INLINE EDIT MODE (EDITARE DIRECTĂ ÎN UI)
────────────────────────────────────────

Structura forumului (categorii, subcategorii, subforumuri, topicuri) se editează direct în UI, nu în admin panel.

Funcții incluse în inline edit mode:
- butoane discrete "Edit" pe fiecare element
- drag and drop pentru reorganizarea structurii forumului
- editare titlu, descriere, icon, ordine
- creare rapidă de categorii, subcategorii, subforumuri
- ștergere elemente
- editare topicuri direct în pagină
- salvare instant prin API
- mod activabil printr-un toggle vizibil doar pentru admin/moderator

Edit mode trebuie să fie minimalist, intuitiv și să nu afecteze modul normal de vizualizare pentru utilizatori obișnuiți.

────────────────────────────────────────
REGULI GENERALE
────────────────────────────────────────

- Nu amesteca funcțiile admin forum cu admin site.
- Inline edit se aplică exclusiv pe forum, niciodată în zona de site.
- Orice acțiune admin trebuie să fie logată (cine, ce, când).
- Păstrează designul consecvent cu restul forumului.
