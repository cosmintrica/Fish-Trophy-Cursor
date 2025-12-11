# Ghid Configurare Google Tag Manager (GTM) - Fish Trophy

Acest ghid te va ajuta să configurezi containerul GTM (`GTM-WFSK9N29`) pentru a funcționa perfect cu codul implementat deja în aplicația ta.

> [!IMPORTANT]
> Codul de tracking este deja instalat în aplicație (`index.html`). Tot ce trebuie să faci acum este să configurezi **Tags**, **Triggers** și **Variables** în interfața Google Tag Manager.

## 1. Accesare Cont
1. Mergi la [tagmanager.google.com](https://tagmanager.google.com/).
2. Deschide containerul creat pentru **Fish Trophy**.

---

## 2. Configurare Google Analytics 4 (GA4)

Trebuie să conectăm GTM la GA4 pentru a primi datele.

### Pasul 1: Crearea Tag-ului de Configurare
1. În meniul din stânga, apasă pe **Tags** > **New**.
2. Nume: `GA4 Configuration`.
3. **Tag Configuration**:
   - Alege **Google Analytics: GA4 Configuration**.
   - **Measurement ID**: Introdu ID-ul tău de GA4 (ex: `G-XXXXXXXXXX`).
4. **Triggering**:
   - Alege **All Pages** (Page View).
5. Salvează.

---

## 3. Configurare Consent Mode (GDPR)

Am implementat în site un widget care trimite alegerile utilizatorului către GTM prin evenimentul `consent_update`. Trebuie să configurăm GTM să asculte acest eveniment.

### Pasul 1: Activare Consent Overview
1. Mergi la **Admin** > **Container Settings**.
2. Bifează **Enable Consent Overview**.
3. Salvează.

### Pasul 2: Creare Variabile (Data Layer Variables)
Trebuie să "capturăm" valorile trimise din cod (ex: `granted` sau `denied`).

Creează câte o variabilă pentru fiecare tip de consimțământ:

1. **Variables** > **New** > **Data Layer Variable**.
2. Nume: `dlv - ad_storage`
   - **Data Layer Variable Name**: `consent.ad_storage`
3. Repetă pentru:
   - `dlv - analytics_storage` -> `consent.analytics_storage`
   - `dlv - ad_user_data` -> `consent.ad_user_data`
   - `dlv - ad_personalization` -> `consent.ad_personalization`

### Pasul 3: Creare Trigger pentru Actualizare Consimțământ
Acest trigger va declanșa tag-urile atunci când utilizatorul își schimbă preferințele.

1. **Triggers** > **New**.
2. Nume: `Event - Consent Update`.
3. Tip: **Custom Event**.
4. **Event Name**: `consent_update`.
5. Salvează.

---

## 4. Configurare Web Vitals (Performanță)

Codul tău trimite automat date despre performanță (LCP, CLS, INP) către GTM prin evenimentul `web_vitals`.

### Pasul 1: Creare Variabile pentru Web Vitals
1. **Variables** > **New** > **Data Layer Variable**.
2. Creează următoarele variabile:
   - `dlv - event_category` -> `event_category`
   - `dlv - event_label` -> `event_label`
   - `dlv - value` -> `value`
   - `dlv - metric_id` -> `metric_id`

### Pasul 2: Creare Trigger
1. **Triggers** > **New**.
2. Nume: `Event - Web Vitals`.
3. Tip: **Custom Event**.
4. **Event Name**: `web_vitals`.

### Pasul 3: Creare Tag GA4 Event
1. **Tags** > **New**.
2. Nume: `GA4 - Web Vitals`.
3. Tip: **Google Analytics: GA4 Event**.
4. **Configuration Tag**: Alege tag-ul creat la Pasul 2 (`GA4 Configuration`).
5. **Event Name**: `web_vitals`.
6. **Event Parameters** (Adaugă rânduri):
   - `event_category` -> `{{dlv - event_category}}`
   - `event_label` -> `{{dlv - event_label}}`
   - `value` -> `{{dlv - value}}`
   - `metric_id` -> `{{dlv - metric_id}}`
7. **Triggering**: Alege `Event - Web Vitals`.

---

## 5. Publicare și Testare

### Testare (Preview Mode)
1. Apasă butonul **Preview** (dreapta sus).
2. Introdu URL-ul site-ului (`http://localhost:5173` sau `https://fishtrophy.ro`).
3. Deschide consola de debug.
4. Interacționează cu bannerul de cookies. Ar trebui să vezi evenimentul `consent_update` în lista din stânga.
5. Verifică dacă tag-urile corecte s-au declanșat (Tags Fired).

### Publicare (Live)
1. După ce totul arată bine în Preview, apasă **Submit** (dreapta sus).
2. Dă un nume versiunii (ex: "Initial Setup - GA4 & Consent").
3. Apasă **Publish**.

> [!TIP]
> Modificările din GTM se propagă instantaneu pe site odată ce apeși Publish, fără a fi nevoie să modifici codul sursă al site-ului!
