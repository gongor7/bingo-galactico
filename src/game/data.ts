// Content database: cartón pools + question bank.
// Every pool entry is covered by exactly one question, so any square a player
// gets can be won in a round. Images live in /public/sw/<key>.webp
// (downloaded by scripts/fetch-images.mjs).

import type { Category, PoolEntry, Question } from "./types";

export const POOLS: Record<Category, PoolEntry[]> = {
  jedi: [
    { key: "luke", display: "Luke Skywalker", aliases: ["luke"] },
    { key: "obiwan", display: "Obi-Wan Kenobi", aliases: ["obiwan", "obi wan", "ben kenobi", "ben"] },
    { key: "yoda", display: "Yoda", aliases: ["maestro yoda"] },
    { key: "mace", display: "Mace Windu", aliases: ["mace"] },
    { key: "quigon", display: "Qui-Gon Jinn", aliases: ["quigon", "qui gon"] },
    { key: "ahsoka", display: "Ahsoka Tano", aliases: ["ahsoka", "snips"] },
    { key: "rey", display: "Rey", aliases: ["rey skywalker"] },
    { key: "kiadi", display: "Ki-Adi-Mundi", aliases: ["ki adi mundi", "ki adi"] },
    { key: "plo", display: "Plo Koon", aliases: ["plo"] },
    { key: "anakin", display: "Anakin Skywalker", aliases: ["anakin"] },
  ],
  sith: [
    { key: "vader", display: "Darth Vader", aliases: ["vader"] },
    { key: "palpatine", display: "Palpatine", aliases: ["darth sidious", "sidious", "sheev", "sheev palpatine", "emperador"] },
    { key: "maul", display: "Darth Maul", aliases: ["maul"] },
    { key: "dooku", display: "Conde Dooku", aliases: ["dooku", "conde dooku", "darth tyranus", "tyranus"] },
    { key: "kylo", display: "Kylo Ren", aliases: ["kylo", "ben solo"] },
    { key: "ventress", display: "Asajj Ventress", aliases: ["ventress"] },
    { key: "grievous", display: "General Grievous", aliases: ["grievous"] },
    { key: "snoke", display: "Snoke", aliases: ["lider supremo snoke"] },
    { key: "graninquisidor", display: "Gran Inquisidor", aliases: ["inquisidor"] },
    { key: "savage", display: "Savage Opress", aliases: ["savage"] },
  ],
  clones: [
    { key: "rex", display: "Capitán Rex", aliases: ["rex", "capitan rex", "ct 7567"] },
    { key: "cody", display: "Comandante Cody", aliases: ["cody", "cc 2224"] },
    { key: "fives", display: "Fives", aliases: ["ct 5555"] },
    { key: "echo", display: "Echo", aliases: ["ct 1409"] },
    { key: "hunter", display: "Hunter", aliases: [] },
    { key: "wolffe", display: "Wolffe", aliases: ["cc 3636"] },
    { key: "jesse", display: "Jesse", aliases: ["ct 5597"] },
    { key: "crosshair", display: "Crosshair", aliases: ["ct 9904"] },
    { key: "boba", display: "Boba Fett", aliases: ["boba"] },
    { key: "jango", display: "Jango Fett", aliases: ["jango"] },
  ],
  droides: [
    { key: "r2d2", display: "R2-D2", aliases: ["r2d2", "arturito", "r2"] },
    { key: "c3po", display: "C-3PO", aliases: ["c3po", "3po"] },
    { key: "bb8", display: "BB-8", aliases: ["bb8"] },
    { key: "k2so", display: "K-2SO", aliases: ["k2so", "kaytoo"] },
    { key: "ig11", display: "IG-11", aliases: ["ig11"] },
    { key: "droideka", display: "Droideka", aliases: ["droidekas"] },
    { key: "chopper", display: "Chopper", aliases: ["spectre 3"] },
    { key: "l3", display: "L3-37", aliases: ["l3", "l3 37", "el tres"] },
    { key: "d0", display: "D-O", aliases: ["do", "dee oh"] },
    { key: "r5d4", display: "R5-D4", aliases: ["r5d4"] },
  ],
  planetas: [
    { key: "tatooine", display: "Tatooine", aliases: [] },
    { key: "hoth", display: "Hoth", aliases: [] },
    { key: "naboo", display: "Naboo", aliases: [] },
    { key: "coruscant", display: "Coruscant", aliases: [] },
    { key: "mustafar", display: "Mustafar", aliases: [] },
    { key: "kamino", display: "Kamino", aliases: [] },
    { key: "endor", display: "Endor", aliases: [] },
    { key: "dagobah", display: "Dagobah", aliases: [] },
    { key: "geonosis", display: "Geonosis", aliases: [] },
    { key: "kashyyyk", display: "Kashyyyk", aliases: [] },
    { key: "mandalore", display: "Mandalore", aliases: [] },
    { key: "exegol", display: "Exegol", aliases: [] },
  ],
};

export function poolEntry(key: string): PoolEntry | undefined {
  for (const list of Object.values(POOLS)) {
    const found = list.find((e) => e.key === key);
    if (found) return found;
  }
  return undefined;
}

export function imageFor(key: string): string {
  return `/sw/${key}.webp`;
}

export const QUESTIONS: Question[] = [
  // ── JEDI ──────────────────────────────────────────────────────────────
  { id: "jedi-luke", category: "jedi", key: "luke", prompt: "Criado por sus tíos en Tatooine, destruyó la Estrella de la Muerte con un solo disparo guiado por la Fuerza." },
  { id: "jedi-obiwan", category: "jedi", key: "obiwan", prompt: "«Hello there». Maestro Jedi que vigiló a Luke desde las sombras durante años." },
  { id: "jedi-yoda", category: "jedi", key: "yoda", prompt: "Pequeño, verde y de 900 años. «Hazlo o no lo hagas, pero no lo intentes»." },
  { id: "jedi-mace", category: "jedi", key: "mace", prompt: "Maestro del Consejo con un sable de hoja púrpura. Murió a manos de Palpatine (y de Anakin)." },
  { id: "jedi-quigon", category: "jedi", key: "quigon", prompt: "Maestro de Obi-Wan que creía firmemente en el Elegido. Cayó ante el sable doble de Maul." },
  { id: "jedi-ahsoka", category: "jedi", key: "ahsoka", prompt: "Padawan Togruta de Anakin, «Snips», que terminó abandonando la Orden con dos sables blancos." },
  { id: "jedi-rey", category: "jedi", key: "rey", prompt: "Carroñera de Jakku que acabó enfrentándose al Emperador en Exegol." },
  { id: "jedi-kiadi", category: "jedi", key: "kiadi", prompt: "Maestro del Consejo con cabeza cónica y un cerebro binario." },
  { id: "jedi-plo", category: "jedi", key: "plo", prompt: "Maestro Kel Dor con máscara y gafas protectoras. Quien encontró a Ahsoka y la llevó al Templo." },
  { id: "jedi-anakin", category: "jedi", key: "anakin", prompt: "El Elegido: esclavo de Tatooine, héroe de las Guerras Clon y con serios problemas de ira. AÚN no es Vader." },
  // ── SITH ──────────────────────────────────────────────────────────────
  { id: "sith-vader", category: "sith", key: "vader", prompt: "«Yo soy tu padre». Respiración pesada, armadura negra y poco sentido del humor." },
  { id: "sith-palpatine", category: "sith", key: "palpatine", prompt: "Senador de Naboo, luego Canciller, luego Emperador. «¡Un poder ilimitado!»." },
  { id: "sith-maul", category: "sith", key: "maul", prompt: "Zabrak de Dathomir con sable de doble hoja que sobrevivió a quedar partido en dos." },
  { id: "sith-dooku", category: "sith", key: "dooku", prompt: "Conde de Serenno y ex Maestro Jedi, líder político de los Separatistas. Su sable tenía empuñadura curva." },
  { id: "sith-kylo", category: "sith", key: "kylo", prompt: "Hijo de Han y Leia, casco agrietado y un sable rojo tan inestable como él." },
  { id: "sith-ventress", category: "sith", key: "ventress", prompt: "Asesina de Dathomir, aprendiz de Dooku, calva, pálida y con dos sables de hoja curva." },
  { id: "sith-grievous", category: "sith", key: "grievous", prompt: "General cibernético con tos eterna y una colección de sables robados a los Jedi que mató." },
  { id: "sith-snoke", category: "sith", key: "snoke", prompt: "Líder Supremo del Primer Orden, con el rostro marcado por cicatrices... y un títere de Palpatine." },
  { id: "sith-graninquisidor", category: "sith", key: "graninquisidor", prompt: "Pau'an pálido con un doble sable giratorio, cazador de Jedi supervivientes de la Orden 66." },
  { id: "sith-savage", category: "sith", key: "savage", prompt: "Hermano de Maul, transformado por las Hermanas de la Noche en una bestia con hacha luminosa." },
  // ── CLONES ────────────────────────────────────────────────────────────
  { id: "clones-rex", category: "clones", key: "rex", prompt: "Capitán de la 501ª con jaig-eyes azules en el casco. Leal a Anakin y a Ahsoka hasta el final." },
  { id: "clones-cody", category: "clones", key: "cody", prompt: "Comandante del 212º que luchó junto a Obi-Wan en Utapau... hasta que llegó la Orden 66." },
  { id: "clones-fives", category: "clones", key: "fives", prompt: "ARC trooper que descubrió la conspiración de los inhibidores clon. «Eliminen a Fives»." },
  { id: "clones-echo", category: "clones", key: "echo", prompt: "Se le creyó muerto en la Ciudadela y regresó medio cyborg para unirse al escuadrón clon más defectuoso de la galaxia." },
  { id: "clones-hunter", category: "clones", key: "hunter", prompt: "Líder del Bad Batch: sentidos hiperdesarrollados y media cara tatuada." },
  { id: "clones-wolffe", category: "clones", key: "wolffe", prompt: "Comandante del Lobo Gris (104º), parche en el ojo derecho y casco con lobo gris." },
  { id: "clones-jesse", category: "clones", key: "jesse", prompt: "ARC trooper de la 501ª con el emblema de la República tatuado en toda la cara." },
  { id: "clones-crosshair", category: "clones", key: "crosshair", prompt: "Francotirador del Bad Batch, mirada fría y puntería perfecta... y cero paciencia para los «defectivos»." },
  { id: "clones-boba", category: "clones", key: "boba", prompt: "Clon puro de Jango, criado como hijo. El cazarrecompensas más temido de la galaxia." },
  { id: "clones-jango", category: "clones", key: "jango", prompt: "El original: cazarrecompensas con armadura azul y plateada que sirvió de plantilla para todo el ejército clon." },
  // ── DROIDES ───────────────────────────────────────────────────────────
  { id: "droides-r2d2", category: "droides", key: "r2d2", prompt: "Astromecánico blanco y azul que siempre salva el día con un pitido oportuno." },
  { id: "droides-c3po", category: "droides", key: "c3po", prompt: "Droide de protocolo dorado, especialista mundial en preocuparse. «Estamos condenados»." },
  { id: "droides-bb8", category: "droides", key: "bb8", prompt: "Bola naranja con cabeza flotante y magnética, copiloto inseparable de Poe Dameron." },
  { id: "droides-k2so", category: "droides", key: "k2so", prompt: "Droide imperial reprogramado con sarcasmo de nivel maestro. Amigo de Cassian en Rogue One." },
  { id: "droides-ig11", category: "droides", key: "ig11", prompt: "Droide asesino reprogramado como niñera en Nevarro. «No tengo nombre»." },
  { id: "droides-droideka", category: "droides", key: "droideka", prompt: "Droide separatista con escudo deflector que se desplaza convertido en bola." },
  { id: "droides-chopper", category: "droides", key: "chopper", prompt: "Astromecánico travieso (y algo psicópata) del Ghost, del equipo de Hera Syndulla." },
  { id: "droides-l3", category: "droides", key: "l3", prompt: "Droide de navegación de Lando Calrissian y feroz activista por los derechos de los droides." },
  { id: "droides-d0", category: "droides", key: "d0", prompt: "Pequeño droide cónico con una sola rueda, amigo de BB-8. Timidez extrema." },
  { id: "droides-r5d4", category: "droides", key: "r5d4", prompt: "El astromecánico rojo que Luke estuvo a punto de comprar... hasta que su motivador explotó." },
  // ── PLANETAS ──────────────────────────────────────────────────────────
  { id: "planetas-tatooine", category: "planetas", key: "tatooine", prompt: "Desierto con dos soles: cuna de los Skywalker y guarida de Jabba el Hutt." },
  { id: "planetas-hoth", category: "planetas", key: "hoth", prompt: "Mundo helado donde la Alianza Rebelde construyó la Base Eco... y los wampas cazan tauntauns." },
  { id: "planetas-naboo", category: "planetas", key: "naboo", prompt: "Lagos, cascadas y una ciudad gungan submarina. Planeta natal de Padmé (y de Palpatine)." },
  { id: "planetas-coruscant", category: "planetas", key: "coruscant", prompt: "Una ciudad entera cubriendo el planeta: sede del Senado Galáctico y del Templo Jedi." },
  { id: "planetas-mustafar", category: "planetas", key: "mustafar", prompt: "Ríos de lava donde Anakin lo perdió todo. Ahora presume castillo de Vader." },
  { id: "planetas-kamino", category: "planetas", key: "kamino", prompt: "Planeta océano bajo lluvia eterna donde se fabricó en secreto el ejército clon." },
  { id: "planetas-endor", category: "planetas", key: "endor", prompt: "Luna boscosa hogar de los ewoks, testigo de la caída de la segunda Estrella de la Muerte." },
  { id: "planetas-dagobah", category: "planetas", key: "dagobah", prompt: "Pantano putrefacto donde cierto maestro verde pasó su exilio entrenando a Luke." },
  { id: "planetas-geonosis", category: "planetas", key: "geonosis", prompt: "Colmenas de arena y fábricas de droides: allí comenzó la Guerra de los Clones." },
  { id: "planetas-kashyyyk", category: "planetas", key: "kashyyyk", prompt: "Mundo natal de los wookiees: playas tropicales y bosques de árboles kilométricos." },
  { id: "planetas-mandalore", category: "planetas", key: "mandalore", prompt: "Mundo guerrero de beskar y cascos legendarios, cuna de la cultura mandaloriana." },
  { id: "planetas-exegol", category: "planetas", key: "exegol", prompt: "Planeta oculto de tormentas y Sith donde la Flota Final esperó en la sombra." },
];

export function questionsByCategory(cat: Category): Question[] {
  return QUESTIONS.filter((q) => q.category === cat);
}
