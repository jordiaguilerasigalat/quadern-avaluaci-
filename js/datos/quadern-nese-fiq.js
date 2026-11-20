/* ============================================================================
   Quadern d'avaluació · Dossiers de reforç NESE de Física i Química
   js/datos/quadern-nese-fiq.js

   Tasques dels dossiers de treball per a l'alumnat NESE (2n i 3r d'ESO,
   2026-27) en el mateix ordre que el dossier imprés (Activitat 1, 2…; ★ inici,
   ★★ guiada, ★★★ autonomia). Cada tasca porta els criteris d'avaluació que
   treballa (codis del currículum valencià de FiQ d'ESO; la CE és la part
   abans del punt). El text dels criteris és la versió adaptada del pla de
   reforç; el text oficial ix del catàleg (catalogo). trim = 0/1/2.
   Generat a partir de les dades del generador del pla NESE.
   ============================================================================ */
const QN_DOSSIERS={"2eso":{"curs":"2n ESO","catalogo":"FiQ_2ESO","temes":[
 {"n":1,"titol":"La mesura de la matèria","trim":0,"criteris":[["7.1","Reconeix les magnituds i unitats del SI i tria la unitat adequada per a mesurar una cosa quotidiana."],["7.2","Fa canvis d'unitats de longitud, massa, capacitat i temps d'un pas (amb l'escala o un factor de conversió donat)."],["9.3","Calcula la densitat amb d = m / V i la compara amb la de l'aigua per a predir si sura."],["2.2","Ordena les etapes del mètode científic en un experiment senzill i formula una hipòtesi."],["6.1","Anomena el material bàsic de laboratori i interpreta els pictogrames de seguretat."]],"activitats":[
  {"titol":"L'escala de les unitats","nivell":"Inici","criteris":["7.2"]},
  {"titol":"Què es pot mesurar?","nivell":"Inici","criteris":["7.1"]},
  {"titol":"Pictogrames de seguretat","nivell":"Inici","criteris":["6.1"]},
  {"titol":"Canvis d'unitats amb factor de conversió","nivell":"Guiada","criteris":["7.2"]},
  {"titol":"El mètode científic amb targetes","nivell":"Guiada","criteris":["2.2"]},
  {"titol":"Pràctica de densitat amb fitxa de passos","nivell":"Autonomia","criteris":["9.3","7.1"]}]},
 {"n":2,"titol":"Estats de la matèria","trim":0,"criteris":[["5.1","Explica amb el model de partícules (dibuix i frase) per què els sòlids tenen forma fixa i els gasos ocupen tot el recipient."],["6.1","Anomena correctament els canvis d'estat i els reconeix en situacions quotidianes."],["7.2","Llig una gràfica o taula temperatura-temps i n'identifica el punt de fusió i d'ebullició."],["2.1","Identifica en un enunciat quina magnitud canvia (temperatura, pressió, volum)."]],"activitats":[
  {"titol":"Classifica i dibuixa","nivell":"Inici","criteris":["5.1"]},
  {"titol":"L'esquema dels canvis d'estat","nivell":"Guiada","criteris":["6.1"]},
  {"titol":"Canvis d'estat a casa","nivell":"Guiada","criteris":["6.1"]},
  {"titol":"La bossa de patates a la muntanya","nivell":"Guiada","criteris":["2.1","5.1"]},
  {"titol":"La gràfica d'escalfament","nivell":"Autonomia","criteris":["7.2"]}]},
 {"n":3,"titol":"Substàncies pures i mescles","trim":2,"criteris":[["9.1","Tria la tècnica adequada per a separar una mescla senzilla i descriu els passos i el material."],["9.2","Classifica materials de l'entorn en substàncies pures, mescles homogènies i heterogènies."],["1.7","Prepara una dissolució seguint una fitxa i en calcula la concentració en g/L."],["2.6","Participa en l'equip de pràctiques assumint un rol."]],"activitats":[
  {"titol":"Pura o mescla?","nivell":"Inici","criteris":["9.2"]},
  {"titol":"Quina tècnica faries servir?","nivell":"Guiada","criteris":["9.1"]},
  {"titol":"El repte del castell: ferro, arena i sal","nivell":"Guiada","criteris":["9.1","2.6"]},
  {"titol":"Prepara una dissolució","nivell":"Guiada","criteris":["1.7"]},
  {"titol":"Mescles i residus","nivell":"Autonomia","criteris":["9.2"]}]},
 {"n":4,"titol":"Elements i compostos químics","trim":2,"criteris":[["7.5","Interpreta una fórmula química senzilla: diu quins elements té i quants àtoms de cada."],["4.4","Explica amb una frase la idea de Mendeléiev i localitza un element a la taula periòdica (grup i període)."],["4.2","Reconeix per què fan falta símbols i fórmules comuns per a tot el món."],["3.2","Exposa de manera ordenada les propietats d'un element triat (fitxa o exposició curta)."]],"activitats":[
  {"titol":"Memory de símbols","nivell":"Inici","criteris":["7.5"]},
  {"titol":"Lectura: el somni de Mendeléiev","nivell":"Inici","criteris":["4.4"]},
  {"titol":"Pinta la taula periòdica","nivell":"Guiada","criteris":["4.4"]},
  {"titol":"Compta els àtoms","nivell":"Guiada","criteris":["7.5","4.2"]},
  {"titol":"Fitxa d'un element","nivell":"Autonomia","criteris":["3.2","4.4"]}]},
 {"n":5,"titol":"La reacció química","trim":2,"criteris":[["5.2","Distingeix canvis físics i químics en situacions quotidianes i ho justifica (hi ha substàncies noves?)."],["1.5","Comprova en una pràctica que la massa es conserva i fa el càlcul de massa de reactius = massa de productes."],["1.6","Identifica reactius i productes i classifica substàncies de casa com a àcides, neutres o bàsiques amb el pH."],["4.1","Posa un exemple de reacció útil per a la societat i un de perjudicial (combustió i CO₂)."]],"activitats":[
  {"titol":"Físic o químic?","nivell":"Inici","criteris":["5.2"]},
  {"titol":"Reactius i productes","nivell":"Guiada","criteris":["1.6"]},
  {"titol":"Pràctica: el globus que s'unfla","nivell":"Guiada","criteris":["1.5"]},
  {"titol":"Calcula amb Lavoisier","nivell":"Guiada","criteris":["1.5","4.1"]},
  {"titol":"El pH de casa","nivell":"Autonomia","criteris":["1.6"]}]},
 {"n":6,"titol":"El moviment","trim":0,"criteris":[["1.8","Resol problemes quotidians de moviment amb v = d / t (un pas, dades en unitats coherents)."],["2.4","Escriu el procediment ordenat: dades, fórmula, substitució i resultat amb unitat."],["7.7","Construeix la gràfica posició-temps d'un MRU a partir d'una taula i en calcula la velocitat."],["2.5","Interpreta si el resultat és raonable (un cotxe no va a 5000 km/h)."]],"activitats":[
  {"titol":"Repòs o moviment?","nivell":"Inici","criteris":["1.8"]},
  {"titol":"Desplaçament en la recta","nivell":"Guiada","criteris":["1.8","2.4"]},
  {"titol":"Calcula la velocitat","nivell":"Guiada","criteris":["1.8","2.4"]},
  {"titol":"Una parada inesperada","nivell":"Guiada","criteris":["2.5","2.4"]},
  {"titol":"De la taula a la gràfica","nivell":"Autonomia","criteris":["7.7"]}]},
 {"n":7,"titol":"Les forces","trim":0,"criteris":[["5.3","Explica amb exemples que les forces deformen els cossos o en canvien el moviment."],["11.1","Reconeix les forces que actuen en situacions quotidianes (pes, fregament, normal, magnètica)."],["11.2","Calcula el pes i la resultant de dues forces de la mateixa direcció, i comprova al laboratori la relació força-allargament."],["1.8","Aplica p = F / S a situacions quotidianes (clau, raquetes de neu, ganivet)."]],"activitats":[
  {"titol":"Deforma o mou?","nivell":"Inici","criteris":["5.3"]},
  {"titol":"Dibuixa les forces","nivell":"Guiada","criteris":["11.1","11.2"]},
  {"titol":"El teu pes a la Terra i a la Lluna","nivell":"Guiada","criteris":["11.2"]},
  {"titol":"El clau i les raquetes de neu","nivell":"Guiada","criteris":["1.8"]},
  {"titol":"Pràctica amb el dinamòmetre","nivell":"Autonomia","criteris":["11.2"]}]},
 {"n":8,"titol":"L'energia","trim":1,"criteris":[["2.4","Aplica les fórmules de treball, energia i potència en un pas, amb el procediment ordenat."],["2.5","Compara resultats (qui té més energia, qui és més potent) i en treu una conclusió."],["7.1","Utilitza les unitats del SI (N, J, W) i expressa cada resultat amb la unitat correcta."],["3.2","Descriu de manera ordenada les transformacions d'energia en aparells i situacions quotidianes."],["4.1","Classifica fonts d'energia en renovables i no renovables i en diu un avantatge i un inconvenient."]],"activitats":[
  {"titol":"Cadenes d'energia","nivell":"Inici","criteris":["3.2"]},
  {"titol":"El martell de Thor","nivell":"Guiada","criteris":["2.4","7.1"]},
  {"titol":"Superman o Spiderman?","nivell":"Guiada","criteris":["2.4","2.5"]},
  {"titol":"La grua i l'alumnat de 2n","nivell":"Guiada","criteris":["2.5","7.1"]},
  {"titol":"Renovables a debat","nivell":"Autonomia","criteris":["4.1"]}]},
 {"n":9,"titol":"Calor i temperatura","trim":1,"criteris":[["7.2","Passa temperatures de °C a K i al revés."],["2.4","Calcula la calor necessària per a escalfar una massa d'aigua amb Q = m · ce · ΔT, amb el procediment ordenat."],["3.2","Explica amb exemples la diferència entre calor i temperatura i les formes de transmissió."],["4.1","Proposa mesures d'aïllament i estalvi a casa i a l'institut."]],"activitats":[
  {"titol":"Calor o temperatura?","nivell":"Inici","criteris":["3.2"]},
  {"titol":"De Celsius a Kelvin","nivell":"Guiada","criteris":["7.2"]},
  {"titol":"Com viatja la calor?","nivell":"Guiada","criteris":["3.2"]},
  {"titol":"Quanta calor cal?","nivell":"Guiada","criteris":["2.4"]},
  {"titol":"Casa sostenible","nivell":"Autonomia","criteris":["4.1","3.2"]}]}]},"3eso":{"curs":"3r ESO","catalogo":"FiQ_3ESO","temes":[
 {"n":1,"titol":"La ciència i la mesura","trim":0,"criteris":[["2.1","Identifica en un enunciat les magnituds, les dades i el que es demana."],["2.4","Fa canvis d'unitats amb factors de conversió escrivint el procediment."],["3.1","Distingeix ciència de pseudociència amb un argument basat en proves."],["6.1","Utilitza el vocabulari del mètode científic per a descriure un experiment."],["1.1","Segueix un disseny experimental guiat (pèndol, densitat) i recull dades en una taula."],["1.2","Segueix un disseny experimental guiat (pèndol, densitat) i recull dades en una taula."],["1.3","Segueix un disseny experimental guiat (pèndol, densitat) i recull dades en una taula."]],"activitats":[
  {"titol":"Ciència o pseudociència?","nivell":"Inici","criteris":["3.1"]},
  {"titol":"Les etapes del mètode científic","nivell":"Guiada","criteris":["6.1"]},
  {"titol":"Factors de conversió pas a pas","nivell":"Guiada","criteris":["2.4","2.1"]},
  {"titol":"Notació científica amb salts","nivell":"Guiada","criteris":["2.4"]},
  {"titol":"Pràctica de densitat i vídeo tutorial","nivell":"Autonomia","criteris":["1.1","1.2","1.3"]}]},
 {"n":2,"titol":"Els gasos","trim":0,"criteris":[["1.2","Comprova en una pràctica o simulació la relació entre pressió, volum i temperatura d'un gas."],["7.1","Interpreta gràfics i taules de les lleis dels gasos i de canvis d'estat."],["9.2","Explica amb el model de partícules què passa en un gas si en canviem la temperatura o la pressió."],["2.1","Identifica la llei que cal aplicar (quina magnitud es manté constant) i resol problemes d'un pas."]],"activitats":[
  {"titol":"Les partícules en moviment","nivell":"Inici","criteris":["9.2"]},
  {"titol":"La bossa de patates a la muntanya","nivell":"Guiada","criteris":["9.2"]},
  {"titol":"Quina llei és?","nivell":"Guiada","criteris":["2.1"]},
  {"titol":"Glicerina i brom","nivell":"Guiada","criteris":["7.1"]},
  {"titol":"Simulacions PhET","nivell":"Autonomia","criteris":["1.2","7.1"]}]},
 {"n":3,"titol":"Les mescles","trim":0,"criteris":[["7.2","Diferencia una mescla i una substància pura en dibuixos de partícules i en exemples quotidians."],["9.1","Identifica solut i dissolvent i calcula la concentració en g/L i en % en volum en un pas."],["2.4","Descriu ordenadament els passos per a separar una mescla de tres components."],["6.2","Extrau informació d'un text o una etiqueta (graduació d'una beguda) i l'aplica."]],"activitats":[
  {"titol":"Partícules de colors","nivell":"Inici","criteris":["7.2"]},
  {"titol":"Ferro, arena i sucre","nivell":"Guiada","criteris":["2.4"]},
  {"titol":"Què diu l'etiqueta?","nivell":"Guiada","criteris":["6.2","9.1"]},
  {"titol":"Concentració en g/L","nivell":"Guiada","criteris":["9.1"]},
  {"titol":"Llegim una corba de solubilitat","nivell":"Autonomia","criteris":["6.2"]}]},
 {"n":4,"titol":"Els canvis químics","trim":1,"criteris":[["10.1","Representa una reacció senzilla amb una equació química i identifica reactius i productes."],["10.2","Ajusta equacions senzilles (fins a 4 substàncies) i explica què volen dir els coeficients."],["10.3","Aplica la llei de Lavoisier per a calcular una massa en una reacció quotidiana."],["1.7","Comprova a la pràctica que la massa es conserva, també quan es desprén un gas (recipient tancat)."],["5.2","Utilitza el model de Dalton (els àtoms es reorganitzen, no desapareixen) per a explicar la conservació de la massa; calcula masses moleculars senzilles."]],"activitats":[
  {"titol":"Màgia o ciència?","nivell":"Inici","criteris":["10.1"]},
  {"titol":"Ajusta comptant boles","nivell":"Guiada","criteris":["10.2"]},
  {"titol":"Calcula la massa molecular","nivell":"Guiada","criteris":["10.3"]},
  {"titol":"Lavoisier a la balança","nivell":"Guiada","criteris":["1.7","10.3","5.2"]},
  {"titol":"Fred o calor?","nivell":"Autonomia","criteris":["10.1"]}]},
 {"n":5,"titol":"L'àtom i el model atòmic","trim":1,"criteris":[["10.4","Explica amb un dibuix com ha canviat el model de l'àtom (Dalton → Bohr) i per què."],["11.1","Descriu les partícules de l'àtom, la seua càrrega i on són."],["6.1","Utilitza correctament Z, A, ió i isòtop per a completar taules d'àtoms."],["6.2","Extrau informació d'una casella de la taula periòdica (símbol, Z, massa)."]],"activitats":[
  {"titol":"La línia del temps de l'àtom","nivell":"Inici","criteris":["10.4"]},
  {"titol":"Construeix un àtom","nivell":"Guiada","criteris":["11.1"]},
  {"titol":"Completa la taula d'àtoms","nivell":"Guiada","criteris":["6.1"]},
  {"titol":"Configuració amb el diagrama","nivell":"Guiada","criteris":["6.2"]},
  {"titol":"Maqueta i exposició","nivell":"Autonomia","criteris":["10.4"]}]},
 {"n":6,"titol":"L'electricitat","trim":2,"criteris":[["11.1","Explica l'atracció i la repulsió de càrregues i l'electrització per fregament amb dibuixos."],["8.6","Aplica la llei d'Ohm en un pas i explica què és la intensitat, el voltatge i la resistència."],["1.5","Munta un circuit simple i mesura amb el multímetre (amb circuits pre-muntats si cal)."],["11.4","Descriu el comportament dels imants i com funciona una brúixola."],["8.7","Calcula el consum d'un electrodomèstic a partir de la seua potència i del temps d'ús."]],"activitats":[
  {"titol":"El boli que atrau papers","nivell":"Inici","criteris":["11.1"]},
  {"titol":"Símbols i circuits","nivell":"Guiada","criteris":["1.5"]},
  {"titol":"El triangle de la llei d'Ohm","nivell":"Guiada","criteris":["8.6"]},
  {"titol":"Quant gasta el microones?","nivell":"Guiada","criteris":["8.7"]},
  {"titol":"Prototip amb cablejat","nivell":"Autonomia","criteris":["1.5"]}]},
 {"n":7,"titol":"L'energia i la seua transformació","trim":2,"criteris":[["8.1","Identifica les formes d'energia en fenòmens quotidians i en experiències de laboratori."],["8.3","Descriu una cadena de transformacions i explica que l'energia es conserva però es degrada."],["8.5","Raona un avantatge i un inconvenient de diferents fonts i proposa mesures d'estalvi."],["8.8","Calcula de manera senzilla l'energia d'aliments i activitats amb taules donades."],["8.9","Valora l'impacte ambiental de les fonts d'energia (petjada de carboni)."]],"activitats":[
  {"titol":"Quina energia hi ha?","nivell":"Inici","criteris":["8.1"]},
  {"titol":"La cadena de la central","nivell":"Guiada","criteris":["8.3"]},
  {"titol":"Bombeta o LED?","nivell":"Guiada","criteris":["8.3"]},
  {"titol":"Energia al plat","nivell":"Guiada","criteris":["8.8"]},
  {"titol":"La meua petjada de carboni","nivell":"Autonomia","criteris":["8.9","8.5"]}]},
 {"n":8,"titol":"La llum","trim":2,"criteris":[["8.1","Reconeix la llum com a forma d'energia i n'identifica fonts i propietats en experiències senzilles."],["6.1","Utilitza correctament transparent, translúcid, opac, reflexió i refracció."],["6.2","Interpreta un esquema de raigs de llum (reflexió en un espill)."],["6.4","Explica oralment un fenomen òptic preparat amb el grup."],["2.5","Comprova experimentalment una predicció (on es forma l'ombra, on es reflecteix el raig)."]],"activitats":[
  {"titol":"Deixa passar la llum?","nivell":"Inici","criteris":["8.1","6.1","2.5"]},
  {"titol":"L'espill i el raig","nivell":"Guiada","criteris":["6.2","2.5"]},
  {"titol":"La palleta trencada","nivell":"Guiada","criteris":["6.1"]},
  {"titol":"Quant tarda la llum del Sol?","nivell":"Guiada","criteris":["8.1"]},
  {"titol":"Càmera fosca o periscopi","nivell":"Autonomia","criteris":["6.4"]}]}]}};
