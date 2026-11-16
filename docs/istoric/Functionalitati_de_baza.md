# In-Car Conversational AI

## Cerințe funcționale

An in-car conversational AI that lets drivers and passengers control non-driving features—climate, fan, seats, lighting, and infotainment—through natural language. 
You must build a solution that reliably executes hands-free, natural-language commands for all cabin and infotainment functions, minimizing driver distraction while learning preferences, supporting multi-user voices, and integrating safely with OEM systems.

## 1. Scopul proiectului

Proiectul trebuie să implementeze un asistent conversațional pentru automobil, capabil să primească și să execute comenzi vocale în limbaj natural.

Asistentul va fi folosit de șoferi și pasageri pentru controlul funcțiilor non-critice:

- climatizare;
- ventilator;
- scaune;
- lumini;
- muzică și media.

Sistemul trebuie să funcționeze hands-free, să reducă distragerea șoferului, să învețe preferințele utilizatorilor, să suporte mai multe voci și să comunice în siguranță cu sistemele OEM ale mașinii.

Sistemul trebuie să permită utilizatorilor să controleze funcțiile mașinii prin voce, fără interacțiune manuală complexă.

Asistentul trebuie să înțeleagă:

- comenzi directe;
- comenzi relative;
- comenzi vagi;
- comenzi referitoare la o anumită zonă;
- comenzi care combină mai multe acțiuni.

Atunci când o comandă este ambiguă, sistemul trebuie să solicite o clarificare scurtă. Răspunsurile asistentului trebuie să fie concise și potrivite pentru utilizarea în timpul condusului.

## 2. Climatizare și controlul aerului

Sistemul trebuie să permită controlul climatizării prin voce.

### Temperatură

Utilizatorul trebuie să poată:

- seta temperatura generală;
- seta temperatura pentru o anumită zonă;
- controla zona șoferului;
- controla zona pasagerului din față;
- controla zonele din spate;
- crește sau reduce temperatura relativ.

*Exemple: „Setează temperatura la 21°C.”, „Pune 20°C la șofer.”, „Mai cald pentru pasagerul din dreapta.”, „Fă mai rece în spate.”*

### Ventilație

Sistemul trebuie să controleze:

- pornirea și oprirea ventilatorului;
- viteza ventilatorului;
- direcția aerului;
- aerul către față;
- aerul către picioare;
- aerul către parbriz;
- aerul proaspăt sau recirculat.

*Exemple: „Dă ventilatorul mai tare.”, „Trimite aerul la picioare.”, „Pornește recircularea.”, „Oprește aerul.”*

### Mod automat

Utilizatorul trebuie să poată folosi o comandă vagă, iar sistemul să decidă setările potrivite pe baza stării actuale și a preferințelor.

### Scaune și volan

În cadrul climatizării, sistemul trebuie să controleze:

- încălzirea scaunelor;
- ventilarea scaunelor;

Pentru încălzirea și ventilația scaunelor, ținta poate fi șoferul, pasagerul din față sau un pasager din spate. Pentru locurile din spate se precizează partea stângă sau dreaptă. Ventilația scaunului rămâne separată de ventilatorul climatizării generale.
- intensitatea încălzirii sau ventilării;
- încălzirea volanului.

### Dezaburire

Sistemul trebuie să permită activarea dezaburirii parbrizului și lunetei prin voce.

Această comandă trebuie tratată cu prioritate față de interacțiunile obișnuite.

### Calitatea aerului

Dacă proiectul folosește date simulate despre aer sau miros, sistemul poate detecta o calitate scăzută a aerului și poate sugera recircularea.

## 3. Scaune și poziționare

Sistemul trebuie să permită reglarea scaunelor prin comenzi naturale.

### Reglarea poziției

Utilizatorul trebuie să poată modifica:

- poziția orizontală;
- poziția verticală;
- înclinarea spătarului;
- suportul lombar, dacă este disponibil.

*Exemple: „Mută scaunul mai în față.”, „Ridică scaunul.”, „Înclină puțin spătarul.”, „Pune scaunul într-o poziție mai relaxată.”*

### Memorarea pozițiilor

Utilizatorul trebuie să poată salva și încărca poziții favorite.

*Exemple: „Salvează poziția mea.”, „Pune scaunul cum îmi place mie.”, „Încarcă poziția Mariei.”*

### Control individual

Dacă există mai multe zone sau pasageri, sistemul trebuie să poată identifica scaunul vizat.

*Exemplu: „Reglează scaunul pasagerului din dreapta.”*

### Modul relaxare

Sistemul poate combina mai multe funcții:

- înclinarea scaunului;
- pornirea masajului;
- reducerea luminii.

Acest mod trebuie să fie disponibil numai când mașina este parcată sau staționară.

## 4. Lumini

Sistemul trebuie să controleze luminile interioare prin voce.

### Iluminare ambientală

Utilizatorul trebuie să poată seta:

- intensitatea luminii;
- culoarea luminii;
- culoarea RGB, dacă este disponibilă;
- iluminarea unei anumite zone.

*Exemple: „Fă luminile mai slabe.”, „Pune luminile pe albastru.”, „Aprinde lumina din spate.”*

### Moduri predefinite

Sistemul trebuie să poată activa moduri precum:

- mod citit;
- mod relaxare;
- mod film pentru pasagerii din spate.

*Exemple: „Activează modul citit.”, „Pune luminile pentru relaxare.”, „Pornește modul film în spate.”*

### Comenzi contextuale

Sistemul trebuie să înțeleagă observații despre mediul din cabină.

*Exemplu: „Este prea întuneric în spate.”*

Sistemul trebuie să crească intensitatea luminilor din zona corespunzătoare.

### Sincronizarea cu muzica

Sistemul poate sincroniza luminile cu muzica pentru pasageri.

Această funcție nu trebuie aplicată într-un mod care distrage șoferul.

## 5. Infotainment, muzică și media

Sistemul trebuie să permită controlul vocal al conținutului media.

### Control de bază

Utilizatorul trebuie să poată:

- porni muzica;
- opri muzica;
- pune pauză;
- schimba melodia;
- reveni la melodia anterioară;
- modifica volumul;
- controla volumul pe zone.

*Exemple: „Pune muzică.”, „Oprește muzica.”, „Treci la următoarea piesă.”, „Dă volumul mai încet.”, „Dă muzica mai tare în spate.”*

### Selectarea conținutului

Sistemul trebuie să poată căuta:

- artiști;
- playlist-uri;
- genuri muzicale;
- posturi radio;
- conținut de streaming;
- playlist-uri personale.

### Comenzi vagi

AI-ul trebuie să interpreteze descrieri generale ale stării dorite.

*Exemple: „Pune ceva vesel.”, „Vreau ceva pentru concentrare.”, „Pune muzică relaxantă.”*

### Învățarea gusturilor

Utilizatorul trebuie să poată oferi feedback despre melodii.

*Exemplu: „Nu-mi mai place piesa asta, nu o mai pune.”*

Sistemul poate utiliza acest feedback pentru a evita melodia sau pentru a ajusta preferințele utilizatorului.

## 6. Învățarea preferințelor

Sistemul trebuie să poată memora preferințe legate de:

- temperatura preferată;
- setările climatizării;
- intensitatea ventilatorului;
- muzica preferată;
- volumul preferat;
- poziția scaunului;
- iluminarea preferată.

Sistemul poate identifica tipare de utilizare.

*Exemplu: „Observ că seara setezi mereu temperatura la 19°C. Dorești să rețin această preferință?”*

Preferințele nu trebuie modificate permanent fără acordul utilizatorului!

Utilizatorul trebuie să poată:

- confirma o sugestie;
- respinge o sugestie;
- corecta o preferință;
- solicita modificarea sau ștergerea preferințelor memorate.

## 7. Suport pentru mai mulți utilizatori și voci

Sistemul trebuie să poată diferenția utilizatorii.

În prototip, identificarea poate fi simulată prin:

- selectarea unui profil;
- comanda „Sunt Maria”;
- alegerea utilizatorului dintr-o listă;
- recunoaștere vocală simplificată.

Fiecare utilizator poate avea:

- temperatură preferată;
- muzică preferată;
- volum preferat;
- poziție preferată a scaunului;
- setări preferate pentru lumini.

Sistemul trebuie să aplice preferințele utilizatorului activ atunci când acesta este identificat.

## 8. Siguranță și minimizarea distragerii

Sistemul trebuie să fie utilizabil fără interacțiune manuală sau vizuală complexă.

Trebuie să ofere:

- răspunsuri vocale scurte;
- confirmări simple;
- clarificări concise;
- evitarea dialogurilor lungi;
- limitarea comenzilor care pot distrage șoferul;
- refuzul comenzilor care nu sunt sigure în contextul actual.

Sistemul trebuie să distingă între stări precum:

- mașina este în mers;
- mașina este parcată;
- starea nu este cunoscută.

Comenzile mai complexe sau care pot afecta confortul ori poziționarea trebuie limitate în timpul condusului.

*Exemplu: „Pornește modul relaxare.”, Răspuns în mers: „Modul relaxare este disponibil doar când mașina este parcată.”*

Dacă utilizatorul formulează o comandă ambiguă, sistemul trebuie să pună o singură întrebare clară.

Comenzile urgente, precum dezaburirea, trebuie să aibă prioritate față de muzică sau alte interacțiuni.

## 9. Integrarea sigură cu sistemele OEM

Sistemul trebuie să fie separat de funcțiile critice ale vehiculului.

AI-ul trebuie să transmită intenții către o interfață sigură a mașinii, nu să controleze direct sisteme precum:

- frâne;
- direcție;
- accelerație;
- cruise control;
- alte funcții de conducere.

Pentru prototip, integrarea poate fi simulată printr-un API care permite:

- citirea stării vehiculului;
- citirea setărilor climatizării;
- verificarea funcțiilor disponibile;
- executarea unei acțiuni;
- verificarea rezultatului.
