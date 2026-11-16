# Atribute controlabile în cadrul proiectului

Acest document prezintă cele 10 atribute propuse pentru controlul conversațional al funcțiilor non-driving din cabina mașinii și din sistemul infotainment, precum și modul în care acestea sunt asociate profilurilor utilizatorilor.

Obiectivul este ca utilizatorul să poată formula comenzi naturale, hands-free, iar sistemul să interpreteze, valideze și execute comenzile în simulatorul cabinei.

## Lista atributelor

| Nr. | Atribut | Domeniu | Tip | Exemplu de comandă |
|---:|---|---|---|---|
| 1 | Temperatura cabinei | Climatizare | Preferință presetată | „Setează temperatura la 22 de grade.” |
| 2 | Viteza ventilatorului | Climatizare | Preferință presetată | „Dă ventilatorul la nivelul 3.” |
| 3 | Direcția fluxului de aer | Climatizare | Setare de moment | „Trimite aerul către picioare.” |
| 4 | Aerul condiționat | Climatizare | Setare de moment | „Pornește aerul condiționat.” |
| 5 | Încălzirea scaunului | Scaune | Setare de moment | „Pornește încălzirea scaunului șoferului.” |
| 6 | Ventilația scaunului | Scaune | Setare de moment | „Pornește ventilația scaunului.” |
| 7 | Culoarea luminilor ambientale | Iluminare | Preferință presetată | „Setează luminile ambientale pe verde.” |
| 8 | Intensitatea luminilor ambientale | Iluminare | Setare de moment | „Redu intensitatea luminilor la 50%.” |
| 9 | Volumul sistemului audio | Infotainment | Preferință presetată | „Mărește volumul la 40%.” |
| 10 | Sursa media și redarea | Infotainment | Setare de moment | „Pornește radioul.” / „Pune muzică de pe Bluetooth.” |

## Descrierea atributelor

### 1. Temperatura cabinei

Permite setarea temperaturii dorite în interiorul cabinei.

Exemple de valori:

- `18°C`;
- `22°C`;
- `26°C`.

Comanda trebuie respinsă dacă temperatura este în afara limitelor configurate.

### 2. Viteza ventilatorului

Permite controlul intensității ventilatorului prin niveluri prestabilite, de exemplu de la `0` la `5`.

Exemplu:

```text
„Setează ventilatorul la nivelul 3.”
```

### 3. Direcția fluxului de aer

Permite selectarea zonei către care este direcționat aerul:

- față;
- picioare;
- parbriz;
- combinații între zone.

Exemplu:

```text
„Trimite aerul către parbriz.”
```

### 4. Aerul condiționat

Permite pornirea sau oprirea sistemului de aer condiționat.

Exemple de comenzi:

- „Pornește aerul condiționat.”;
- „Oprește A/C-ul.”.

### 5. Încălzirea scaunului

Permite activarea, dezactivarea sau setarea nivelului de încălzire pentru scaunul unui utilizator.

Exemplu:

```text
„Pornește încălzirea scaunului șoferului la nivelul 2.” Ținta poate fi și pasagerul din față sau un pasager din spate, cu precizarea stânga/dreapta.
```

### 6. Ventilația scaunului

Permite controlul ventilației scaunului, atunci când această funcție este disponibilă în simulator.

Exemplu:

```text
„Pornește ventilația scaunului pasagerului din spate, din dreapta.” Ventilația scaunului este distinctă de ventilatorul climatizării generale.
```

### 7. Culoarea luminilor ambientale

Permite alegerea unei culori din lista de valori acceptate de simulator.

Exemple de valori:

- `red`;
- `blue`;
- `green`;
- `white`.

Exemplu:

```text
„Vreau ambientalele verzi.”
```

### 8. Intensitatea luminilor ambientale

Permite setarea intensității luminilor ambientale, exprimată procentual.

Exemple de valori:

- `25%`;
- `50%`;
- `100%`.

### 9. Volumul sistemului audio

Permite setarea sau ajustarea volumului sistemului audio.

Exemple de comenzi:

- „Setează volumul la 40%.”;
- „Mărește volumul.”;
- „Dă volumul mai încet.”.

### 10. Sursa media și redarea

Permite selectarea sursei media și controlul redării.

Surse posibile:

- radio;
- Bluetooth;
- sistem media local.

Exemple de comenzi:

- „Pornește radioul.”;
- „Pune muzică de pe Bluetooth.”;
- „Oprește muzica.”.

## Profiluri de utilizatori și preseturi

Aplicația va permite definirea unor profiluri pentru persoanele care folosesc aceeași mașină. Fiecare profil are un nume și un preset cu preferințele stabile ale utilizatorului.

Un utilizator se poate identifica printr-o comandă naturală, de exemplu:

```text
„Sunt Victor.”
```

După identificare, aplicația caută profilul `Victor` și aplică automat preferințele salvate în presetul lui.

### Atribute memorate în preset

Presetul unui profil va conține inițial doar următoarele date:

- temperatura cabinei;
- viteza ventilatorului;
- culoarea luminilor ambientale;
- volumul audio implicit, fără pornirea muzicii.

Aceste valori reprezintă preferințe personale și pot fi aplicate automat la selectarea profilului.

### Atribute care nu sunt memorate în preset

Nu toate atributele trebuie incluse în profil. Unele depind de momentul utilizării și trebuie controlate separat, de exemplu:

- încălzirea scaunului;
- ventilația scaunului;
- direcția fluxului de aer;
- aerul condiționat;
- intensitatea luminilor ambientale;
- sursa media și redarea.

La încărcarea unui profil, aceste atribute nu vor fi pornite sau modificate automat decât dacă utilizatorul formulează o comandă explicită.

## Crearea unui profil nou

Atunci când utilizatorul alege opțiunea de creare a unui profil nou, aplicația trebuie să:

1. solicite numele profilului;
2. citească valorile curente din simulator;
3. salveze în preset doar atributele personale definite pentru profil;
4. păstreze profilul pentru utilizările viitoare.

Exemplu:

```text
Utilizator: „Creează un profil nou pentru Victor.”
Aplicația: „Ce preferințe vrei să memorez?”
Utilizator: „Memorează temperatura, ventilatorul, luminile ambientale și volumul.”
```

Dacă în acel moment simulatorul are următoarele valori:

```text
Temperatură: 22°C
Ventilator: nivel 3
Culoare ambientală: verde
Volum audio: 40%
```

aceste valori sunt salvate în presetul profilului `Victor`. Muzica nu este pornită la salvarea sau la încărcarea profilului.

## Încărcarea unui profil existent

La o utilizare ulterioară, fluxul poate fi:

```text
Utilizator: „Sunt Victor.”
Aplicația: identifică profilul Victor.
Aplicația: aplică presetul profilului.
Aplicația: verifică valorile în simulator.
Aplicația: afișează statusul actualizat pe display-ul simulat.
```

Aplicarea presetului trebuie să treacă prin aceeași validare ca o comandă obișnuită. Profilul nu poate modifica valori care nu sunt permise de configurația simulatorului.

## Structura unui profil

O reprezentare orientativă a unui profil este:

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

Profilul trebuie să păstreze volumul audio ca preferință, dar `media_playing` trebuie să rămână `false` la încărcarea presetului, dacă utilizatorul nu cere explicit redarea.

## Actualizarea unui preset

După ce profilul este selectat, utilizatorul poate modifica o preferință printr-o comandă, de exemplu:

```text
„Pentru profilul meu, setează temperatura preferată la 23 de grade.”
```

Aplicația trebuie să:

1. valideze comanda;
2. aplice valoarea în simulator;
3. verifice rezultatul;
4. actualizeze presetul numai dacă modificarea a fost implementată cu succes.

## Reguli de siguranță și comportament

- Profilul se aplică numai după identificarea explicită a utilizatorului.
- Valorile presetate sunt validate înainte de aplicare.
- O valoare invalidă nu trebuie salvată în profil.
- Atributele de moment nu trebuie pornite automat la încărcarea profilului.
- Muzica nu trebuie să pornească automat doar pentru că volumul audio a fost încărcat.
- După aplicarea presetului, sistemul verifică starea simulatorului și afișează statusul complet pe display-ul simulat.
