# FishingEntryModal - Documentație Componentă

## Overview
Componentă unificată pentru adăugarea și editarea atât a recordurilor, cât și a capturilor. Înlocuiește 4 modale separate (`RecordSubmissionModal`, `EditRecordModal`, `CatchSubmissionModal`, `EditCatchModal`).

## Dimensiune
- **1103 linii** (depășește pragul de 500 linii din reguli)
- **Status**: Funcțional, stabil, nu este folosit des

## Structură Componentă

### Secțiuni principale:

1. **Tipuri și Interfețe** (linii 12-80)
   - `EntryType`, `Mode`
   - `Species`, `FishingLocation`
   - `BaseEntry`
   - `FishingEntryModalProps`

2. **State Management** (linii 93-121)
   - Form data state
   - Species/locations lists
   - Upload state
   - Preview URLs

3. **Hooks și Logică** (linii 124-534)
   - Field requirements logic
   - Data loading (species, locations)
   - Form population (edit mode)
   - File handling (upload/delete)
   - Validation

4. **Submit Logic** (linii 536-822)
   - Upload files to R2
   - Create/Update records
   - Create/Update catches
   - Delete logic

5. **UI Rendering** (linii 824-1211)
   - Modal structure
   - Form fields (Species, Location, Date, Weight, Length)
   - File upload UI
   - Submit buttons

## Posibilă Refactorizare (viitor)

Dacă va crește în complexitate, poate fi împărțit în:

```
FishingEntryModal.tsx (~400 linii) - Orchestrator principal
├── components/
│   ├── FishingEntryFormFields.tsx (~300 linii) - Toate câmpurile
│   ├── FishingEntryFileUpload.tsx (~200 linii) - Upload poze/video
│   └── FishingEntryHeader.tsx (~50 linii) - Header cu titlu/butoane
├── hooks/
│   ├── useFishingEntryForm.ts (~200 linii) - Logică form
│   └── useFishingEntryUpload.ts (~150 linii) - Logică upload R2
└── types/
    └── fishingEntry.ts (~50 linii) - Tipuri TypeScript
```

**Momentan**: Nu este necesar. Componenta este funcțională și stabilă.

