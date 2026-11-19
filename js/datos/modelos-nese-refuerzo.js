/* ============================================================================
   Cuaderno del profesor · Constantes de NESE, refuerzo y repetición (modelos, leyendas, medidas)
   js/datos/modelos-nese-refuerzo.js
   ============================================================================ */

/* Tipus d'activitat de Física i Química. L'últim és sempre el d'examen
   (TIPO_EXAMEN): el Corrector el fa servir en crear exàmens. */
const TIPOS=["Activitat de classe","Deures (activitat per a casa)","Resolució de problemes","Pràctica de laboratori / informe","Treball / projecte / SdA","Exposició oral","Qüestionari en línia (Aules)","Quadern / llibreta","Proactivitat i hàbits de treball","Prova escrita / examen"];
const TIPO_EXAMEN=TIPOS[TIPOS.length-1];
const ESCALA=[{etq:"Realizada con éxito",v:10},{etq:"Realizada",v:7.5},{etq:"Incompleta",v:5},{etq:"No realizada",v:0}];
const TRIMESTRES=["1ª evaluación","2ª evaluación","3ª evaluación"];
const NIVELES_NESE=["1º de Primaria","2º de Primaria","3º de Primaria","4º de Primaria","5º de Primaria","6º de Primaria","1º de ESO","2º de ESO","3º de ESO","4º de ESO","Altas Capacidades"];
/* Plantilles de seguiment NESE per a Física i Química (5 models, segons el
   nivell de competència curricular real de l'alumne/a). Les files són sabers i
   criteris ADAPTATS al nivell de referència, lligats a les CE de Física i
   Química d'ESO (currículum valencià) perquè l'adequació es fa dins de la
   matèria. Són una proposta de partida: el departament i l'orientador/a les
   han de revisar. Cada model es copia en crear el pla d'un alumne/a. */
const NESE_MODELOS={
  "1":[
    { titulo:"Bloc 1 — Observar i preguntar (metodologia de la ciència)", filas:[
      { saber:"Observació de l'entorn amb els sentits", criterio:"Descriure, amb ajuda, una característica d'un objecte (color, forma, mida, tacte)", ce:"CE1", cc:"CCL, STEM" },
      { saber:"Preguntes sobre fenòmens quotidians", criterio:"Formular, amb una pauta, una pregunta senzilla sobre allò que observa", ce:"CE3", cc:"CCL, CPSAA" },
      { saber:"Normes bàsiques de seguretat a l'aula i al laboratori", criterio:"Seguir una norma de seguretat senzilla quan manipula materials, amb recordatori", ce:"CE1", cc:"STEM, CPSAA" },
    ]},
    { titulo:"Bloc 2 — La matèria que ens envolta", filas:[
      { saber:"Materials de l'entorn: fusta, metall, plàstic, vidre", criterio:"Classificar, amb suport visual, objectes quotidians segons el material de què estan fets", ce:"CE9", cc:"STEM" },
      { saber:"Estats de l'aigua: gel, aigua líquida, vapor", criterio:"Reconéixer en imatges l'aigua en estat sòlid, líquid i gasós", ce:"CE5", cc:"STEM" },
      { saber:"Mesura amb unitats no convencionals (pams, passes, gots)", criterio:"Comparar, amb ajuda, quin de dos objectes és més llarg o més pesat", ce:"CE7", cc:"STEM" },
    ]},
    { titulo:"Bloc 3 — Energia i forces en la vida diària", filas:[
      { saber:"Empentes i estirades: els objectes es mouen o es deformen", criterio:"Mostrar, amb un objecte, què passa quan l'empenta o l'estira", ce:"CE11", cc:"STEM" },
      { saber:"Fonts de llum i de calor de casa i de l'escola", criterio:"Nomenar una font de llum i una de calor del seu entorn", ce:"CE8", cc:"STEM, CCL" },
      { saber:"Ús responsable de l'aigua i de l'energia", criterio:"Proposar, amb ajuda, un gest senzill per a estalviar aigua o llum", ce:"CE8", cc:"CC, STEM" },
    ]},
  ],
  "2":[
    { titulo:"Bloc 1 — Experimentar i comunicar (metodologia de la ciència)", filas:[
      { saber:"Passos d'un experiment senzill: pregunta, prova, resultat", criterio:"Seguir, amb una fitxa guiada, els passos d'un experiment senzill i dir què ha passat", ce:"CE1", cc:"STEM, CPSAA" },
      { saber:"Registre de dades en taules senzilles", criterio:"Anotar dades en una taula de dues columnes amb un model", ce:"CE7", cc:"STEM, CD" },
      { saber:"Vocabulari científic bàsic", criterio:"Utilitzar correctament tres o quatre paraules científiques treballades en una explicació oral breu", ce:"CE6", cc:"CCL" },
    ]},
    { titulo:"Bloc 2 — Propietats i canvis de la matèria", filas:[
      { saber:"Propietats observables: duresa, flexibilitat, transparència, flotabilitat", criterio:"Comprovar, amb material manipulable, si un objecte sura o s'enfonsa i anotar-ho", ce:"CE9", cc:"STEM" },
      { saber:"Canvis d'estat: fusió, solidificació i evaporació", criterio:"Explicar, amb una seqüència d'imatges, què li passa al gel quan s'escalfa", ce:"CE5", cc:"STEM, CCL" },
      { saber:"Mescles senzilles: aigua i sal, aigua i arena", criterio:"Separar, amb ajuda, una mescla d'aigua i arena filtrant-la", ce:"CE9", cc:"STEM" },
      { saber:"Mesura amb regle, balança i got graduat", criterio:"Mesurar la longitud d'un objecte amb un regle i expressar-la en centímetres", ce:"CE7", cc:"STEM" },
    ]},
    { titulo:"Bloc 3 — Forces, energia i electricitat", filas:[
      { saber:"Forces de contacte i a distància: imants", criterio:"Comprovar quins objectes atrau un imant i classificar-los", ce:"CE11", cc:"STEM" },
      { saber:"Formes d'energia en aparells quotidians", criterio:"Relacionar, amb suport visual, un aparell de casa amb l'energia que usa", ce:"CE8", cc:"STEM" },
      { saber:"Circuit elèctric senzill: pila, cable i bombeta", criterio:"Muntar, amb ajuda, un circuit amb una pila i una bombeta i encendre-la", ce:"CE1", cc:"STEM, CE" },
    ]},
  ],
  "3":[
    { titulo:"Bloc 1 — El treball científic", filas:[
      { saber:"Hipòtesi i comprovació experimental", criterio:"Fer una predicció abans d'un experiment i comprovar, amb ajuda, si es complix", ce:"CE1", cc:"STEM, CPSAA" },
      { saber:"Representació de dades en gràfics de barres", criterio:"Construir un gràfic de barres a partir d'una taula senzilla de dades", ce:"CE7", cc:"STEM, CD" },
      { saber:"Cerca guiada d'informació científica fiable", criterio:"Trobar, amb preguntes guia, una dada concreta en un text o vídeo científic adaptat", ce:"CE3", cc:"CCL, CD" },
      { saber:"Treball en equip en el laboratori", criterio:"Complir el rol assignat dins d'un equip durant una pràctica", ce:"CE2", cc:"CPSAA, CC" },
    ]},
    { titulo:"Bloc 2 — La matèria i els seus canvis", filas:[
      { saber:"Massa i volum; unitats bàsiques (g, kg, mL, L)", criterio:"Mesurar la massa amb una balança i el volum amb un got graduat, indicant la unitat", ce:"CE7", cc:"STEM" },
      { saber:"Substàncies pures i mescles; tècniques de separació", criterio:"Triar, d'entre dues opcions, la tècnica adequada per a separar una mescla senzilla", ce:"CE9", cc:"STEM" },
      { saber:"Canvis físics i canvis químics quotidians (combustió, oxidació)", criterio:"Diferenciar, amb exemples de la vida diària, un canvi físic d'un canvi químic", ce:"CE10", cc:"STEM, CCL" },
    ]},
    { titulo:"Bloc 3 — Energia, forces i moviment", filas:[
      { saber:"Fonts d'energia renovables i no renovables", criterio:"Classificar, amb suport visual, fonts d'energia en renovables i no renovables", ce:"CE8", cc:"STEM, CC" },
      { saber:"La força i els seus efectes: canvi de moviment i deformació", criterio:"Explicar, amb un exemple, que una força pot canviar el moviment o la forma d'un cos", ce:"CE11", cc:"STEM, CCL" },
      { saber:"Llum i so: propagació i propietats bàsiques", criterio:"Reconéixer, en una situació quotidiana, la reflexió de la llum o l'eco del so", ce:"CE5", cc:"STEM" },
    ]},
  ],
  "4":[
    { titulo:"Bloc 1 — Metodologia de la ciència (CE1, CE2, CE6, CE7)", filas:[
      { saber:"Magnituds i unitats del Sistema Internacional", criterio:"Identificar la magnitud i la unitat del SI de longitud, massa, temps i volum", ce:"CE7", cc:"STEM" },
      { saber:"Canvis d'unitats senzills (m↔cm, kg↔g, L↔mL)", criterio:"Fer, amb una taula de suport, canvis d'unitats senzills", ce:"CE7", cc:"STEM" },
      { saber:"Material i normes de seguretat del laboratori", criterio:"Reconéixer el material bàsic de laboratori i una norma de seguretat associada", ce:"CE1", cc:"STEM, CPSAA" },
      { saber:"Resolució de problemes guiada", criterio:"Resoldre un problema senzill seguint una pauta de passos (dades, fórmula, resultat amb unitat)", ce:"CE2", cc:"STEM, CPSAA" },
    ]},
    { titulo:"Bloc 2 — La matèria (CE5, CE9)", filas:[
      { saber:"Propietats de la matèria: massa, volum i densitat (qualitativa)", criterio:"Explicar, amb un experiment de flotació, que materials diferents tenen densitats diferents", ce:"CE9", cc:"STEM" },
      { saber:"Estats d'agregació i canvis d'estat", criterio:"Nomenar els canvis d'estat i associar-los a escalfar o refredar", ce:"CE5", cc:"STEM, CCL" },
      { saber:"Substàncies pures, mescles i tècniques de separació", criterio:"Proposar, amb ajuda, una tècnica per a separar una mescla quotidiana", ce:"CE9", cc:"STEM" },
    ]},
    { titulo:"Bloc 3 — Energia i interaccions (CE8, CE11)", filas:[
      { saber:"L'energia: formes, transformacions i fonts", criterio:"Identificar la transformació d'energia en un aparell quotidià", ce:"CE8", cc:"STEM" },
      { saber:"Les forces i els seus efectes", criterio:"Representar una força amb una fletxa i dir quin efecte produïx", ce:"CE11", cc:"STEM" },
      { saber:"Moviment: posició, temps i velocitat", criterio:"Calcular, amb la fórmula donada, la velocitat d'un mòbil en una situació senzilla", ce:"CE11", cc:"STEM" },
    ]},
  ],
  "5":[
    { titulo:"Bloc 1 — Metodologia de la ciència (CE1, CE2, CE3, CE6, CE7)", filas:[
      { saber:"Treball experimental guiat i informe de pràctiques", criterio:"Completar un informe de pràctiques senzill amb objectiu, material, procediment i conclusió", ce:"CE1", cc:"STEM, CCL" },
      { saber:"Taules de dades i gràfiques lineals", criterio:"Construir una gràfica a partir d'una taula de dades amb els eixos ja indicats", ce:"CE7", cc:"STEM, CD" },
      { saber:"Fonts d'informació fiables i pseudociència", criterio:"Distingir, amb ajuda, una afirmació científica d'una que no ho és en un exemple quotidià", ce:"CE3", cc:"CCL, CD, CC" },
      { saber:"Llenguatge científic", criterio:"Explicar oralment un fenomen treballat utilitzant el vocabulari bàsic de la unitat", ce:"CE6", cc:"CCL" },
    ]},
    { titulo:"Bloc 2 — La matèria i els canvis químics (CE5, CE9, CE10)", filas:[
      { saber:"Model cineticocorpuscular i estats de la matèria", criterio:"Representar amb dibuixos de partícules els tres estats de la matèria", ce:"CE5", cc:"STEM" },
      { saber:"Dissolucions i concentració", criterio:"Preparar, amb un guió, una dissolució senzilla i indicar el solut i el dissolvent", ce:"CE9", cc:"STEM" },
      { saber:"Reaccions químiques quotidianes i conservació de la massa", criterio:"Identificar reactius i productes en una reacció quotidiana (combustió, oxidació)", ce:"CE10", cc:"STEM, CCL" },
    ]},
    { titulo:"Bloc 3 — Energia, forces i moviment (CE8, CE11)", filas:[
      { saber:"Calor i temperatura", criterio:"Diferenciar calor i temperatura amb un exemple quotidià", ce:"CE8", cc:"STEM" },
      { saber:"Moviment rectilini uniforme i gràfiques posició-temps", criterio:"Interpretar una gràfica posició-temps senzilla i dir si el mòbil està parat o es mou", ce:"CE11", cc:"STEM" },
      { saber:"Forces, pes i deformacions", criterio:"Calcular el pes d'un cos a partir de la massa amb la fórmula donada", ce:"CE11", cc:"STEM" },
      { saber:"Electricitat i circuits", criterio:"Muntar i dibuixar un circuit en sèrie senzill amb el símbol de cada element", ce:"CE1", cc:"STEM, CE" },
    ]},
  ],
};
/* Enunciats de les competències específiques de Física i Química d'ESO
   (currículum valencià) citades en els models NESE. */
const NESE_CE_ESO_FQ={
 "CE1": "Resoldre problemes científics abordables en l’àmbit escolar a partir de treballs d’investigació de caràcter experimental.",
 "CE2": "Analitzar i resoldre situacions problemàtiques de l’àmbit de la física i la química utilitzant la lògica científica i alternant les estratègies del treball individual amb el treball en equip.",
 "CE3": "Utilitzar el coneixement científic com a instrument del pensament crític, interpretant i comunicant missatges científics, desenvolupant argumentacions i accedint a fonts fiables, per a distingir la informació contrastada de les faules i opinions.",
 "CE4": "Justificar la validesa del model científic com a producte dinàmic que es va revisant i reconstruint sota la influència del context social i històric, atenent la importància de la ciència en l’avanç de les societats, així com els riscos d’un ús inadequat o interessat dels coneixements i les seues limitacions.",
 "CE5": "Utilitzar models de física i química per a identificar, caracteritzar i analitzar alguns fenòmens naturals, així com per a explicar altres fenòmens de característiques similars.",
 "CE6": "Utilitzar adequadament el llenguatge científic propi de la física i la química en la interpretació i transmissió d’informació.",
 "CE7": "Interpretar correctament la informació presentada en diferents formats de representació gràfica i simbòlica utilitzats habitualment en la física i la química.",
 "CE8": "Distingir les diferents manifestacions de l’energia i identificar les seues formes de transmissió i la seua conservació i dissipació en contextos pròxims.",
 "CE9": "Identificar i caracteritzar les substàncies a partir de les seues propietats físiques per a relacionar els materials del nostre entorn amb l’ús que se’n fa.",
 "CE10": "Caracteritzar els canvis químics com a transformació d’unes substàncies en altres de diferents, i reconéixer la importància de les transformacions químiques en activitats i processos quotidians.",
 "CE11": "Identificar les interaccions com a causa de les transformacions que tenen."
};
const NESE_CE={ "1":NESE_CE_ESO_FQ, "2":NESE_CE_ESO_FQ, "3":NESE_CE_ESO_FQ, "4":NESE_CE_ESO_FQ, "5":NESE_CE_ESO_FQ };
/* Etiquetes de cada model de pla NESE (nivell de competència curricular de referència). */
const NE_MODELO_LABELS={ "1":"Nivell de 1r cicle de Primària (1r-2n)", "2":"Nivell de 2n cicle de Primària (3r-4t)", "3":"Nivell de 3r cicle de Primària (5é-6é)", "4":"Nivell de 1r d'ESO", "5":"Nivell de 2n d'ESO" };
/* Models de Pla de Reforç i de Pla de Repetició de Física i Química (2n, 3r i
   4t d'ESO), generats a partir del currículum precarregat: objectius = criteris
   d'avaluació (amb CE i competències clau), repartits en 3 avaluacions
   (CE1-4 / CE5-8 / CE9-11) + dossier d'activitats. Compartit pels dos plans. */
const RFRP_DOSSIER_DEFECTO="Elaboració d'un dossier d'activitats d'avaluació i consolidació dels sabers bàsics no assolits.";
const RFRP_MODELOS={
 "2": [
  {
   "gruposCE": [
    {
     "ce": "CE1",
     "cc": "CCL, CP, STEM, CD, CPSAA, CE",
     "criterios": [
      {
       "texto": "1.1. Analitzar i resoldre problemes associats a la mesura de sòlids irregulars.",
       "trabajado": false
      },
      {
       "texto": "1.2. Esbrinar, mitjançant dissenys experimentals, la influència de factors com la temperatura o la concentració en la velocitat de les reaccions químiques.",
       "trabajado": false
      },
      {
       "texto": "1.3. Investigar la substància que correspon a un determinat sòlid problema.",
       "trabajado": false
      },
      {
       "texto": "1.4. Dur a terme estudis experimentals sobre diferents tipus de reaccions.",
       "trabajado": false
      },
      {
       "texto": "1.5. Comprovar que es compleix la llei de conservació de la massa en experiències de caràcter pràctic.",
       "trabajado": false
      },
      {
       "texto": "1.6. Dur a terme experiències en les quals es produïsquen reaccions químiques de diferents tipus (descomposició, precipitació, síntesi, combustió, neutralització), identificant reactius i productes per les seues diferents propietats característiques, i, en el cas de les reaccions àcid-base, utilitzant l’escala de pH per a identificar el caràcter àcid o bàsic de les substàncies implicades.",
       "trabajado": false
      },
      {
       "texto": "1.7. Dur a terme experiències senzilles de preparació de dissolucions, i descriure el procediment seguit i el material utilitzat, així com determinar-ne la concentració.",
       "trabajado": false
      },
      {
       "texto": "1.8. Resoldre situacions problemàtiques relacionades amb el moviment dels cossos en situacions quotidianes.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE2",
     "cc": "CCL, STEM, CD, CPSAA, CC, CE",
     "criterios": [
      {
       "texto": "2.1. Analitzar els enunciats de les situacions plantejades i descriure la situació a la qual es pretén donar resposta, identificant les variables que hi intervenen.",
       "trabajado": false
      },
      {
       "texto": "2.2. Triar, en resoldre un determinat problema, el tipus d’estratègia més adequada, i justificar-ne adequadament l’elecció.",
       "trabajado": false
      },
      {
       "texto": "2.3. Buscar i seleccionar la informació necessària per a la resolució de la situació en problemes suficientment delimitats.",
       "trabajado": false
      },
      {
       "texto": "2.4. Expressar, utilitzant el llenguatge matemàtic adequat al seu nivell, el procediment que s’ha seguit en la resolució d’un problema.",
       "trabajado": false
      },
      {
       "texto": "2.5. Comprovar i interpretar les solucions trobades.",
       "trabajado": false
      },
      {
       "texto": "2.6. Participar en equips de treball per a resoldre els problemes plantejats assumint diversos rols amb eficàcia i responsabilitat.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE3",
     "cc": "CCL, CP, STEM, CD, CPSAA, CC, CCEC",
     "criterios": [
      {
       "texto": "3.1. Buscar i seleccionar informació a partir d’una estratègia de filtrat i de forma contrastada en mitjans digitals, i identificar les fonts de les quals procedeix.",
       "trabajado": false
      },
      {
       "texto": "3.2. Exposar les idees d’una manera clara i ordenada, utilitzant un llenguatge precís i adequat.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE4",
     "cc": "STEM, CPSAA, CC",
     "criterios": [
      {
       "texto": "4.1. Aportar exemples d’utilització del coneixement científic i relacionar-los amb les conseqüències que han tingut per a l’ésser humà i el desenvolupament de la societat.",
       "trabajado": false
      },
      {
       "texto": "4.2. Explicar la necessitat de sistematitzar d’una manera o d’una altra la nomenclatura química i la formulació de les substàncies.",
       "trabajado": false
      },
      {
       "texto": "4.3. Explicar el paper de les institucions científiques del segle XIX en el desenvolupament de les ciències fisicoquímiques. Analitzar la quantitat de dones presents i explicar-ne les causes.",
       "trabajado": false
      },
      {
       "texto": "4.4. Descriure les dificultats per a establir una classificació dels elements químics i explicar la classificació de Mendeleiev, la seua originalitat i les seues limitacions.",
       "trabajado": false
      }
     ]
    }
   ],
   "actividades": [
    RFRP_DOSSIER_DEFECTO
   ],
   "calificacion": "",
   "valoracion": "",
   "justificacion": ""
  },
  {
   "gruposCE": [
    {
     "ce": "CE5",
     "cc": "CCL, STEM, CPSAA",
     "criterios": [
      {
       "texto": "5.1. Utilitzar el model cineticocorpuscular per a explicar els estats de la matèria i els seus canvis, així com la variació de la densitat en els canvis d’estat.",
       "trabajado": false
      },
      {
       "texto": "5.2. Utilitzar el model del canvi químic per a explicar la transformació d’unes substàncies en unes altres de diferents propietats.",
       "trabajado": false
      },
      {
       "texto": "5.3. Utilitzar el model d'interacció per explicar els canvis en la velocitat dels cossos o les seues deformacions.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE6",
     "cc": "CCL, CP, STEM, CD",
     "criterios": [
      {
       "texto": "6.1. Reconéixer la terminologia conceptual pròpia de l’àrea i utilitzar-la correctament en activitats orals i escrites.",
       "trabajado": false
      },
      {
       "texto": "6.2. Llegir textos d’extensió breu en formats diversos propis de l’àrea utilitzant les estratègies de comprensió lectora per a obtindre informació i aplicar-la en la reflexió sobre el contingut.",
       "trabajado": false
      },
      {
       "texto": "6.3. Escriure textos descriptius i explicatius propis de l’àrea en diversos formats i suports, cuidant els seus aspectes formals, aplicant les normes de correcció ortogràfica i gramatical, per a transmetre de manera organitzada els seus coneixements amb un llenguatge no discriminatori.",
       "trabajado": false
      },
      {
       "texto": "6.4. Expressar oralment textos prèviament planificats, propis de l’àrea, en exposicions de curta duració, per a transmetre de manera organitzada els seus coneixements amb un llenguatge no discriminatori.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE7",
     "cc": "CCL, STEM, CD",
     "criterios": [
      {
       "texto": "7.1. Reconéixer la importància de normalització del sistema d’unitats i utilitzar adequadament les mesures del sistema internacional.",
       "trabajado": false
      },
      {
       "texto": "7.2. Fer canvis d’unitats de massa, longitud, superfície i volum.",
       "trabajado": false
      },
      {
       "texto": "7.3. Construir taules de parelles de valors massavolum de substàncies sòlides i líquides.",
       "trabajado": false
      },
      {
       "texto": "7.4. Construir els gràfics representatius. Predir i interpretar representacions V = f (T); P = f (V); P = f (T).",
       "trabajado": false
      },
      {
       "texto": "7.5. Reconéixer el significat de fórmula química emprant símbols químics. Distingir entre l’ús de fórmules químiques quan s’utilitzen per a representar molècules i quan s’utilitzen per a representar estructures cristal·lines polimèriques.",
       "trabajado": false
      },
      {
       "texto": "7.6. Interpretar les corbes de solubilitat de diferents substàncies.",
       "trabajado": false
      },
      {
       "texto": "7.7. Construir i interpretar gràfics espai-temps i velocitattemps en casos d'acceleració constant.",
       "trabajado": false
      }
     ]
    }
   ],
   "actividades": [
    RFRP_DOSSIER_DEFECTO
   ],
   "calificacion": "",
   "valoracion": "",
   "justificacion": ""
  },
  {
   "gruposCE": [
    {
     "ce": "CE9",
     "cc": "STEM, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "9.1. Utilitzar les propietats característiques de les substàncies per a proposar mètodes de separació de mescles, i descriure el material de laboratori adequat.",
       "trabajado": false
      },
      {
       "texto": "9.2. Classificar materials per les seues propietats, relacionant les propietats dels materials del nostre entorn amb l’ús que se’n fa.",
       "trabajado": false
      },
      {
       "texto": "9.3. Comparar les densitats de diferents substàncies (sòlids, líquids i gasos).",
       "trabajado": false
      },
      {
       "texto": "9.4. Distingir entre sistemes materials d’ús quotidià per a classificar-los en substàncies pures i mescles, i diferenciar-los entre els seus diferents tipus.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE10",
     "cc": "STEM, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "10.1. Reconéixer situacions de la vida quotidiana en les quals es produeixen reaccions químiques i predir com la influència d’uns certs factors pot servir per a controlar aquests processos, alentint-los o accelerant-los per a solucionar problemes que afecten la nostra qualitat de vida.",
       "trabajado": false
      },
      {
       "texto": "10.2. Descriure reaccions d’interés industrial i els usos dels productes obtinguts, així com les reaccions de combustió, per a justificar la seua importància en la producció d’energia elèctrica i altres reaccions d’importància biològica o industrial.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE11",
     "cc": "STEM, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "11.1. Reconèixer les diferents forces que apareixen a la natura i els diferents fenòmens associats a elles.",
       "trabajado": false
      },
      {
       "texto": "11.2. Relacionar les forces amb els efectes que produeixen i comprovar aquesta relació experimentalment, registrant-ne els resultats en taules i representacions gràfiques.",
       "trabajado": false
      }
     ]
    }
   ],
   "actividades": [
    RFRP_DOSSIER_DEFECTO
   ],
   "calificacion": "",
   "valoracion": "",
   "justificacion": ""
  }
 ],
 "3": [
  {
   "gruposCE": [
    {
     "ce": "CE1",
     "cc": "CCL, CP, STEM, CD, CPSAA, CE",
     "criterios": [
      {
       "texto": "1.1. Esbrinar, mitjançant dissenys experimentals, com mesurar la massa i el volum ocupats per un gas que s’ha després en reaccions químiques.",
       "trabajado": false
      },
      {
       "texto": "1.2. Fer investigacions per a esbrinar les relacions entre la pressió, el volum i la temperatura dels gasos.",
       "trabajado": false
      },
      {
       "texto": "1.3. Investigar el metall de què està feta una peça problema.",
       "trabajado": false
      },
      {
       "texto": "1.4. Dur a terme estudis experimentals de caràcter quantitatiu sobre reaccions d’interés especial.",
       "trabajado": false
      },
      {
       "texto": "1.5. Utilitzar adequadament aparells de mesura de la intensitat i la diferència de potencial entre dos punts d’un circuit.",
       "trabajado": false
      },
      {
       "texto": "1.6. Dur a terme una investigació sobre la mesura de la resistència d’un component en un circuit.",
       "trabajado": false
      },
      {
       "texto": "1.7. Comprovar que es compleix la llei de conservació de la massa en experiències de caràcter pràctic que incloguen substàncies en estat gasós.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE2",
     "cc": "CCL, STEM, CD, CPSAA, CC, CE",
     "criterios": [
      {
       "texto": "2.1. Analitzar els enunciats de les situacions plantejades i descriure la situació a la qual es pretén donar resposta, identificant les variables que hi intervenen.",
       "trabajado": false
      },
      {
       "texto": "2.2. Triar, en resoldre un determinat problema, el tipus d’estratègia més adequada, i justificar-ne adequadament l’elecció.",
       "trabajado": false
      },
      {
       "texto": "2.3. Buscar i seleccionar la informació necessària per a la resolució de la situació en problemes amb alguns graus d’obertura.",
       "trabajado": false
      },
      {
       "texto": "2.4. Expressar, utilitzant el llenguatge matemàtic adequat al seu nivell, el procediment que s’ha seguit en la resolució d’un problema.",
       "trabajado": false
      },
      {
       "texto": "2.5. Comprovar i interpretar les solucions trobades.",
       "trabajado": false
      },
      {
       "texto": "2.6. Participar en equips de treball per a resoldre els problemes plantejats, donar suport a companys i companyes, demostrant empatia i reconeixent les seues aportacions, i utilitzar el diàleg igualitari per a resoldre conflictes i discrepàncies. lecció de la situació problemàtica, que serà.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE3",
     "cc": "CCL, CP, STEM, CD, CPSAA, CC, CCEC",
     "criterios": [
      {
       "texto": "3.1. Identificar algunes de les fal·làcies més utilitzades en els discursos pseudocientífics.",
       "trabajado": false
      },
      {
       "texto": "3.2. Identificar els elements representatius d’un text científic argumentatiu.",
       "trabajado": false
      },
      {
       "texto": "3.3. Elaborar seqüències argumentatives consistents, coherents i congruents, utilitzant els connectors lògics adequats.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE4",
     "cc": "STEM, CPSAA, CC",
     "criterios": [
      {
       "texto": "4.1. Analitzar les polèmiques relatives a les lleis de combinació en la química.",
       "trabajado": false
      },
      {
       "texto": "4.2. Descriure les conseqüències de la introducció de noves tècniques en la descomposició de compostos i anàlisi de substàncies per al desenvolupament de la ciència química.",
       "trabajado": false
      },
      {
       "texto": "4.3. Descriure les implicacions de la incorporació generalitzada de l’energia elèctrica a la nostra societat.",
       "trabajado": false
      }
     ]
    }
   ],
   "actividades": [
    RFRP_DOSSIER_DEFECTO
   ],
   "calificacion": "",
   "valoracion": "",
   "justificacion": ""
  },
  {
   "gruposCE": [
    {
     "ce": "CE5",
     "cc": "CCL, STEM, CPSAA",
     "criterios": [
      {
       "texto": "5.1. Utilitzar el model d’energia per a explicar el seu paper en les transformacions que tenen lloc en el nostre entorn.",
       "trabajado": false
      },
      {
       "texto": "5.2. Utilitzar el model de Dalton per a explicar les lleis ponderals.",
       "trabajado": false
      },
      {
       "texto": "5.3. Utilitzar el model de càrrega i interacció elèctrica per a explicar els fenòmens d’atracció/repulsió elèctriques.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE6",
     "cc": "CCL, CP, STEM, CD",
     "criterios": [
      {
       "texto": "6.1. Reconéixer la terminologia conceptual pròpia de l’àrea i utilitzar-la correctament en activitats orals i escrites en formats digitals.",
       "trabajado": false
      },
      {
       "texto": "6.2. Llegir textos, tant argumentatius com expositius, en formats diversos propis de l’àrea, utilitzant les estratègies de comprensió lectora per a obtindre informació i aplicar-la en la reflexió sobre el contingut.",
       "trabajado": false
      },
      {
       "texto": "6.3. Escriure textos argumentatius propis de l’àrea en diversos formats i suports, cuidant els seus aspectes formals, aplicant les normes de correcció ortogràfica i gramatical, per a transmetre de manera organitzada els seus coneixements amb un llenguatge no discriminatori.",
       "trabajado": false
      },
      {
       "texto": "6.4. Expressar oralment textos prèviament planificats, propis de l’àrea, per a transmetre de manera organitzada els seus coneixements amb un llenguatge no discriminatori.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE7",
     "cc": "CCL, STEM, CD",
     "criterios": [
      {
       "texto": "7.1. Elaborar i interpretar gràfics i models senzills sobre les relacions pressió-volumtemperatura dels ga.",
       "trabajado": false
      },
      {
       "texto": "7.2. Diferenciar una mescla i una substància pura mitjançant representacions segons el model de partícula.",
       "trabajado": false
      },
      {
       "texto": "7.3. Utilitzar els símbols químics per a representar una reacció química i explicar el que significa una equació química ajustada. Reconéixer el significat submicroscòpic de les relacions que hi ha entre els coeficients que acompanyen cada fórmula química.",
       "trabajado": false
      },
      {
       "texto": "7.4. Utilitzar esquemes/dibuixos en els quals s’indique la distribució de càrregues per a explicar els fenòmens d’atracció/repulsió elèctriques. o.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE8",
     "cc": "STEM, CD, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "8.1. Identificar els diferents tipus d’energia posats de manifest en fenòmens quotidians i en experiències senzilles dutes a terme en el laboratori.",
       "trabajado": false
      },
      {
       "texto": "8.2. Identificar la calor com un procés de transferència d’energia entre els cossos a diferent temperatura i descriure casos reals en els quals es posa de manifest.",
       "trabajado": false
      },
      {
       "texto": "8.3. Justificar la transformació d’energia en els sistemes aplicant el principi de conservació de l’energia i valorant la limitació que el fenomen de la degradació de l’energia suposa per a l’optimització dels processos d’obtenció d’energia.",
       "trabajado": false
      },
      {
       "texto": "8.4. Relacionar els conceptes d’energia, calor i temperatura, en termes de la teoria cineticocorpuscular, i descriure els mecanismes pels quals es transfereix l’energia tèrmica en diferents situacions quotidianes.",
       "trabajado": false
      },
      {
       "texto": "8.5. Raonar avantatges i inconvenients de les diferents fonts energètiques. Enumerar mesures que contribueixen a l’estalvi col·lectiu o individual d’energia. Explicar per què l’energia no pot reutilitzar-se sense límits.",
       "trabajado": false
      },
      {
       "texto": "8.6. Explicar el fenomen físic del corrent elèctric i interpretar el significat de les magnituds: intensitat de corrent, diferència de potencial i resistència, així com les relacions entre aquestes.",
       "trabajado": false
      },
      {
       "texto": "8.7. Quantificar l’energia i analitzar el consum energètic utilitzant les dades subministrades pels electrodomèstics.",
       "trabajado": false
      },
      {
       "texto": "8.8. Calcular l’energia necessària per a mantindre’s un dia complet, així com la dieta alimentosa corresponent a aquesta energia, a partir de taules de la despesa calòrica corresponent a diverses activitats corporals i del valor energètic de diferents aliments.",
       "trabajado": false
      },
      {
       "texto": "8.9. Reconéixer la importància i les repercussions per a la societat i el medi ambient de les diferents fonts d’energia renovables i no renovables.",
       "trabajado": false
      }
     ]
    }
   ],
   "actividades": [
    RFRP_DOSSIER_DEFECTO
   ],
   "calificacion": "",
   "valoracion": "",
   "justificacion": ""
  },
  {
   "gruposCE": [
    {
     "ce": "CE9",
     "cc": "STEM, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "9.1. Diferenciar el dissolvent del solut en analitzar la composició de mescles homogènies d’interés especial. Efectuar correctament càlculs numèrics senzills sobre la seua composició.",
       "trabajado": false
      },
      {
       "texto": "9.2. Predir la variació que experimentarà la densitat d’un gas en variar la temperatura (canvis de T o de P).",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE10",
     "cc": "STEM, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "10.1. Utilitzar els símbols químics per a representar una reacció química com a alternativa a la simbologia emprada per Dalton.",
       "trabajado": false
      },
      {
       "texto": "10.2. Explicar el significat d’una equació química ajustada, interpretant el significat submicroscòpic de les relacions que hi ha entre els coeficients que acompanyen cada fórmula química.",
       "trabajado": false
      },
      {
       "texto": "10.3. Aplicar les lleis de Lavoisier i de Proust en el càlcul de masses en reaccions químiques senzilles aplicades a processos que ocorren en la vida quotidiana.",
       "trabajado": false
      },
      {
       "texto": "10.4. Justificar l’elaboració del model atòmic de Dalton a partir de les lleis de les reaccions químiques.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE11",
     "cc": "STEM, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "11.1. Descriure els tipus de càrregues elèctriques, el paper que tenen en la constitució de la matèria i les característiques de les forces que es manifesten entre si.",
       "trabajado": false
      },
      {
       "texto": "11.2. Interpretar fenòmens elèctrics mitjançant el model de càrrega elèctrica, i valorar la importància de l’electricitat en la vida quotidiana.",
       "trabajado": false
      },
      {
       "texto": "11.3. Reconéixer les diferents forces que hi ha en la naturalesa i els diferents fenòmens associats a aquestes.",
       "trabajado": false
      },
      {
       "texto": "11.4. Justificar qualitativament fenòmens magnètics i valorar la contribució del magnetisme en el desenvolupament tecnològic.",
       "trabajado": false
      },
      {
       "texto": "11.5. Comparar els diferents tipus d’imants, analitzar-ne el comportament i deduir, mitjançant experiències, les característiques de les forces magnètiques posades de manifest, així com la seua relació amb el corrent elèctric.",
       "trabajado": false
      }
     ]
    }
   ],
   "actividades": [
    RFRP_DOSSIER_DEFECTO
   ],
   "calificacion": "",
   "valoracion": "",
   "justificacion": ""
  }
 ],
 "4": [
  {
   "gruposCE": [
    {
     "ce": "CE1",
     "cc": "CCL, CP, STEM, CD, CPSAA, CE",
     "criterios": [
      {
       "texto": "1.1. Investigar si una substància és simple o composta a partir de les reaccions de descomposició o síntesi a què dona lloc. Investigar experimentalment el comportament de substàncies orgàniques.",
       "trabajado": false
      },
      {
       "texto": "1.2. Realitzar en el laboratori síntesi de polímers.",
       "trabajado": false
      },
      {
       "texto": "1.3. Realitzar dissenys experimentals per al càlcul de la velocitat i l’acceleració d’un mòbil.",
       "trabajado": false
      },
      {
       "texto": "1.4. Realitzar dissenys experimentals per a l’estudi de la caiguda de greus.",
       "trabajado": false
      },
      {
       "texto": "1.5. Investigar experimentalment processos ondulatoris com la reflexió i refracció de la llum.",
       "trabajado": false
      },
      {
       "texto": "1.6. Realitzar investigacions sobre l’equilibri dels cossos rígids basant-se en la noció de centre de gravetat.",
       "trabajado": false
      },
      {
       "texto": "1.7. Construir dispositius de transformació energètica, com motors o piles.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE2",
     "cc": "CCL, STEM, CD, CPSAA, CC, CE",
     "criterios": [
      {
       "texto": "2.1. Analitzar els enunciats de les situacions plantejades i descriure la situació a la qual es pretén donar resposta, identificant les variables que hi intervenen així com el seu caràcter escalar o vectorial.",
       "trabajado": false
      },
      {
       "texto": "2.2. Triar, a l’hora de resoldre un determinat problema, el tipus d’estratègia més adequada, justificant-ne adequadament l’elecció.",
       "trabajado": false
      },
      {
       "texto": "2.3. Buscar i seleccionar la informació necessària per a la resolució de la situació en problemes amb alguns graus d’obertura.",
       "trabajado": false
      },
      {
       "texto": "2.4. Expressar, utilitzant el llenguatge matemàtic adequat al seu nivell, el procediment que s’ha seguit en la resolució d’un problema.",
       "trabajado": false
      },
      {
       "texto": "2.5. Comprovar i interpretar les solucions trobades.",
       "trabajado": false
      },
      {
       "texto": "2.6. Participar en equips de treball per a resoldre els problemes plantejats, donar suport a companys i companyes demostrant empatia i reconeixent les seues aportacions i utilitzar el diàleg igualitari per a resoldre conflictes i discrepàncies.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE3",
     "cc": "CCL, CP, STEM, CD, CPSAA, CC, CCEC",
     "criterios": [
      {
       "texto": "3.1. Aportar arguments consistents, coherents i congruents per a defensar una postura davant del plantejament de determinades controvèrsies científiques.",
       "trabajado": false
      },
      {
       "texto": "3.2. Aportar raons a favor i en contra d’una conclusió determinada. Explicitar els criteris pels quals unes teories ofereixen una millor interpretació que unes altres davant d’un fenomen determinat.",
       "trabajado": false
      },
      {
       "texto": "3.3. Utilitzar estratègies de filtratge per a seleccionar informació en mitjans digitals, identificant les fonts de les quals procedeix i aportant raons per a descartar les fonts no fiables.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE4",
     "cc": "STEM, CPSAA, CC",
     "criterios": [
      {
       "texto": "4.1. Descriure les causes per les quals es produeix en el segle XX un moment propici per al desenvolupament dels models atòmics.",
       "trabajado": false
      },
      {
       "texto": "4.2. Descriure el desenvolupament i la importància de les societats científiques i el seu reconeixement social.",
       "trabajado": false
      },
      {
       "texto": "4.3. Descriure el paper dels i les científiques en els conflictes bèl·lics, establint com afecten aquests al desenvolupament de la ciència i discutint postures ètiques.",
       "trabajado": false
      }
     ]
    }
   ],
   "actividades": [
    RFRP_DOSSIER_DEFECTO
   ],
   "calificacion": "",
   "valoracion": "",
   "justificacion": ""
  },
  {
   "gruposCE": [
    {
     "ce": "CE5",
     "cc": "CCL, STEM, CPSAA",
     "criterios": [
      {
       "texto": "5.1. Utilitzar el model atòmic de Thomson per a explicar els fenòmens d’electrització i la formació d’ions.",
       "trabajado": false
      },
      {
       "texto": "5.2. Utilitzar el model atòmic de Rutherford per a explicar l’existència d’isòtops i alguns fenòmens radioactius.",
       "trabajado": false
      },
      {
       "texto": "5.3. Utilitzar el model d’interacció física per a explicar les forces i els canvis en el moviment.",
       "trabajado": false
      },
      {
       "texto": "5.4. Utilitzar el model d’energia per a explicar alguns fenòmens ondulatoris.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE6",
     "cc": "CCL, CP, STEM, CD",
     "criterios": [
      {
       "texto": "6.1. Reconéixer la terminologia conceptual pròpia de l’àrea i utilitzar-la correctament en activitats orals i escrites.",
       "trabajado": false
      },
      {
       "texto": "6.2. Llegir textos, tant argumentatius com expositius, en formats diversos propis de l’àrea utilitzant les estratègies de comprensió lectora per a obtindre informació i aplicar-la en la reflexió sobre el contingut.",
       "trabajado": false
      },
      {
       "texto": "6.3. Escriure textos argumentatius propis de l’àrea en diversos formats i suports, cuidant els seus aspectes formals, aplicant les normes de correcció ortogràfica i gramatical, per a transmetre de forma organitzada els seus coneixements amb un llenguatge no discriminatori.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE7",
     "cc": "CCL, STEM, CD",
     "criterios": [
      {
       "texto": "7.1. Representar gràficament les forces que actuen sobre un cos en una dimensió.",
       "trabajado": false
      },
      {
       "texto": "7.2. Relacionar les magnituds de velocitat, acceleració i força amb una expressió matemàtica i aplicar correctament les principals equacions.",
       "trabajado": false
      },
      {
       "texto": "7.3. Distingir clarament entre les unitats de velocitat i acceleració, així com entre magnituds lineals i angulars.",
       "trabajado": false
      },
      {
       "texto": "7.4. Utilitzar un sistema de referència per a representar els elements del moviment mitjançant vectors, justificant la relativitat del moviment i classificant els moviments per les seues característiques.",
       "trabajado": false
      },
      {
       "texto": "7.5. Emprar les representacions gràfiques de posició i velocitat en funció del temps per a deduir la velocitat mitjana i instantània i justificar si un moviment és accelerat o no.",
       "trabajado": false
      },
      {
       "texto": "7.6. Emprar les representacions gràfiques d’espai i velocitat en funció del temps per a deduir la velocitat mitjana i instantània i justificar si un moviment és accelerat o no.",
       "trabajado": false
      },
      {
       "texto": "7.7. Representar mitjançant equacions les transformacions de la matèria de manera consistent amb el principi de conservació de la matèria.",
       "trabajado": false
      },
      {
       "texto": "7.8. Escriure fórmules senzilles dels compostos de carboni.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE8",
     "cc": "STEM, CD, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "8.1. Diferenciar entre treball mecànic i treball fisiològic. Explicar que el treball consisteix en la transmissió d’energia d’un cos a un altre mitjançant una força que desplaça el seu punt d’aplicació. Identificar la potència amb la rapidesa amb què es fa un treball i explicar la importància d’aquesta magnitud en la indústria i la tecnologia.",
       "trabajado": false
      },
      {
       "texto": "8.2. Relacionar la variació d’energia mecànica que ha tingut lloc en un procés amb el treball amb què s’ha realitzat. Aplicar de manera correcta el principi de conservació de l’energia en l’àmbit de la mecànica.",
       "trabajado": false
      },
      {
       "texto": "8.3. Explicar les característiques fonamentals dels moviments ondulatoris. Identificar fets reals en els quals es manifeste un moviment ondulatori.",
       "trabajado": false
      },
      {
       "texto": "8.4. Relacionar la formació d’una ona amb la propagació de la pertorbació que l’origina.",
       "trabajado": false
      },
      {
       "texto": "8.5. Indicar les característiques que han de tindre els sons per a ser audibles. Descriure la naturalesa de l’emissió sonora.",
       "trabajado": false
      }
     ]
    }
   ],
   "actividades": [
    RFRP_DOSSIER_DEFECTO
   ],
   "calificacion": "",
   "valoracion": "",
   "justificacion": ""
  },
  {
   "gruposCE": [
    {
     "ce": "CE9",
     "cc": "STEM, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "9.1. Identificar hidrocarburs senzills i representar-los mitjançant la seua fórmula molecular, descrivint les seues aplicacions, i reconéixer els grups funcionals presents en molècules d’especial interés.",
       "trabajado": false
      },
      {
       "texto": "9.2. Justificar la gran quantitat de compostos orgànics existents, així com la formació de macromolècules i la seua importància en els éssers vius.",
       "trabajado": false
      },
      {
       "texto": "9.3. Descriure algunes de les principals substàncies químiques aplicades en diversos àmbits de la societat: agrícola, alimentari, construcció i industrial.",
       "trabajado": false
      },
      {
       "texto": "9.4. Explicar les característiques bàsiques de compostos químics d’interés social: petroli i derivats, i fàrmacs. Explicar els perills de l’ús inadequat dels medicaments.",
       "trabajado": false
      },
      {
       "texto": "9.5. Explicar les característiques bàsiques dels processos radioactius, la seua perillositat i les seues aplicacions.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE10",
     "cc": "STEM, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "10.1. Explicar els processos d’oxidació i combustió, i analitzar la seua incidència en el medi ambient.",
       "trabajado": false
      },
      {
       "texto": "10.2. Explicar les característiques dels àcids i de les bases i realitzar experiències de neutralització.",
       "trabajado": false
      },
      {
       "texto": "10.3. Utilitzar la noció de quantitat de substància per a realitzar càlculs en reaccions químiques.",
       "trabajado": false
      }
     ]
    },
    {
     "ce": "CE11",
     "cc": "STEM, CPSAA, CCEC",
     "criterios": [
      {
       "texto": "11.1. Utilitzar les nocions bàsiques de l’estàtica de fluids per a descriure les seues aplicacions.",
       "trabajado": false
      },
      {
       "texto": "11.2. Explicar com actuen els fluids sobre els cossos que hi suren o estan submergits aplicant el principi d’Arquímedes.",
       "trabajado": false
      },
      {
       "texto": "11.3. Identificar les forces que actuen sobre un cos, generen acceleracions o no.",
       "trabajado": false
      },
      {
       "texto": "11.4. Descriure els principis de la dinàmica i aportar a partir d’aquests una explicació científica als moviments quotidians. Determinar la importància de la força de fregament en la vida real.",
       "trabajado": false
      },
      {
       "texto": "11.5. Identificar les forces implicades en fenòmens quotidians assenyalant les interaccions del cos en relació amb altres cossos.",
       "trabajado": false
      },
      {
       "texto": "11.6. Identificar el caràcter universal de la força de la gravitació i vincular-lo a una visió del món subjecte a lleis que s’expressen en forma matemàtica.",
       "trabajado": false
      }
     ]
    }
   ],
   "actividades": [
    RFRP_DOSSIER_DEFECTO
   ],
   "calificacion": "",
   "valoracion": "",
   "justificacion": ""
  }
 ]
};
const RFRP_CE_LEGEND=[
 {
  "ce": "CE1",
  "enunciado": "Resoldre problemes científics abordables en l’àmbit escolar a partir de treballs d’investigació de caràcter experimental."
 },
 {
  "ce": "CE2",
  "enunciado": "Analitzar i resoldre situacions problemàtiques de l’àmbit de la física i la química utilitzant la lògica científica i alternant les estratègies del treball individual amb el treball en equip."
 },
 {
  "ce": "CE3",
  "enunciado": "Utilitzar el coneixement científic com a instrument del pensament crític, interpretant i comunicant missatges científics, desenvolupant argumentacions i accedint a fonts fiables, per a distingir la informació contrastada de les faules i opinions."
 },
 {
  "ce": "CE4",
  "enunciado": "Justificar la validesa del model científic com a producte dinàmic que es va revisant i reconstruint sota la influència del context social i històric, atenent la importància de la ciència en l’avanç de les societats, així com els riscos d’un ús inadequat o interessat dels coneixements i les seues limitacions."
 },
 {
  "ce": "CE5",
  "enunciado": "Utilitzar models de física i química per a identificar, caracteritzar i analitzar alguns fenòmens naturals, així com per a explicar altres fenòmens de característiques similars."
 },
 {
  "ce": "CE6",
  "enunciado": "Utilitzar adequadament el llenguatge científic propi de la física i la química en la interpretació i transmissió d’informació."
 },
 {
  "ce": "CE7",
  "enunciado": "Interpretar correctament la informació presentada en diferents formats de representació gràfica i simbòlica utilitzats habitualment en la física i la química."
 },
 {
  "ce": "CE8",
  "enunciado": "Distingir les diferents manifestacions de l’energia i identificar les seues formes de transmissió i la seua conservació i dissipació en contextos pròxims."
 },
 {
  "ce": "CE9",
  "enunciado": "Identificar i caracteritzar les substàncies a partir de les seues propietats físiques per a relacionar els materials del nostre entorn amb l’ús que se’n fa."
 },
 {
  "ce": "CE10",
  "enunciado": "Caracteritzar els canvis químics com a transformació d’unes substàncies en altres de diferents, i reconéixer la importància de les transformacions químiques en activitats i processos quotidians."
 },
 {
  "ce": "CE11",
  "enunciado": "Identificar les interaccions com a causa de les transformacions que tenen."
 }
];
const RFRP_CC_LEGEND=[
  { sigla:"CCL", nombre:"Competencia en comunicación lingüística" },
  { sigla:"CP", nombre:"Competencia plurilingüe" },
  { sigla:"STEM", nombre:"Competència matemàtica i competència en ciència, tecnologia i enginyeria" },
  { sigla:"CD", nombre:"Competencia digital" },
  { sigla:"CPSAA", nombre:"Competencia personal, social y de aprender a aprender" },
  { sigla:"CC", nombre:"Competencia ciudadana" },
  { sigla:"CE", nombre:"Competencia emprendedora" },
  { sigla:"CCEC", nombre:"Competencia en conciencia y expresión culturales" },
];
function rfrpCeLegendHTML(){
  return `<div class="card">
  <h2 style="font-size:14.5px">Leyenda — Competencias específicas</h2>
  <div class="grid" style="gap:5px;margin-top:6px">
    ${RFRP_CE_LEGEND.map(l=>`<div style="font-size:12px;line-height:1.45"><strong>${l.ce}</strong> — ${esc(l.enunciado)}</div>`).join("")}
  </div>
  <h2 style="font-size:14.5px;margin-top:16px">Leyenda — Competencias clave</h2>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:5px;margin-top:6px">
    ${RFRP_CC_LEGEND.map(l=>`<div style="font-size:12px"><strong>${l.sigla}</strong> — ${esc(l.nombre)}</div>`).join("")}
  </div>
</div>`;
}
function rfrpCeLegendPrintHTML(){
  return `<h2>Leyenda — Competencias específicas</h2>
    <table><tbody>
    ${RFRP_CE_LEGEND.map(l=>`<tr><th style="width:50px">${l.ce}</th><td style="font-size:12px">${esc(l.enunciado)}</td></tr>`).join("")}
    </tbody></table>
    <h2>Leyenda — Competencias clave</h2>
    <table><tbody>
    ${RFRP_CC_LEGEND.map(l=>`<tr><th style="width:70px">${l.sigla}</th><td style="font-size:12px">${esc(l.nombre)}</td></tr>`).join("")}
    </tbody></table>`;
}
const RFRP_MOTIVOS=[
  {id:"absentismo",label:"Absentismo"},
  {id:"dificultadesAprendizaje",label:"Dificultades de aprendizaje"},
  {id:"enfermedad",label:"Enfermedad"},
  {id:"problematicaSociofamiliar",label:"Problemática sociofamiliar"},
  {id:"faltaMotivacion",label:"Falta de motivación"},
  {id:"faltaTrabajoEstudio",label:"Falta de trabajo y estudio"},
  {id:"otros",label:"Otros"}
];
const RP_MEDIDAS_II=[
  {id:"multinivel",label:"Programaciones didácticas multinivel"},
  {id:"actividadesRefuerzo",label:"Actividades de refuerzo"},
  {id:"trabajoCooperativo",label:"Trabajo cooperativo"},
  {id:"ajusteEvaluacion",label:"Ajuste de procedimientos e instrumentos de evaluación"},
  {id:"docenciaCompartida",label:"Docencia compartida"},
  {id:"otros",label:"Otros"}
];
const RP_MEDIDAS_III=[
  {id:"adecuacionPersonalizada",label:"Adecuación personalizada de las propuestas didácticas"},
  {id:"acompanamientoPT",label:"Acompañamiento y soporte personalizado (PT)"},
  {id:"ensenanzaIntensivaLenguas",label:"Enseñanza intensiva de las lenguas oficiales (alumnado recién llegado)"},
  {id:"repiteProgramaPAC",label:"Repite con programa PAC"},
  {id:"repiteProgramaPDC3",label:"Repite con programa PDC 3.º"},
  {id:"repiteProgramaPDC4",label:"Repite con programa PDC 4.º"},
  {id:"repiteProgramaFPB",label:"Repite con FPB"},
  {id:"otros",label:"Otros"}
];
const RFRP_VALORACION_PN=[
  {id:"",label:"— Sin valorar —",color:"var(--mut)"},
  {id:"positiva",label:"Positiva",color:"#16a34a"},
  {id:"negativa",label:"Negativa",color:"#dc2626"}
];
function rfrpValoracionPNInfo(id){ return RFRP_VALORACION_PN.find(v=>v.id===id)||RFRP_VALORACION_PN[0]; }
function rfrpMotivosDefault(){ const o={}; RFRP_MOTIVOS.forEach(m=>o[m.id]=false); o.otrosTexto=""; return o; }
function rpMedidasDefault(lista){ const o={}; lista.forEach(m=>o[m.id]=false); o.otrosTexto=""; return o; }
function rfrpTrimestreVacio(){ return {gruposCE:[],actividades:[RFRP_DOSSIER_DEFECTO],calificacion:"",valoracion:"",justificacion:""}; }
function rfrpGrupoCEVacio(){ return {ce:"",cc:"",criterios:[{texto:"",trabajado:false}]}; }
function rfrpTrimestresIniciales(nivelModelo){
  if(nivelModelo && RFRP_MODELOS[nivelModelo]){
    return JSON.parse(JSON.stringify(RFRP_MODELOS[nivelModelo]));
  }
  return [rfrpTrimestreVacio(),rfrpTrimestreVacio(),rfrpTrimestreVacio()];
}
const NIV={
  excelente:{etq:"Excelente",bg:"#dcece0",fg:"#1e5631"},
  adecuado:{etq:"Adecuado",bg:"#d9e6f2",fg:"#1d4e74"},
  enProceso:{etq:"En proceso",bg:"#f6eccf",fg:"#8a5a12"},
  necesita:{etq:"Necesita mejorar",bg:"#f3dcdc",fg:"#912525"}
};
const NIVCUANT=[
  {max:4.9,etq:"Insuficiente",bg:"#f3dcdc",fg:"#912525"},
  {max:5.9,etq:"Suficiente",bg:"#f6eccf",fg:"#8a5a12"},
  {max:6.9,etq:"Bien",bg:"#d9e6f2",fg:"#1d4e74"},
  {max:8.9,etq:"Notable",bg:"#e3f0df",fg:"#3a6b2a"},
  {max:10,etq:"Sobresaliente",bg:"#dcece0",fg:"#1e5631"}
];
