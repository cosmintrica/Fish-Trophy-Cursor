# Active Viewers Real-time System

## De ce Supabase Realtime în loc de localStorage?

### ✅ Avantaje Supabase Realtime:

1. **Sincronizare cross-device/cross-browser**
   - localStorage e doar local pe browser
   - Supabase e global - dacă utilizatorul deschide topicul pe telefon, apare instant și pe desktop

2. **Real-time pentru TOȚI utilizatorii**
   - localStorage e doar pentru tine - alții nu văd că ești acolo
   - Supabase Realtime sincronizează instant pentru toți

3. **Persistență**
   - localStorage se șterge când închizi tab-ul
   - Supabase păstrează starea - dacă închizi tab-ul și deschizi altul, rămâi în listă

4. **Scalabilitate**
   - localStorage nu funcționează bine cu mulți utilizatori simultan
   - Supabase gestionează automat concurența

5. **Cleanup automat**
   - localStorage rămâne pentru totdeauna (până ștergi manual)
   - Supabase șterge automat intrările expirate (>2 minute)

### ❌ Dezavantaje localStorage:

- Doar local (nu apare pentru alții)
- Se șterge când închizi tab-ul
- Nu se sincronizează între device-uri
- Nu e real-time pentru alți utilizatori

## Cum funcționează sistemul actual:

1. **Cleanup automat**: La fiecare query, se șterg automat intrările >2 minute
2. **Actualizare frecventă**: `last_seen_at` se actualizează la fiecare 10 secunde
3. **Realtime instant**: Supabase Realtime notifică instant când cineva apare/dispare
4. **Filtrare strictă**: Doar utilizatorii activi în ultimele 2 minute sunt afișați

## Performanță:

- **Interval update**: 10 secunde (foarte rapid pentru real-time)
- **Expirare**: 2 minute (realist pentru "active")
- **Cleanup**: Automat la fiecare query (nu se acumulează date)

## Rezultat:

- ✅ Instant feedback când cineva apare/dispare
- ✅ Cleanup automat (nu se acumulează date vechi)
- ✅ Real-time sincronizare pentru toți utilizatorii
- ✅ Funcționează cross-device/cross-browser

