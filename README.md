# In-Car Conversational AI

Simulator de cabină auto cu asistent conversațional, interfață în română și engleză și hartă interactivă. Controlează funcții de confort într-un simulator software, fără o mașină fizică sau controlul funcțiilor de condus.

## Funcționalități

- Comenzi text și vocale, interpretare cu OpenAI și validare în Python.
- Climatizare, ventilator, încălzire și ventilație scaune, lumini ambientale și audio.
- Conturi și profiluri de confort persistente în PostgreSQL.
- Hartă, calcul de rute, adrese și trasee salvate, vehicule și estimarea consumului.
- Interfață și răspunsuri în română și engleză.

## Structură și cerințe

- `frontend/`: Next.js, React, TypeScript, Tailwind CSS și Leaflet.
- `backend-app/`: API FastAPI, simulator Python și interfața alternativă Streamlit.
- `backend-app/docker-compose.yml`: PostgreSQL pentru dezvoltare locală.
- `docs/istoric/`: cerințe și planuri anterioare; pot descrie versiuni vechi.

Sunt necesare Python 3.11+, Node.js 20.9+ cu npm, Docker cu Docker Compose și o cheie API OpenAI pentru funcțiile AI. Acestea folosesc servicii cloud. Harta folosește OpenStreetMap, Nominatim și OSRM și necesită internet.

## Instalare și pornire

Comenzile sunt pentru PowerShell, pornind din folderul acestui README.

### Backend și baza de date

```powershell
cd backend-app
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
docker compose up -d postgres
```

Completează `OPENAI_API_KEY` în `backend-app/.env`. Conexiunea implicită este `postgresql://postgres:postgres@localhost:5433/in_car_ai`. Datele de acces din Compose sunt pentru dezvoltare locală.

```powershell
python -m uvicorn backend.main:app --reload --port 8000
```

Backend-ul creează automat tabelele necesare; nu trebuie importat un backup SQL. Documentația API: http://localhost:8000/docs.

### Frontend

Într-un terminal nou, din folderul proiectului:

```powershell
cd frontend
npm ci
npm run dev
```

Deschide http://localhost:3000 și creează un cont. Frontend-ul comunică implicit cu backend-ul de pe `http://localhost:8000`.

### Opțional: Streamlit

Din `backend-app`, cu mediul virtual activat:

```powershell
streamlit run app.py
```

Disponibil de regulă la http://localhost:8501. Profilurile locale se creează automat în `backend-app/data/profiles.json`; interfața web folosește PostgreSQL.

## Verificări

Backend, din `backend-app`, cu mediul virtual activat:

```powershell
python -m unittest discover -s tests
```

Frontend, din `frontend`:

```powershell
npm run typecheck
npm run lint
npm run build
```

Verificarea TypeScript trebuie rulată separat: configurația actuală Next.js o omite în timpul build-ului.

## Publicare în Git

Se păstrează codul, `package-lock.json`, `requirements.txt`, configurațiile și `.env.example` fără chei reale. `.gitignore` exclude configurațiile locale, mediile virtuale, dependențele instalate, build-urile, backupurile SQL și profilurile personale locale.

Dacă un backup sau un secret a fost deja comis, `.gitignore` nu îl elimină din istoricul Git. Înainte de publicarea istoricului trebuie curățate și commiturile respective; cheile expuse trebuie înlocuite.
