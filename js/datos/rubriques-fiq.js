/* ============================================================================
   Quadern d'avaluació · Rúbriques de Física i Química (plantilles de partida)
   js/datos/rubriques-fiq.js

   Rúbriques per nivells d'assoliment (AE / AN / AS / NA) del departament.
   S'afigen una sola vegada a «Plantilles de rúbrica» (state.plantillasRubrica):
   si el professor/a n'esborra alguna, no torna a aparéixer. Es poden triar en
   crear un examen o treball al Corrector, o carregar en qualsevol rúbrica.
   Format de cada fila: [nom de l'apartat, pes %, AE, AN, AS, NA].
   ============================================================================ */
const RUBRIQUES_FIQ_VERSIO=1;
const RUBRIQUES_FIQ=[
  { nom:"Deures", nivells:[10,7,5,1], files:[
    ["Presentació",15,"Està net i amb bona lletra.","Prou net i la lletra s'entén.","Una mica brut i/o la lletra podria millorar.","Molt brut i la lletra no s'entén."],
    ["Treball",25,"Totes les preguntes estan fetes.","Hi ha alguna pregunta per fer.","La meitat de les preguntes estan per fer.","No ho ha fet o quasi no hi ha cap pregunta feta."],
    ["Comprensió i plantejament",35,"Entén perfectament totes les activitats i estan ben plantejades.","Entén la majoria de les activitats i estan prou ben plantejades.","Entén algunes activitats i/o no les planteja adequadament.","No entén les activitats, no estan ben plantejades o no està fet."],
    ["Resolució",25,"Totes les preguntes estan ben resoltes.","La gran majoria de les preguntes estan ben resoltes, encara que hi ha alguna resposta inadequada.","Només algunes preguntes estan resoltes correctament.","La majoria o totes les preguntes estan mal resoltes, o no està fet."]
  ]},
  { nom:"Laboratori", nivells:[10,7.5,5,1], files:[
    ["Material",15,"S'ha tingut molta cura del material: no s'ha trencat, no s'han donat colps i s'ha utilitzat per a la seua finalitat i no per a una altra.","S'ha tingut cura del material, però ha faltat delicadesa i fer-ne una utilització més adequada.","No se n'ha tingut gaire cura; s'ha donat algun colp de forma voluntària.","No se n'ha tingut gens de cura."],
    ["Seguretat i normes",15,"Du sempre l'equip de protecció (bata, ulleres, guants si cal), coneix els pictogrames i segueix totes les normes de seguretat i de gestió de residus.","Segueix les normes de seguretat, però de vegades cal recordar-li l'equip de protecció o on van els residus.","Segueix les normes només quan se li recorden; algun descuit pot comportar risc.","No segueix les normes de seguretat ni du l'equip de protecció; posa en risc la seua seguretat o la dels altres."],
    ["Treball experimental",25,"S'han seguit exactament els passos i s'ha contestat a les preguntes fent una molt bona observació.","S'han seguit adequadament els passos i s'ha contestat a les preguntes fent una bona observació.","Els passos no s'han seguit exactament i s'ha contestat a les preguntes fent una observació poc acurada.","Els passos no s'han seguit i s'ha contestat a les preguntes fent una observació gens acurada."],
    ["Informe de la pràctica",30,"Recull totes les dades en taules amb unitats, fa els càlculs i gràfiques correctament i n'extrau conclusions ben argumentades.","Recull les dades amb unitats i fa els càlculs; hi ha algun error menor o les conclusions són poc desenvolupades.","Dades incompletes o sense unitats, càlculs amb errors o conclusions molt pobres.","No presenta l'informe o li falten la major part de les dades, els càlculs i les conclusions."],
    ["Actitud i treball en equip",15,"S'ha utilitzat un molt bon to de veu, els desplaçaments pel laboratori han estat tranquils i només els necessaris, respectant el material i el treball dels companys i companyes; col·labora i es reparteix la faena amb l'equip.","S'ha utilitzat un bon to de veu, els desplaçaments pel laboratori no han sigut només els necessaris, però s'ha respectat el material i el treball dels companys i companyes; col·labora amb l'equip.","S'ha utilitzat un to de veu correcte, però hi ha hagut excessius desplaçaments i s'ha respectat poc el material i el treball dels companys i companyes; col·labora poc.","S'ha cridat, els desplaçaments no s'han fet respectant el material ni la faena dels companys i companyes; no col·labora amb l'equip."]
  ]},
  { nom:"Actitud", nivells:[10,7.5,5,1], files:[
    ["Puntualitat (assistència puntual a les classes)",20,"Està sempre a l'aula i al seu lloc quan arriba el professor o la professora, i amb el material preparat.","Està quasi sempre a l'aula, calmat i a punt per a treballar.","En ocasions no està a l'aula o està alterant la classe.","En la majoria de les ocasions no està a l'aula i/o està cridant o alterat."],
    ["Interès (demostra interès en classe)",20,"Demostra gran interès per l'assignatura i segueix les classes amb molta atenció.","Demostra interès per l'assignatura i segueix les classes.","Demostra poc interès per l'assignatura i/o segueix les classes amb poca atenció.","No demostra gaire interès per l'assignatura i mai segueix les classes amb atenció."],
    ["Participació en classe (freqüència i qualitat)",20,"Participa freqüentment a classe aportant preguntes o comentaris adequats que afavoreixen el desenvolupament de la classe.","Participa regularment a classe de forma correcta.","Participa poc a classe i/o els seus comentaris no solen afavorir el correcte desenvolupament de la classe.","No participa a classe i/o no mostra interès pels continguts de l'assignatura."],
    ["Col·laboració (col·labora i aporta bon clima a l'aula)",20,"Sempre col·labora amb el seu comportament al bon clima de la classe.","Normalment col·labora, però el seu comportament no sempre afavoreix el bon desenvolupament de la classe.","El seu comportament no és sempre positiu i/o no ajuda al bon clima de la classe.","Té un comportament dolent i sempre molesta els companys o el bon desenvolupament de la classe."],
    ["Llenguatge adequat (correcte, científic i educat; sense grolleries)",20,"Sempre utilitza un llenguatge apropiat per a dirigir-se al docent i als seus companys.","El seu llenguatge és quasi sempre adequat per a dirigir-se al docent i als seus companys.","De vegades no utilitza un llenguatge apropiat per a dirigir-se al docent i als seus companys.","Normalment no utilitza un llenguatge apropiat per a dirigir-se al docent i als seus companys."]
  ]},
  { nom:"Dossier de feina / llibreta", nivells:[10,7.5,5,2.5], files:[
    ["1. Terminis (compliment del termini de presentació)",25,"Presenta el dossier en el termini establert i en el lloc corresponent.","Presenta el dossier 1-2 dies després del termini establert.","Presenta el dossier almenys amb una setmana de retard respecte al termini establert.","No presenta el dossier."],
    ["2. Forma i aspecte (presentació, ordre, numeració)",25,"La presentació és bona. Hi ha tots els apartats treballats, en la forma i l'ordre determinats i segons les instruccions, i sense faltes d'ortografia.","La presentació és bona, en general, però hi ha alguna mancança o errada en la forma i/o l'aspecte, i/o poques faltes d'ortografia.","Cal millorar la forma i/o l'aspecte perquè hi ha diverses mancances, amb algunes faltes d'ortografia.","Presenta el dossier sense tindre en compte les instruccions donades."],
    ["3. Continguts (feina demanada completa i ben resolta)",25,"El dossier conté tota la feina demanada, de forma fàcilment reconeixible, ben resolta i ben presentada.","El dossier està bé, en general, però hi ha alguna mancança, errada o incorrecció.","Cal millorar alguns dels aspectes anteriors.","Els continguts no hi són tots."],
    ["4. Metodologia (enunciats, dades, unitats, procediment i resultat)",25,"Les feines s'han fet seguint les instruccions i recomanacions: enunciat, dades amb unitats, procediment i resultat destacat.","La majoria de les feines s'han fet seguint les instruccions i recomanacions, però no totes o no sempre.","Les feines s'han fet, majoritàriament, sense tindre en compte les instruccions i recomanacions.","Les feines fetes s'han fet sense seguir cap instrucció ni recomanació donada."]
  ]},
  { nom:"Elaboració i exposició de treballs", nivells:[10,7.5,5,1], files:[
    ["Contingut i rigor científic",30,"El contingut és complet i correcte; explica els conceptes amb rigor, amb magnituds, unitats i exemples adequats.","El contingut és correcte, amb algun error o omissió menor.","El contingut és incomplet o té diversos errors conceptuals.","El contingut és molt pobre o majoritàriament incorrecte."],
    ["Estructura i organització",15,"Té introducció, desenvolupament i conclusions clares, amb un ordre lògic.","Està ben organitzat, però alguna part és poc clara o massa breu.","L'ordre és confús o falta alguna part important.","No té estructura reconeixible."],
    ["Recerca i fonts",10,"Utilitza diverses fonts fiables i les cita correctament.","Utilitza fonts fiables, però les cita de forma incompleta.","Utilitza poques fonts o poc fiables, sense citar-les bé.","No indica cap font o copia literalment sense elaboració pròpia."],
    ["Suport visual",15,"El suport (diapositives, pòster…) és clar, amb poc text, imatges, esquemes o gràfiques que ajuden a entendre el contingut.","El suport és adequat, però té massa text o alguna imatge poc útil.","El suport és poc clar o està desordenat.","No hi ha suport o no ajuda gens a l'exposició."],
    ["Expressió oral i vocabulari científic",20,"Parla amb claredat i seguretat, mira el públic, no llig i utilitza el vocabulari científic adequat.","Parla amb claredat, però de vegades llig o el vocabulari científic és limitat.","Llig gran part de l'exposició, parla amb poca claredat o amb vocabulari poc precís.","Llig tota l'exposició o no s'entén."],
    ["Temps, treball en equip i preguntes",10,"S'ajusta al temps, totes les persones de l'equip participen i respon bé les preguntes.","S'ajusta més o menys al temps i respon la majoria de les preguntes.","No s'ajusta al temps, la participació és desigual o respon amb dificultat.","No s'ajusta gens al temps i no sap respondre les preguntes."]
  ]}
];
const RUBRIQUES_FIQ_NIVELLS=["AE","AN","AS","NA"];
const RUBRIQUES_FIQ_COLORS=["#c8e6c9","#e6f2b3","#ffe5a3","#f7a1aa"];
function rubricaFiqAPlantilla(def){
  const niveles=def.nivells.map((v,i)=>({id:uid(),nombre:RUBRIQUES_FIQ_NIVELLS[i],valor:v,color:RUBRIQUES_FIQ_COLORS[i]}));
  const items=def.files.map(([label,pes,...cel])=>{
    const celdas={}; niveles.forEach((n,i)=>{ celdas[n.id]=cel[i]||""; });
    return {id:uid(),label,max:pes/10,desc:[],links:[],celdas};
  });
  return [{id:uid(),title:"",sinTitulo:true,formato:"niveles",niveles,items,subs:[]}];
}
/* Afig les plantilles que falten (per nom) una sola vegada per versió. */
function sembrarRubriquesFiq(st){
  if(!st || (st.rubriquesFiqVersio||0)>=RUBRIQUES_FIQ_VERSIO) return;
  if(!Array.isArray(st.plantillasRubrica)) st.plantillasRubrica=[];
  const noms=new Set(st.plantillasRubrica.map(p=>String(p.nombre||"").trim().toLowerCase()));
  RUBRIQUES_FIQ.forEach(def=>{
    if(noms.has(def.nom.toLowerCase())) return;
    st.plantillasRubrica.push({id:uid(),nombre:def.nom,rubrica:rubricaFiqAPlantilla(def),fiq:true});
  });
  st.rubriquesFiqVersio=RUBRIQUES_FIQ_VERSIO;
}
