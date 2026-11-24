# Energiestroom

Een rustige, mobile-first energieplanner. De MVP helpt iemand de huidige energie opmerken, passende activiteiten kiezen, 's avonds reflecteren en zonder prestatiedruk patronen herkennen.

## MVP

- Vandaag: energie 0–100, status `Leeg` tot `Vol`, energievraag/-bron en zachte suggestie.
- Activiteitenbibliotheek met energiekost, energiewinst en acht categorieën.
- Planner die te zware activiteiten verbergt op basis van de actuele energie.
- Avondreflectie met vrije tekst en gevoelslider.
- Inzichten per dag en activiteit, zonder streaks, punten of schuldtaal.
- Responsive warme interface, toetsenbordtoegankelijk en met dark mode.
- Supabase passwordless e-mailauth en user-isolatie via RLS.
- Expliciete lokale demo wanneer Supabase-variabelen ontbreken.

## Lokaal starten

Vereist Node.js 22 of nieuwer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Laat de twee Supabase-waarden leeg om de lokale demo te gebruiken. Demo-data en invoer blijven alleen in `localStorage`; de UI toont daarom zichtbaar **Lokale demo**. De demo claimt geen authenticatie of cloudopslag.

## Supabase instellen

1. Maak een Supabase-project.
2. Voer `supabase/migrations/20261124190000_initial_schema.sql` uit via de Supabase CLI of SQL Editor.
3. Zet in Authentication → URL Configuration de lokale en productie-URL als toegestane redirect-URL.
4. Kopieer `.env.example` naar `.env.local` en vul de project-URL en publieke anon key in.
5. Start de app opnieuw. Zonder actieve sessie verschijnt de passwordless e-mailinlog.

Gebruik nooit de service-role key in de browser. Alleen de publieke anon key hoort in `VITE_SUPABASE_ANON_KEY`.

## RLS en gegevensisolatie

Alle vier tabellen hebben RLS ingeschakeld. Elke policy vereist voor lezen, schrijven, wijzigen én verwijderen:

```sql
(select auth.uid()) = user_id
```

`user_id` is verplicht en verwijst met `on delete cascade` naar `auth.users`. De `anon`-rol heeft geen tabelrechten; alleen `authenticated` krijgt CRUD-rechten, waarna RLS per rij filtert. Zowel `USING` als `WITH CHECK` zijn aanwezig, zodat een gebruiker een record ook niet naar een andere eigenaar kan verplaatsen. Ingebouwde bibliotheekactiviteiten zijn statische, niet-persoonlijke clientdata; persoonlijke check-ins, plannen, reflecties en eigen activiteiten zijn geïsoleerd.

## Kwaliteitscontroles

```bash
npm run lint
npm run test
npm run build
```

TypeScript draait met `strict`, `noUncheckedIndexedAccess` en `exactOptionalPropertyTypes`. Domeintests bewaken statusgrenzen, voorbeeldwaarden en het plannerfilter; componenttests bewaken de primaire navigatie en check-in.

## Bewuste MVP-beperkingen

- Inzichten zijn beschrijvend en eenvoudig; geen medische interpretatie of voorspellend model.
- De MVP biedt nog geen beheerformulier voor eigen activiteiten, hoewel schema en datalaag dit ondersteunen.
- Offline synchronisatie en conflictresolutie zijn niet opgenomen. Demo-modus blijft lokaal; Supabase-modus gebruikt serverdata.
