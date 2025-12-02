# project-patterns

Best practices specifice proiectului Fish Trophy.

## Helpers și Utilitare

- **Folosește `forumUserToLayoutUser` helper pentru consistență**: Când construiești obiecte `ForumUser` pentru layout, folosește helper-ul `forumUserToLayoutUser` din `client/src/forum/components/ForumLayout.tsx` pentru a asigura consistența și corecta populare a câmpurilor (id, username, email, photo_url, isAdmin).

## Upload-uri și Storage

- **Upload-urile merg în Cloudflare R2 prin Netlify function `/upload`**: Toate upload-urile de imagini și video (fotografii capturi, videoclipuri recorduri, etc.) trebuie să fie făcute prin Netlify function-ul `/upload` care gestionează integrarea cu Cloudflare R2. Nu folosi direct Supabase Storage pentru aceste fișiere.

## Structura Fișierelor

- **Componentele forum în `client/src/forum/components/`**: Toate componentele reutilizabile pentru forum (ActiveViewers, ReputationButtons, etc.) trebuie să fie în `client/src/forum/components/`.
- **Serviciile în `client/src/services/forum/`**: Toate serviciile și logica de business pentru forum (topics, posts, search, etc.) trebuie să fie în `client/src/services/forum/`.



