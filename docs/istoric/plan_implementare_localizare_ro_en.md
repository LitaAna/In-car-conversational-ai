# Plan consolidat: localizare completă RO ↔ EN

## 1. Scope și principii

Se localizează întreaga aplicație runtime, fără pierderea stării cabinei, profilurilor, rutelor, favoritelor, activității sau redării media. Se separă `locale UI` (`ro`/`en`), limba comenzii și identificatorii tehnici. Textele afișate nu sunt identificatori logici.

Scope: frontendul Next.js (`page.tsx`, `MapPanel.tsx`, `ConciergeCard.tsx`, `vehicle-status.ts`, `layout.tsx`, `globals.css`), backendul FastAPI și serviciile Python, plus `app.py` Streamlit legacy. Streamlit se localizează cu același sistem sau se declară oficial în afara fluxului.

## 2. Arhitectura i18n

Se creează `frontend/app/i18n/` cu `context.tsx`, `translations.ro.ts`, `translations.en.ts`, `types.ts` și `formatters.ts`. `LocaleProvider` se montează în `layout.tsx`, iar componentele folosesc `useI18n()` și `t()`.

Dicționarele au aceleași chei pentru `app`, `auth`, `navigation`, `climate`, `seats`, `lights`, `media`, `profiles`, `activity`, `voice`, `errors`, `vehicle` și `settings`. Se verifică automat cheile lipsă sau extra.

## 3. Identificatori, migrare și persistență

Tab-urile folosesc `home`, `maps`, `climate`, `seats`, `lights`, `media`. Favoritele folosesc `home` și `work`.

Aliasuri:

```text
home: acasă, acasa, home, my home, house
work: serviciu, serviciul, work, office, workplace
```

Se migrează valorile vechi `Hărți → maps`, `Acasă → home`, `Serviciu → work` și următoarele chei localStorage:

```text
in-car-favorite-addresses
in-car-saved-routes
in-car-recent-routes
in-car-active-route
in-car-navigation-runtime
in-car-navigation-preview
pending-car-route-command
pending-car-route-values
voiceAssistantEnabled
colorTheme
in-car-locale
```

În PostgreSQL se adaugă `app_users.locale TEXT NOT NULL DEFAULT 'ro'` cu `ADD COLUMN IF NOT EXISTS`. Datele vechi se citesc, se convertesc și se resalvează fără pierderi.

## 4. Acoperirea frontendului

Se localizează toate textele, placeholder-urile, `aria-label`, `title`, tooltips, erorile, fallback-urile, activitatea și mesajele TTS din dashboard, autentificare, climatizare, ventilație, scaune, volan, lumini, media, radio, profiluri, navigație, teme, asistent vocal, autonomie, încărcare, service, ceas, dată și status vehicul.

Stările care trebuie păstrate la schimbarea limbii sunt:

```text
temperature, fanSpeed, airflowDirection, ambientIntensity, volume,
isPlaying, airConditioning, steeringWheelHeating, seatHeating,
seatVentilation, seatVentilationLevel, ambientColor, ambientZones,
activeProfile, voiceAssistantEnabled, colorTheme, radioStation,
profiles, profileForm, profileName, currentTime, currentDate,
listening, command, activeTab, activity
```

Pentru hartă se păstrează `origin`, `destination`, `routes`, `savedRoutes`, `recentRoutes`, `favoriteAddresses`, `simulationState`, `simulationElapsed`, `simulationStartedAt`, `simulationSpeed`, `loading`, `error`, `suggestions` și `navigationHydrated`. Coordonele, geometria și ID-urile nu se traduc.

## 5. Matricea funcționalităților

| Funcționalitate | Câmpuri | Acțiuni |
|---|---|---|
| Temperatură | `temperature` | `set_temperature` |
| Ventilator | `fan_speed` | `set_fan_speed` |
| Direcție aer | `airflow_direction` | `set_airflow_direction` |
| Aer condiționat | `air_conditioning` | `set_air_conditioning` |
| Încălzire volan | `steering_wheel_heating` | `set_steering_wheel_heating` |
| Încălzire scaune | `seat_heating` | `set_seat_heating` |
| Ventilație scaune | `seat_ventilation`, `seat_ventilation_level` | `set_seat_ventilation`, `set_seat_ventilation_level` |
| Lumini generale/zone | `ambient_color`, `ambient_intensity`, `ambient_zones` | `set_ambient_color`, `set_ambient_intensity`, `set_ambient_zone_color`, `set_ambient_zone_intensity` |
| Volum | `audio_volume` | `set_audio_volume` |
| Sursă/redare media | `media_source`, `media_playing` | `set_media_source`, `set_media_playback` |
| Radio/piese | `radio_station`, `current_track` | `start_radio`, `change_radio_station`, `next_track`, `previous_track` |
| Navigație | origine, destinație, rută | `set_navigation_route` |
| Profiluri | profil/preset | `identify_profile`, `create_profile`, `update_profile_preset` |
| Limbă | `locale` | `change_locale` |

Validări: temperatură în limitele simulatorului, ventilator 0–5, încălzire scaun 0–3, intensitate și volum 0–100, direcții `face`/`feet`/`windshield`/`mixed`, ținte de scaun stabile, culori și surse media validate. Ventilația scaunului rămâne distinctă de ventilatorul general.

Presetul memorează temperatura, ventilatorul, culoarea și volumul. Nu pornește automat aerul, scaunele, intensitatea, sursa media sau muzica.

## 6. Comenzi, LLM, STT și TTS

Comenzile RO/EN produc aceleași acțiuni tehnice. Se adaugă comenzile explicite `Treci în engleză`/`Switch to English` și `Treci în română`/`Switch to Romanian`, care produc `change_locale` fără să modifice simulatorul.

`prompts.py` și `command_engine.py` acceptă ambele limbi, aliasurile favorite, toate acțiunile din matrice și cererile de siguranță. `stt.py` returnează transcript și limbă. `tts.py` folosește vocea corespunzătoare locale-ului UI. Clarificările și confirmările sunt în locale-ul UI, nu în limba accidentală a comenzii.

Se blochează în ambele limbi frână/brake, accelerație/acceleration, direcție/steering, cruise control, schimbător/gear și viteza mașinii/vehicle speed.

## 7. Backend și API

Se verifică endpointurile active `/health`, `/api/auth/*`, `/api/state`, `/api/profiles`, `/api/routes`, `/api/action`, `/api/command`, `/api/voice` și `/api/speech`.

`CommandRequest` și `SpeechRequest` primesc `locale: Literal["ro", "en"] = "ro"`, iar `/api/auth/me` returnează locale-ul utilizatorului. Backendul returnează `message_key` și `message_params`, nu texte UI hardcodate.

```json
{
  "status": "implemented",
  "action": "set_fan_speed",
  "message_key": "climate.fanUpdated",
  "message_params": { "level": 3 }
}
```

## 8. Activitate și formatare

Activitatea, notificările, erorile și statusurile se salvează semantic cu cheie și parametri, pentru traducere retroactivă. Se folosesc `Intl.DateTimeFormat(locale)` și `Intl.NumberFormat(locale)` pentru dată, oră, distanță, durată, procente și ora sosirii. `<html lang>` se sincronizează cu locale-ul activ.

## 9. Testare

Pentru fiecare rând din matrice se testează în RO și EN: comandă text, comandă vocală, payload, validare, confirmare UI, TTS, eroare, `unchanged`, schimbare de limbă după/în timpul acțiunii și păstrarea stării.

Scenariul end-to-end este:

```text
login → comandă RO → schimbare EN → comandă EN
→ navigate to work → schimbare RO → verificare stare, profil,
rută, favorite, activitate și media
```

Se repetă `RO → EN → RO → EN` cu sesiune autentificată.

## 10. Verificări finale

Se execută typecheck, lint, build, compilare/import backend, teste i18n/parser/migrare, teste API, verificare chei RO/EN, scanare texte hardcodate și scanare comparații după `Hărți`/`Serviciu`. Runtime-ul se verifică pe `http://localhost:3000` și `http://localhost:8000/health`, apoi în dashboardul autentificat.

## 11. Criterii de acceptanță

Taskul este complet numai dacă toate textele și funcționalitățile runtime au RO/EN, identificatorii sunt independenți de limbă, API-ul transmite locale, LLM/STT/TTS funcționează bilingv, favoritele/rutele/profilurile nu pierd date, activitatea se traduce retroactiv, nu există texte mixte, iar schimbarea repetată a limbii nu pierde nicio stare.

## 12. Precondiții tehnice înainte de implementarea i18n

Auditul aplicației active pe localhost a identificat următoarele alinieri obligatorii:

### Paritate între acțiuni

Lista acțiunilor trebuie să fie identică în:

```text
frontend
command_schema.py
command_engine.py
validator.py
simulator.py
status_service.py
```

În implementarea actuală, frontendul/simulatorul folosesc și următoarele acțiuni care trebuie adăugate/verificate în `command_schema.py` și în prompt:

```text
set_seat_ventilation_level
set_ambient_zone_color
set_ambient_zone_intensity
```

Rezultatele speciale ale interpretării trebuie tratate separat și testate în ambele limbi:

```text
change_locale
unsafe_request
no_action
```

Se va adăuga un test de paritate care eșuează dacă o acțiune există în frontend sau simulator, dar lipsește din schema LLM, validator ori status service.

### Paritate API

Schema OpenAPI activă trebuie să ajungă de la forma actuală:

```text
CommandRequest : message
SpeechRequest  : text
/api/auth/me   : email
```

la forma localizată:

```text
CommandRequest : message, locale
SpeechRequest  : text, locale
/api/auth/me   : email, locale
```

Aceste modificări sunt obligatorii înainte ca frontendul să poată garanta răspunsuri și TTS în locale-ul UI.

### Verificarea runtime finală

După implementare, verificarea se face în această ordine:

1. `GET http://localhost:8000/health`;
2. `GET http://localhost:8000/openapi.json`;
3. verificarea schemelor `CommandRequest` și `SpeechRequest`;
4. login în frontend;
5. verificarea tuturor tab-urilor;
6. executarea tuturor acțiunilor din matrice;
7. schimbarea `RO → EN → RO` în timpul fiecărui flux;
8. verificarea stării, profilului, traseului, favoritelor, activității și media.

## 13. Pregătiri obligatorii înainte de localizarea efectivă

### 13.1 Decizia privind Streamlit

Înainte de implementarea UI se stabilește oficial una dintre variante:

1. aplicația Streamlit este localizată cu același sistem RO/EN; sau
2. Streamlit este declarat legacy, eliminat din fluxul oficial și documentat ca fiind în afara scope-ului.

Nu se va crea un al doilea sistem independent de traduceri.

### 13.2 Dicționarul și nomenclatura cheilor

Se aprobă lista finală de chei pentru traduceri înainte de migrarea componentelor:

```text
app.*
auth.*
navigation.*
climate.*
seats.*
lights.*
media.*
profiles.*
activity.*
voice.*
errors.*
vehicle.*
settings.*
```

Fiecare cheie trebuie să existe în română și engleză. Nu se acceptă folosirea textului afișat ca fallback logic.

### 13.3 Conectarea frontendului la locale-ul API

După introducerea `LocaleProvider`, frontendul trebuie să trimită locale-ul activ către:

```text
/api/command
/api/voice
/api/speech
```

La schimbarea limbii, frontendul trebuie să apeleze:

```text
PUT /api/auth/locale
```

La autentificare, locale-ul primit din `/api/auth/me` are prioritate față de fallback-ul local.

### 13.4 Contractul mesajelor backend

Înainte de migrarea tuturor textelor, backendul trebuie să returneze mesaje semantice:

```json
{
  "message_key": "climate.fanUpdated",
  "message_params": {
    "level": 3
  }
}
```

Frontendul construiește mesajul final folosind `t(message_key, message_params)`. Textele brute rămân doar pentru loguri tehnice.

### 13.5 Testul de paritate al acțiunilor

Se adaugă un test automat care compară lista acțiunilor din:

```text
frontend
command_schema.py
command_engine.py
validator.py
simulator.py
status_service.py
```

Testul trebuie să semnaleze dacă o acțiune este folosită de frontend sau simulator, dar lipsește din schema LLM, validator sau status service.

Se verifică separat acțiunile speciale:

```text
change_locale
unsafe_request
no_action
```

### 13.6 Migrarea PostgreSQL

Migrarea trebuie testată pe baza de date existentă, nu numai pe o bază nouă:

1. se adaugă `app_users.locale` cu `IF NOT EXISTS`;
2. utilizatorii existenți primesc `ro`;
3. profilurile, rutele și sesiunile rămân intacte;
4. login-ul returnează locale-ul utilizatorului;
5. schimbarea locale-ului persistă după logout/login.

### 13.7 Teste înainte de migrarea UI

Înainte să fie înlocuit primul text din frontend se verifică:

- `RO → EN → RO` fără pierderea stării;
- favoritele `home` și `work`;
- traseul activ;
- profilul activ;
- redarea media;
- activitatea recentă;
- TTS-ul în locale-ul UI;
- sesiunile existente;
- migrarea localStorage vechi.

### 13.8 Ordinea oficială de implementare

Implementarea se va face în această ordine:

```text
1. LocaleProvider și dicționare
2. Identificatori interni stabili
3. Migrarea localStorage
4. page.tsx
5. MapPanel.tsx
6. componentele cabinei
7. profiluri și autentificare
8. contractul message_key/message_params
9. integrarea API cu locale
10. LLM, STT și TTS
11. Streamlit sau eliminarea lui oficială
12. teste unitare și API
13. teste end-to-end RO → EN → RO

## 14. Decizii aprobate înainte de implementare

Următoarele decizii sunt definitive și trebuie respectate în implementare și testare.

### 14.1 Limba implicită

Limba implicită a aplicației este româna:

```text
locale = "ro"
```

### 14.2 Schimbarea limbii

Limba se schimbă numai prin:

- comandă vocală explicită;
- control vizual dedicat.

Limba UI nu se schimbă automat doar pentru că utilizatorul a formulat o comandă într-o altă limbă.

### 14.3 Prioritatea locale-ului

Locale-ul se determină în această ordine:

```text
profil utilizator → localStorage → ro
```

După autentificare, locale-ul din profil are prioritate față de valoarea locală.

### 14.4 Răspunsul vocal

Răspunsul TTS este generat în limba interfeței, nu automat în limba ultimei comenzi.

Exemplu:

```text
UI în engleză + comandă în română = răspuns vocal în engleză
```

### 14.5 Sesiuni fără autentificare

Înainte de login, locale-ul este păstrat în `localStorage`. După login, valoarea este sincronizată cu profilul utilizatorului.

### 14.6 Streamlit

Streamlit este tratat ca interfață legacy și nu face parte din fluxul oficial principal. Dacă este păstrat temporar, trebuie să folosească aceleași chei și aceleași traduceri ca frontendul Next.js.

### 14.7 Mesaje backend

Backendul returnează exclusiv:

```text
message_key + message_params
```

Frontendul generează textul final. Mesajele brute rămân doar pentru logare tehnică.

### 14.8 Fallback pentru traduceri

Dacă o traducere lipsește:

1. aplicația folosește temporar traducerea română;
2. nu blochează interfața;
3. înregistrează cheia lipsă în log;
4. testul de completitudine a traducerilor raportează eroarea.

### 14.9 Terminologie aprobată

```text
work              → Work / Serviciu
home              → Home / Acasă
fan               → Ventilator
seat ventilation  → Ventilație scaun
ambient lights    → Lumini ambientale
```

Identificatorii interni rămân `work`, `home`, `fan` și celelalte chei tehnice.

### 14.10 Unități și formatare

În ambele limbi se păstrează:

- grade Celsius;
- kilometri;
- procente.

Se schimbă doar formatarea localizată a numerelor, datei, orei și duratelor.

### 14.11 Migrarea datelor vechi

Valorile existente se convertesc automat:

```text
Hărți    → maps
Acasă    → home
Serviciu → work
```

Migrarea trebuie să fie idempotentă și să nu creeze duplicate.

### 14.12 Mediu de testare

Înaintea testării finale trebuie să fie disponibile:

- o sesiune autentificată de test;
- o bază de date PostgreSQL de test;
- cel puțin un profil;
- cel puțin o adresă `home` și una `work`;
- cel puțin o rută salvată;
- acces la frontend și backend pe localhost.

### 14.13 Configurația TTS

Se păstrează configurația actuală ca default pentru ambele limbi, pentru comportament consistent:

```text
OPENAI_TTS_MODEL    = tts-1
OPENAI_TTS_VOICE_RO = coral
OPENAI_TTS_VOICE_EN = coral
```

Vocile se configurează prin variabile de mediu, fără modificarea codului. Dacă o voce localizată nu este disponibilă, `coral` este fallback-ul.

### 14.14 Glosar aprobat

| ID intern | Română | Engleză |
|---|---|---|
| `home` | Acasă | Home |
| `work` | Serviciu | Work |
| `climate` | Climă | Climate |
| `fan` | Ventilator | Fan |
| `seatVentilation` | Ventilație scaun | Seat ventilation |
| `ambientLights` | Lumini ambientale | Ambient lights |
| `airConditioning` | Aer condiționat | Air conditioning |
| `volume` | Volum | Volume |
| `route` | Traseu | Route |
| `navigation` | Navigație | Navigation |
| `profile` | Profil | Profile |
| `voiceAssistant` | Asistent vocal | Voice assistant |
| `currentLocation` | Locația curentă | Current location |
| `paused` | Pe pauză | Paused |
| `finished` | Finalizat | Finished |

Aceasta este sursa de adevăr pentru dicționare și confirmări TTS.

### 14.15 Datele standard de test

Se folosește un cont tehnic separat, creat numai în baza de date de test:

```text
email: qa.incar@example.test
password: injectat prin QA_TEST_PASSWORD, niciodată în repository
```

Datele standard sunt:

```text
profil: Victor
temperatură: 22°C
ventilator: nivel 3
culoare lumini: green
volum: 40%
favorite: home și work
o rută recentă și o rută favorită
```

Adresele de test sunt sintetice sau configurate separat și nu conțin date personale reale.

### 14.16 Backup și rollback PostgreSQL

Înaintea migrării se execută și se verifică:

```text
pg_dump DATABASE_URL > backup_before_locale.sql
```

Se verifică restaurarea într-o bază temporară, utilizatorii, profilurile, rutele și coloana `locale`. Dacă migrarea eșuează, rollback-ul se face prin restaurarea backupului. Nu se execută operații destructive fără backup verificat.

### 14.17 Criteriul final de acceptanță

Implementarea este acceptată numai dacă toate acțiunile funcționează în RO și EN, fiecare are confirmare UI și TTS, locale-ul persistă după logout/login, profilul, favoritele, ruta și media rămân intacte după `RO → EN → RO`, fallback-ul este testat, migrarea PostgreSQL este verificată prin backup/restaurare și nu există termeni în afara glosarului aprobat.
```
