# SQL Scripts pentru Fish Trophy Analytics

Acest folder conține scripturile SQL necesare pentru funcționarea sistemului de analytics.

## Fișiere importante:

### 1. `fix-main-analytics-function.sql`
- **Scop:** Corectează funcția principală `get_current_analytics_stats`
- **Conține:** Funcția principală pentru statistici + funcție de test
- **Când să rulezi:** Când datele din admin panel nu se afișează corect

### 2. `create-traffic-evolution-functions.sql`
- **Scop:** Creează funcțiile pentru evoluția traficului în timp
- **Conține:** 
  - `get_traffic_last_hour()` - trafic pe ultima oră (pe minute)
  - `get_traffic_last_24h()` - trafic pe ultimele 24 ore (pe ore)
  - `get_traffic_last_week()` - trafic pe ultima săptămână (pe zile)
  - `get_traffic_last_month()` - trafic pe ultima lună (pe zile)
  - `get_traffic_last_year()` - trafic pe ultimul an (pe luni)
- **Când să rulezi:** Când graficul de evoluție trafic nu funcționează

### 3. `create-custom-traffic-function.sql`
- **Scop:** Creează funcția pentru perioade custom de trafic
- **Conține:** `get_traffic_custom_period(start_date, end_date)`
- **Când să rulezi:** Când funcționalitatea de perioadă custom nu funcționează

### 4. `test-admin-data.sql`
- **Scop:** Testează datele care ar trebui să apară în admin panel
- **Conține:** Teste pentru funcția principală și calcule manuale
- **Când să rulezi:** Pentru debugging când datele nu par corecte

## Cum să rulezi scripturile:

1. Deschide Supabase Dashboard
2. Mergi la SQL Editor
3. Copiază și lipește conținutul fișierului
4. Rulează scriptul
5. Verifică rezultatele în consolă

## Ordinea recomandată:

1. `fix-main-analytics-function.sql` (pentru datele principale)
2. `create-traffic-evolution-functions.sql` (pentru graficul de evoluție)
3. `create-custom-traffic-function.sql` (pentru perioade custom)
4. `test-admin-data.sql` (pentru verificare)

## Note importante:

- Toate funcțiile folosesc timezone-ul României (`Europe/Bucharest`)
- Datele sunt calculate în timp real din tabelul `analytics_events`
- Funcțiile returnează date agregate pentru performanță optimă
