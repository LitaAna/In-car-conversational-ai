# Detalii de implementare: In-Car Conversational AI local

Acest document completează [workflow_proiect_ai_conversational_auto.md](workflow_proiect_ai_conversational_auto.md) cu explicațiile detaliate ale componentelor, profilurilor și execuției comenzilor.

## 1. Etapele workflow-ului

1. Utilizatorul transmite o comandă vocală.
2. Componenta speech-to-text locală transformă vocea în text.
3. Modelul local identifică intenția: comandă obișnuită, identificare de profil, creare de profil sau actualizare de preset.
4. Modelul returnează o comandă structurată, cu acțiunea și parametrii necesari.
5. Python validează comanda, parametrii și, dacă este cazul, valorile presetate.
6. Aplicația aplică presetul profilului sau execută comanda punctuală.
7. Simulatorul modifică starea internă a cabinei.
8. Sistemul citește starea actuală din simulator după executare.
9. Valorile dorite sunt comparate cu valorile actuale.
10. Este generat rezultatul comenzii și statusul complet al cabinei.
11. Rezultatul este transmis vocal și afișat pe display-ul simulat al mașinii.

## 2. Rolul fișierelor

### `config.py`

Conține modelul local, adresa serviciului local, limitele pentru temperatură, lista valorilor permise, setările audio, modul de rulare și locația în care sunt stocate profilurile. Nu conține logica de control a cabinei.

### `prompts.py`

Conține instrucțiunile pentru modelul local: acțiunile disponibile, parametrii acceptați, valorile permise, formatul comenzii structurate și regulile pentru profiluri.

Modelul trebuie să poată diferenția între:

- „Sunt Victor” — identificare și încărcare profil;
- „Creează un profil pentru Victor” — creare profil;
- „Setează temperatura la 23 de grade” — comandă punctuală;
- „Memorează această temperatură pentru mine” — actualizare preset.

### `speech_to_text.py`

Captează sunetul de la microfon, transcrie vocea local și returnează textul către aplicație. Inițial poate fi înlocuit de o casetă de text.

### `local_llm.py`

Trimite promptul sistemului și mesajul utilizatorului către modelul local și primește intenția structurată. Modelul nu modifică direct simulatorul și nu poate salva valori fără ca aplicația Python să le valideze.

### `command_schema.py`

Definește formatele valide pentru comenzile obișnuite și pentru operațiile cu profiluri.

Exemple de acțiuni:

- `set_temperature`;
- `set_fan_speed`;
- `set_ambient_color`;
- `set_audio_volume`;
- `identify_profile`;
- `create_profile`;
- `load_profile_preset`;
- `update_profile_preset`.

### `validator.py`

Este stratul determinist dintre LLM, profiluri și simulator. Verifică existența acțiunii, tipurile parametrilor, limitele temperaturii, nivelul ventilatorului, culorile disponibile, volumul audio și existența profilului.

Valorile presetate sunt validate înainte de salvare și din nou înainte de aplicare. O valoare invalidă nu poate fi salvată sau executată.

### `cabin_state.py`

Definește starea curentă a cabinei. Poate include temperatura, ventilatorul, direcția fluxului de aer, aerul condiționat, încălzirea și ventilația scaunelor, luminile ambientale, volumul audio, sursa media și redarea.

Starea curentă nu trebuie confundată cu presetul unui profil. Simulatorul păstrează toate valorile active în momentul respectiv, în timp ce profilul păstrează doar preferințele personale selectate.

### `simulator.py`

Primește o comandă validată sau un preset validat, modifică starea internă a cabinei și returnează starea actuală după aplicare. Simulatorul este sursa de adevăr pentru demonstrație.

### `profile_service.py`

Gestionează profilurile utilizatorilor:

- creează profiluri noi;
- salvează presetul profilului;
- caută profilul după nume sau identificator;
- încarcă presetul la identificarea utilizatorului;
- actualizează presetul după o comandă validată;
- păstrează profilurile pentru utilizările viitoare.

Profilurile pot fi stocate inițial într-un fișier local precum `profiles/profiles.json`.

### `status_service.py`

Construiește rezultatul final după fiecare comandă sau aplicare de preset. Include acțiunea, valorile dorite, valorile actuale, rezultatul executării, profilul activ și eventualele diferențe.

Rezultatele posibile sunt:

- `implemented` — valorile corespund;
- `rejected` — comanda sau parametrul nu este permis;
- `failed` — simulatorul nu a putut aplica schimbarea;
- `unchanged` — valoarea era deja activă;
- `partially_implemented` — unele acțiuni au reușit, iar altele nu.

### `display.py`

Simulează display-ul mașinii. După o comandă sau după încărcarea unui profil afișează statusul complet al cabinei și profilul activ, dacă există.

### `text_to_speech.py`

Transformă mesajul final în răspuns audio. Nu confirmă aplicarea unui preset înainte ca simulatorul să fi fost verificat.

### `app.py`

Coordonează întregul flux: primește textul, cere interpretarea LLM-ului, identifică operația, apelează profilurile sau validarea, execută acțiunea în simulator, verifică starea, construiește statusul, actualizează display-ul și generează răspunsul vocal.

## 3. Profilul utilizatorului

Un profil reprezintă preferințele stabile ale unei persoane care folosește mașina. Profilul are un nume și un preset.

### Atribute memorate în preset

Presetul inițial conține:

- temperatura cabinei;
- viteza ventilatorului;
- culoarea luminilor ambientale;
- volumul audio implicit.

Volumul este memorat independent de redarea media. Încărcarea profilului nu pornește muzica.

### Atribute care nu sunt memorate automat

Următoarele rămân setări de moment și nu sunt schimbate automat la încărcarea profilului:

- direcția fluxului de aer;
- aerul condiționat;
- încălzirea scaunului;
- ventilația scaunului;
- intensitatea luminilor ambientale;
- sursa media și redarea.

Ele pot fi modificate numai printr-o comandă explicită a utilizatorului.

## 4. Crearea unui profil nou

La crearea unui profil, aplicația citește valorile curente din simulator și salvează doar atributele presetului.

Exemplu:

```text
Utilizator: „Creează un profil nou pentru Victor.”
Aplicația: „Ce preferințe vrei să memorez?”
Utilizator: „Temperatura, ventilatorul, luminile și volumul audio.”
```

Dacă starea curentă este:

```text
Temperatură: 22°C
Ventilator: nivel 3
Culoare ambientală: verde
Volum audio: 40%
```

aceste valori sunt salvate pentru profilul `Victor`. Încălzirea scaunului, ventilația scaunului, sursa media și redarea nu sunt salvate automat.

## 5. Identificarea și încărcarea unui profil

Fluxul pentru un profil existent este:

```text
Utilizator: „Sunt Victor.”
Aplicația: caută profilul Victor.
Aplicația: validează presetul.
Aplicația: aplică temperatura, ventilatorul, culoarea și volumul audio.
Aplicația: nu pornește muzica și nu modifică setările de moment.
Aplicația: verifică starea simulatorului.
Aplicația: afișează statusul pe display-ul simulat.
```

Profilul se aplică numai după identificarea explicită a utilizatorului. Într-o etapă viitoare, identificarea poate folosi recunoașterea vocii, dar în prototip poate fi realizată prin numele rostit.

## 6. Actualizarea unui preset

Un utilizator poate actualiza o preferință printr-o comandă explicită:

```text
„Pentru profilul meu, memorează temperatura de 23 de grade.”
```

Aplicația trebuie să valideze comanda, să aplice valoarea în simulator, să verifice rezultatul și să actualizeze presetul numai dacă modificarea a fost implementată cu succes.

## 7. Structura orientativă a unui profil

```json
{
  "profile_name": "Victor",
  "preset": {
    "temperature": 22,
    "fan_speed": 3,
    "ambient_color": "green",
    "audio_volume": 40
  }
}
```

`media_playing` nu face parte din preset și trebuie să rămână `false` la încărcarea profilului, dacă utilizatorul nu cere explicit redarea.

## 8. Reguli de verificare și status final

Sistemul nu trebuie să considere profilul sau comanda reușită doar pentru că valorile au fost citite din fișier sau trimise către simulator. Pentru fiecare atribut aplicat:

```text
valoare dorită
        comparată cu
valoare actuală citită din simulator
```

Statusul final trebuie să conțină cel puțin:

- profilul activ;
- rezultatul ultimei comenzi;
- valorile presetate care au fost aplicate;
- valorile actuale verificate în simulator;
- atributele de moment care au rămas neschimbate;
- motivul respingerii sau al eșecului, dacă este cazul.

La afișarea statusului final se simulează display-ul mașinii. Confirmarea vocală este permisă numai după verificarea stării simulate.

## 9. Extindere ulterioară

Simulatorul poate fi înlocuit ulterior cu un adaptor către senzori, CAN bus sau API-ul producătorului. Logica profilurilor și verificarea valorii raportate trebuie păstrate și în această etapă.
