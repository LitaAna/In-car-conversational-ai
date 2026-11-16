# Plan de implementare — Etapa 1

## 1. Scopul etapei

Prima etapă urmărește construirea unui schelet funcțional pentru controlul vocal al cabinei, cu accent pe backend.

Aplicația trebuie să poată:

- primi comenzi scrise și vocale;
- transcrie comenzile vocale în text;
- interpreta intenția utilizatorului cu un model OpenAI;
- transforma intenția într-o comandă structurată;
- valida comanda în Python;
- modifica starea simulată a cabinei;
- crea și încărca profiluri de utilizatori;
- aplica presetul profilului activ;
- salva profilele în `profiles.json`;
- returna un JSON cu modificarea efectuată și starea generală a cabinei.

Frontend-ul va fi minimal și va demonstra funcționarea backend-ului. Nu urmărim în această etapă o interfață finală sau un display realist al mașinii.

## 2. Cerințe preluate din proiectul de referință

Vom păstra modul de lucru din `smart-librarian`:

- FastAPI pentru backend;
- frontend static HTML/CSS/JavaScript;
- frontend-ul este servit de FastAPI;
- comunicare prin endpoint-uri JSON;
- captură vocală cu `MediaRecorder` în browser;
- trimiterea audio către `POST /api/stt`;
- transcriere prin OpenAI Speech-to-Text;
- configurare prin `.env` și `python-dotenv`;
- rulare cu `uvicorn backend.main:app --reload`;
- aplicație accesibilă la `http://localhost:8000`.

Nu vom folosi Streamlit pentru această etapă, deoarece proiectul ales ca referință pentru hostare și voice folosește FastAPI cu frontend separat.

## 3. Modele și configurare propuse

În `.env`:

```env
OPENAI_API_KEY=...
CHAT_MODEL=gpt-4o-mini
STT_MODEL=whisper-1
```

`gpt-4o-mini` este suficient pentru extragerea intenției și generarea comenzilor structurate, iar `whisper-1` păstrează mecanismul STT deja folosit în `smart-librarian`.

Cheia API trebuie citită exclusiv din `.env`. Fișierul `.env` trebuie inclus în `.gitignore` și nu trebuie trimis în repository.

## 4. Structura inițială a proiectului

Structura este orientativă și poate fi ajustată în timpul implementării.

```text
In-Car-Conversational-AI/
├── backend/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── command_engine.py
│   ├── prompts.py
│   ├── command_schema.py
│   ├── validator.py
│   ├── cabin_state.py
│   ├── simulator.py
│   ├── profile_service.py
│   ├── stt.py
│   └── status_service.py
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── data/
│   └── profiles.json
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

## 5. Atribute controlabile în etapa 1

Toate cele 10 atribute trebuie să poată fi modificate prin comenzi text sau vocale:

1. temperatura cabinei;
2. viteza ventilatorului;
3. direcția fluxului de aer;
4. aerul condiționat;
5. încălzirea scaunului;
6. ventilația scaunului;
7. culoarea luminilor ambientale;
8. intensitatea luminilor ambientale;
9. volumul sistemului audio;
10. sursa media și redarea.

## 6. Atribute memorate în preset

Profilul utilizatorului va memora următoarele șase preferințe:

- temperatura cabinei;
- viteza ventilatorului;
- culoarea luminilor ambientale;
- intensitatea luminilor ambientale;
- direcția fluxului de aer;
- volumul audio.

Volumul audio este memorat separat de redarea media. Încărcarea presetului nu pornește muzica.

Următoarele atribute rămân setări de moment și nu sunt încărcate automat din profil:

- aerul condiționat;
- încălzirea scaunului;
- ventilația scaunului;
- sursa media și redarea.

## 7. Fluxurile principale

### 7.1 Comandă text sau vocală

```text
Utilizator
   ↓
Text direct sau audio
   ↓
Speech-to-text, dacă este audio
   ↓
Interpretare LLM
   ↓
Comandă structurată
   ↓
Validare Python
   ↓
Simulator cabină
   ↓
Verificare stare
   ↓
Răspuns JSON
```

### 7.2 Identificarea unui profil

Comanda:

```text
„Sunt Victor.”
```

Flux:

1. LLM-ul extrage intenția `identify_profile` și numele `Victor`.
2. `profile_service.py` caută profilul în `data/profiles.json`.
3. Presetul este validat.
4. Sunt aplicate cele șase valori presetate.
5. Simulatorul este verificat după aplicare.
6. Backend-ul returnează profilul activ și starea generală.

Nu se face recunoaștere biometrică a vocii în această etapă. Identificarea este semantică, pe baza numelui rostit sau scris.

### 7.3 Crearea unui profil

Profilul poate fi creat în două moduri:

- prin comandă text/vocală;
- prin formular simplu în frontend.

Exemplu de comandă:

```text
„Creează un profil pentru Victor.”
```

Flux:

1. aplicația primește numele profilului;
2. citește starea curentă a simulatorului;
3. extrage cele șase atribute de preset;
4. validează valorile;
5. salvează profilul în `profiles.json`;
6. returnează profilul creat în format JSON.

Formularul va permite introducerea numelui și a celor șase valori memorate. Valorile nespecificate pot folosi starea curentă a simulatorului sau valori implicite, decizie care trebuie menținută consistent în implementare.

### 7.4 Actualizarea unui preset

Comanda:

```text
„Pentru profilul meu, setează temperatura preferată la 23 de grade.”
```

Presetul se actualizează numai după ce:

1. comanda a fost validată;
2. valoarea a fost aplicată în simulator;
3. valoarea actuală a fost verificată;
4. modificarea a fost confirmată cu succes.

## 8. Contracte backend

### `GET /api/health`

Verifică dacă serverul funcționează.

Răspuns:

```json
{
  "status": "ok"
}
```

### `POST /api/stt`

Primește un fișier audio `multipart/form-data` și returnează transcriptul.

Răspuns:

```json
{
  "text": "Sunt Victor"
}
```

### `POST /api/command`

Primește textul unei comenzi și returnează rezultatul procesării.

Exemplu de request:

```json
{
  "message": "Setează temperatura la 22 de grade"
}
```

Exemplu de răspuns:

```json
{
  "status": "implemented",
  "active_profile": null,
  "last_command": {
    "action": "set_temperature",
    "requested_value": 22,
    "actual_value": 22
  },
  "cabin_state": {
    "temperature": 22,
    "fan_speed": 2,
    "airflow_direction": "face",
    "air_conditioning": false,
    "seat_heating": 0,
    "seat_ventilation": false,
    "ambient_color": "white",
    "ambient_intensity": 50,
    "audio_volume": 30,
    "media_source": "none",
    "media_playing": false
  }
}
```

### `GET /api/profiles`

Returnează profilele existente sau, într-o variantă minimală, doar numele lor.

### `POST /api/profiles`

Creează un profil din formularul frontend sau dintr-o comandă procesată.

Exemplu:

```json
{
  "profile_name": "Victor",
  "preset": {
    "temperature": 22,
    "fan_speed": 3,
    "airflow_direction": "feet",
    "ambient_color": "green",
    "ambient_intensity": 50,
    "audio_volume": 40
  }
}
```

### `GET /api/cabin-state`

Returnează starea generală a simulatorului, fără a apela modelul AI.

## 9. Rolul componentelor backend

### `main.py`

Definește aplicația FastAPI, endpoint-urile, servirea frontend-ului și conversia erorilor în răspunsuri HTTP.

### `config.py`

Citește `.env`, configurează modelul chat, modelul STT, limitele atributelor, căile către `profiles.json` și valorile implicite.

### `command_engine.py`

Coordonează apelul către OpenAI și transformă mesajul utilizatorului într-o comandă structurată. Nu modifică direct simulatorul.

### `prompts.py`

Conține instrucțiunile pentru interpretarea comenzilor, profilurilor și atributelor disponibile.

### `command_schema.py`

Definește schema comenzilor și a presetelor. În etapa inițială poate folosi modele Pydantic pentru răspunsuri predictibile.

### `validator.py`

Validează acțiunile, limitele numerice, valorile text și profilurile înainte de executare.

### `cabin_state.py`

Definește structura stării curente a cabinei și valorile implicite.

### `simulator.py`

Aplică modificările validate și returnează starea curentă după executare.

### `profile_service.py`

Citește și scrie `profiles.json`, creează profiluri, caută profilul activ, aplică preseturi și actualizează preferințe.

### `stt.py`

Păstrează implementarea inspirată direct din `smart-librarian`: primește bytes audio, construiește un fișier `BytesIO`, setează numele fișierului și apelează transcrierea OpenAI.

### `status_service.py`

Compară valorile cerute cu valorile din simulator și construiește răspunsul JSON final.

## 10. Frontend minimal

Frontend-ul va conține:

- input text pentru comenzi;
- buton microfon;
- afișarea transcriptului;
- buton pentru trimiterea comenzii;
- formular pentru creare profil;
- selectarea sau identificarea profilului activ;
- afișarea ultimei modificări;
- afișarea stării generale în JSON.

Nu este necesară în această etapă o interfață vizuală complexă pentru mașină. Un bloc JSON este suficient pentru demonstrarea backend-ului.

## 11. Testare minimă

Trebuie testate cel puțin:

- o comandă text pentru fiecare atribut;
- o comandă vocală transcrisă și executată;
- o comandă cu valoare invalidă;
- crearea unui profil prin formular;
- crearea unui profil prin comandă vocală/text;
- încărcarea profilului prin „Sunt Victor”;
- aplicarea celor șase valori presetate;
- faptul că muzica nu pornește la încărcarea profilului;
- faptul că atributele de moment nu sunt schimbate automat;
- actualizarea unui preset;
- persistența profilului după restartul serverului;
- returnarea stării generale în JSON.

## 12. Împărțirea recomandată pe branch-uri

Pentru lucru în echipă:

```text
main
├── feature/backend-skeleton
├── feature/cabin-simulator
├── feature/command-engine
├── feature/profile-service
├── feature/speech-to-text
└── feature/minimal-frontend
```

Fiecare branch trebuie să pornească de la ultima versiune a lui `main` și să fie integrat prin Pull Request.

## 13. Criterii de finalizare pentru etapa 1

Etapa este considerată finalizată când:

- serverul pornește cu aceeași comandă ca `smart-librarian`;
- frontend-ul este servit la `http://localhost:8000`;
- comenzile text și vocale ajung în același flux backend;
- transcriptul este afișat și procesat;
- toate cele 10 atribute pot fi modificate prin comenzi;
- se poate crea un profil prin comandă și prin formular;
- profilul este salvat în `profiles.json`;
- profilul poate fi încărcat prin identificare semantică;
- cele șase atribute presetate sunt aplicate corect;
- atributele de moment și redarea media nu sunt activate automat;
- backend-ul returnează JSON-ul cu ultima modificare și starea generală;
- erorile și valorile invalide sunt returnate fără confirmări false.
