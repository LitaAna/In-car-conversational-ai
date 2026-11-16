# Workflow proiect: In-Car Conversational AI local

## Scopul proiectului

Proiectul implementează un asistent conversațional local pentru controlul unor funcții non-driving ale unei mașini, folosind un model local, cod Python și un simulator software al cabinei.

Aplicația va permite identificarea utilizatorilor și aplicarea unor preferințe personale memorate în profiluri. În prima versiune, profilurile vor conține temperatura cabinei, viteza ventilatorului, culoarea luminilor ambientale și volumul audio implicit, fără pornirea muzicii.

Detaliile de implementare sunt documentate în [workflow_proiect_ai_conversational_auto_detalii.md](workflow_proiect_ai_conversational_auto_detalii.md), iar lista atributelor este documentată în [atribute_controlabile.md](atribute_controlabile.md).

## 1. Workflow complet pentru o comandă

```text
Voce utilizator
    ↓
Speech-to-text local
    ↓
LLM local
    ↓
Identificare profil / interpretare comandă
    ↓
Comandă structurată / JSON
    ↓
Validare Python
    ↓
Aplicare preset sau executare comandă punctuală
    ↓
Executare în simulatorul cabinei
    ↓
Citirea stării curente din simulator
    ↓
Compararea valorilor dorite cu valorile actuale
    ↓
Generarea rezultatului comenzii
    ↓
Actualizarea statusului complet al cabinei
    ↓
Răspuns vocal și afișare pe display-ul simulat al mașinii
```

Fluxul pentru identificarea unui profil poate începe cu o comandă precum „Sunt Victor”. După găsirea profilului, aplicația aplică doar valorile incluse în preset. Atributele care depind de moment nu sunt modificate automat.

## 2. Organizarea proiectului pe fișiere

```text
car_assistant/
├── src/
│   ├── config.py
│   ├── prompts.py
│   ├── app.py
│   ├── speech_to_text.py
│   ├── local_llm.py
│   ├── command_schema.py
│   ├── validator.py
│   ├── cabin_state.py
│   ├── simulator.py
│   ├── profile_service.py
│   ├── status_service.py
│   ├── display.py
│   └── text_to_speech.py
├── profiles/
│   └── profiles.json
├── tests/
│   ├── test_commands.py
│   ├── test_validation.py
│   ├── test_simulator.py
│   └── test_profiles.py
├── .env
├── requirements.txt
└── README.md
```

Pentru primul prototip pot fi implementate mai întâi starea cabinei, simulatorul, validarea, profilurile, statusul și display-ul. Componentele audio pot fi adăugate ulterior.

## 3. Principii de arhitectură

- LLM-ul local interpretează limbajul natural și produce o comandă structurată.
- Python validează comenzile și valorile presetate înainte de executare.
- `profile_service.py` gestionează crearea, încărcarea și actualizarea profilurilor.
- Simulatorul este sursa de adevăr pentru demonstrație.
- Atributele memorate în profil sunt aplicate automat după identificarea utilizatorului.
- Atributele de moment nu sunt pornite sau modificate automat la încărcarea profilului.
- Volumul audio poate fi memorat, dar încărcarea lui nu pornește muzica.
- Confirmarea se face numai după compararea valorilor dorite cu valorile citite din simulator.
- După fiecare comandă sau aplicare de preset se afișează statusul complet al cabinei.
- La afișarea statusului final se simulează display-ul mașinii.

## 4. Ordinea recomandată de implementare

1. Implementarea stării cabinei și a simulatorului.
2. Definirea atributelor presetate și a atributelor de moment.
3. Implementarea validării parametrilor.
4. Implementarea profilurilor și a persistenței lor.
5. Implementarea creării unui profil din valorile curente.
6. Implementarea identificării și încărcării unui profil.
7. Implementarea verificării după executare.
8. Implementarea statusului complet și a display-ului simulat.
9. Conectarea modelului local.
10. Testarea comenzilor text.
11. Adăugarea speech-to-text și text-to-speech local.

## 5. Obiectivul demonstrației

Demonstrația finală trebuie să arate că:

- un utilizator se poate identifica printr-o comandă naturală, de exemplu „Sunt Victor”;
- aplicația găsește profilul și aplică presetul personal;
- sunt modificate automat doar temperatura, ventilatorul, culoarea luminilor și volumul audio;
- muzica nu pornește automat la încărcarea profilului;
- setările de moment, precum încălzirea sau ventilația scaunului, rămân neschimbate până la o comandă explicită;
- valorile sunt validate și verificate în simulator;
- statusul complet este afișat pe display-ul simulat al mașinii;
- răspunsul vocal confirmă doar modificările verificate cu succes.

Proiectul nu controlează o mașină reală și nu include funcții de condus, dar arhitectura poate fi extinsă ulterior către sisteme automotive reale.
