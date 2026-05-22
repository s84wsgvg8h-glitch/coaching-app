export type KnowledgeChunk = {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
};

export const APP_KNOWLEDGE: KnowledgeChunk[] = [
  {
    id: "app-overzicht",
    title: "Wat is deze app?",
    category: "App",
    content:
      "Coaching-app voor powerlifting coaches en atleten. Coaches beheren programma's, chatten met atleten, bekijken data (BW, volume, intensiteit, maxes), blessures en wedstrijden. Atleten volgen hun programma en chatten met de coach.",
    keywords: ["app", "coaching", "powerlifting", "overzicht", "wat", "doet"],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    category: "Navigatie",
    content:
      "Het dashboard toont een welkomstbericht, totale inkomsten (som van atleetprijzen per maand), aantal betalende atleten, en een zoekbalk met AI-assistent. Alleen coaches zien inkomsten.",
    keywords: ["dashboard", "inkomsten", "omzet", "totaal", "home", "start"],
  },
  {
    id: "atleten-beheren",
    title: "Atleten beheren",
    category: "Navigatie",
    content:
      "Pagina /athletes: accepteer pending aanmeldingen en verwijder accounts. Betaling en profielgegevens staan niet hier maar bij Atleten profielen (/athlete-profiles).",
    keywords: ["atleten", "beheren", "accepteer", "pending", "aanmelding"],
  },
  {
    id: "atleten-profielen",
    title: "Atleten profielen",
    category: "Navigatie",
    content:
      "Pagina /athlete-profiles: kies een atleet om geboortedatum, lidnummer, opkomende wedstrijden, betaling (prijs + betaaldag per maand) en blessures te beheren. Wijzigingen worden automatisch opgeslagen.",
    keywords: [
      "profiel",
      "profielen",
      "atleet",
      "geboortedatum",
      "lidnummer",
      "betaling",
      "betaaldag",
      "prijs",
    ],
  },
  {
    id: "betaling-atleet",
    title: "Betaling per atleet",
    category: "Data",
    content:
      "Per atleet kan een maandprijs (EUR) en betaaldag (dag 1-31 van de maand) worden ingesteld. Totale inkomsten op het dashboard is de som van alle atleetprijzen. Instellen via Atleten profielen → atleet openen → sectie Betaling.",
    keywords: ["betaling", "prijs", "betaaldag", "inkomsten", "euro", "maand"],
  },
  {
    id: "programmas",
    title: "Programma's",
    category: "Navigatie",
    content:
      "Pagina /programs: trainingsschema's met blocks, weken en dagen. Atleten loggen sets, reps, gewicht en check-ins (herstel, fatigue). Coaches maken en bekijken programma's.",
    keywords: ["programma", "training", "schema", "block", "week", "dag"],
  },
  {
    id: "chat",
    title: "Chat",
    category: "Navigatie",
    content:
      "Pagina /chat: WhatsApp-achtige chat met atleten (direct) of groepen. Coaches kunnen slash commands gebruiken in direct chat met een atleet om panelen te openen.",
    keywords: ["chat", "bericht", "groep", "whatsapp"],
  },
  {
    id: "cmd-tools",
    title: "/tools command",
    category: "Commands",
    content:
      "Typ /tools in chat om pagina's, chats en programma's te zoeken en te openen.",
    keywords: ["/tools", "tools", "zoeken", "command"],
  },
  {
    id: "cmd-program",
    title: "/program command",
    category: "Commands",
    content:
      "Typ /program in een direct coach-atleet chat om het programma van die atleet in een zijpaneel te bekijken (~45% scherm). Alleen voor coaches in direct chat.",
    keywords: ["/program", "programma", "paneel"],
  },
  {
    id: "cmd-bw",
    title: "/bw command",
    category: "Commands",
    content:
      "Typ /bw voor een lichaamsgewicht grafiek per dag met begin- en eindweek filters. Grafiek kan naar chat worden gestuurd. Coach-only, direct chat.",
    keywords: ["/bw", "bw", "gewicht", "lichaamsgewicht", "bodyweight"],
  },
  {
    id: "cmd-externals",
    title: "/externals command",
    category: "Commands",
    content:
      "Typ /externals voor check-in grafieken (Herstel en Fatigue) uit het atleetprogramma. Begin- en eindweek filters. Coach-only, direct chat.",
    keywords: ["/externals", "externals", "herstel", "fatigue", "check-in"],
  },
  {
    id: "cmd-volume",
    title: "/volume command",
    category: "Commands",
    content:
      "Typ /volume voor SBD (squat, bench, deadlift) sets en reps plus tonnage grafieken per lift. Coach-only, direct chat.",
    keywords: ["/volume", "volume", "sets", "reps", "tonnage", "sbd"],
  },
  {
    id: "cmd-intensity",
    title: "/intensity command",
    category: "Commands",
    content:
      "Typ /intensity voor gemiddelde intensiteit, piek intensiteit, piek load en grafieken per lift. Coach-only, direct chat.",
    keywords: ["/intensity", "intensiteit", "piek", "load", "procent"],
  },
  {
    id: "cmd-max",
    title: "/max command",
    category: "Commands",
    content:
      "Typ /max (alias /pr) voor SBD rep maxes: hoogste gewicht per rep range (1RM t/m 20RM) alleen voor pure squat, bench en deadlift. Coach-only, direct chat.",
    keywords: ["/max", "/pr", "max", "pr", "1rm", "rep max"],
  },
  {
    id: "cmd-data",
    title: "/data command",
    category: "Commands",
    content:
      "Typ /data (alias /raw data) voor ruwe atleetdata in een zijpaneel, inclusief progression view. Coach-only, direct chat.",
    keywords: ["/data", "data", "raw", "ruwe data", "progression"],
  },
  {
    id: "cmd-injuries",
    title: "/injuries command",
    category: "Commands",
    content:
      "Typ /injuries voor blessurebeheer met spierkaart. Klik spiergebied, vul naam, datum en urgentie (laag/medium/hoog) in. Coach-only, direct chat.",
    keywords: ["/injuries", "injuries", "blessure", "blessures", "spier"],
  },
  {
    id: "blessures-profiel",
    title: "Blessures op profiel",
    category: "Features",
    content:
      "Op atleetprofielen staat een spierkaart (SVG) om blessures te registreren per spiergebied met naam, datum en urgentie. Ook bereikbaar via /injuries in chat.",
    keywords: ["blessure", "injury", "spierkaart", "urgentie"],
  },
  {
    id: "wedstrijdkalender",
    title: "Wedstrijdkalender",
    category: "Navigatie",
    content:
      "Pagina /wedstrijd-kalender: bekijk en beheer wedstrijden met start- en einddatum. Atleten kunnen opkomende wedstrijden selecteren op hun profiel.",
    keywords: ["wedstrijd", "kalender", "competitie", "nk", "meet"],
  },
  {
    id: "rpe",
    title: "RPE tabel pagina",
    category: "Coaching",
    content:
      "Pagina /rpe-tabel: Modernized Load/RIR chart. Kies links RPE/RIR, bovenaan het aantal reps — de cel toont het load-percentage (% van estimated max). Formule gebaseerd op average rep capacity (reps + RIR).",
    keywords: ["rpe", "rir", "load", "intensiteit", "tabel", "rpe-tabel", "percentage"],
  },
  {
    id: "rpe-schaal",
    title: "RPE naar RIR schaal",
    category: "Coaching",
    content:
      "RPE (Rate of Perceived Exertion) = hoe zwaar een set voelt. RIR (Reps In Reserve) = hoeveel reps je nog had kunnen doen. RPE 10 = failure (0 RIR). RPE 9 = 1 RIR. RPE 8 = 2 RIR. RPE 7 = 3 RIR. Lagere RPE = meer reps over.",
    keywords: ["rpe", "rir", "schaal", "uitleg", "wat", "betekent", "reps in reserve"],
  },
  {
    id: "rpe-hoog",
    title: "RPE hoog intensief (8.5–10)",
    category: "Coaching",
    content:
      "Hoge intensiteit: RPE 10 = geen reps of load meer mogelijk (absolute failure). RPE 9.5 = geen reps meer, maar nog iets meer load mogelijk. RPE 9 = nog 1 herhaling in reserve. RPE 8.5 = nog 1 herhaling, mogelijk 2. Gebruik voor zware strength work en peaking.",
    keywords: ["rpe 10", "rpe 9", "rpe 8", "hoog", "zwaar", "failure", "maximaal", "9.5", "8.5"],
  },
  {
    id: "rpe-matig",
    title: "RPE matig-hoog (7–8)",
    category: "Coaching",
    content:
      "Matig tot hoog: RPE 8 = nog 2 herhalingen mogelijk. RPE 7.5 = nog 2 herhalingen, mogelijk 3. RPE 7 = nog 3 herhalingen mogelijk. Typisch voor hoofdwerk in een block — zwaar genoeg voor progressie, niet elke set tot failure.",
    keywords: ["rpe 8", "rpe 7", "matig", "hoofdwerk", "7.5", "twee reps", "drie reps"],
  },
  {
    id: "rpe-licht",
    title: "RPE licht (1–6)",
    category: "Coaching",
    content:
      "Licht tot matig: RPE 5–6 = nog 4–6 herhalingen mogelijk (techniek, volume, accessory). RPE 1–4 = zeer licht tot weinig inspanning (warm-up, rehab, mobiliteit). Niet gebruiken voor zware SBD hoofdlifts behalve opwarmen.",
    keywords: ["rpe 5", "rpe 6", "licht", "warmup", "opwarmen", "accessory", "rpe 4", "laag"],
  },
  {
    id: "rpe-gebruik",
    title: "RPE in de praktijk",
    category: "Coaching",
    content:
      "Atleten loggen RPE bij sets in het programma. Coach kijkt via /intensity en data of loads kloppen. Dagelijkse variatie (slaap, stress) maakt RPE betrouwbaarder dan vast percentage. Bij twijfel: iets lager starten en opbouwen binnen de rep range.",
    keywords: ["rpe", "loggen", "programma", "intensiteit", "dag", "variabel", "coach"],
  },
  {
    id: "statistics",
    title: "Statistics",
    category: "Navigatie",
    content:
      "Pagina /statistics: statistieken en grafieken over training en voortgang.",
    keywords: ["statistics", "statistieken", "voortgang", "grafiek"],
  },
  {
    id: "raw-data-page",
    title: "Data pagina",
    category: "Navigatie",
    content:
      "Pagina /raw-data (menu: Data): volledige ruwe data en progression view van atleten. In chat ook via /data command.",
    keywords: ["raw", "data", "ruwe", "progression"],
  },
  {
    id: "coaching-workflow",
    title: "Coach workflow",
    category: "Coaching",
    content:
      "Typische coach flow: accepteer atleet → vul profiel en betaling in → wijs programma toe → monitor via chat commands (/bw, /volume, /externals) → bij blessure /injuries gebruiken.",
    keywords: ["workflow", "coach", "hoe", "begin", "stappen"],
  },
  {
    id: "bench-arch-overzicht",
    title: "Bench arch: hardware vs software",
    category: "Coaching",
    content:
      "Een goede bench arch bestaat uit 2 delen. Hardware = fysieke mogelijkheden: mobiliteit, spierlengte, extensie, stabiliteit. Software = hoe goed je die mogelijkheden gebruikt tijdens het benchen. Beide zijn nodig; mobiliteit alleen is niet genoeg zonder techniek.",
    keywords: ["bench", "arch", "bankdrukken", "setup", "hardware", "software", "techniek"],
  },
  {
    id: "bench-arch-hardware",
    title: "Bench arch hardware (lichaam)",
    category: "Coaching",
    content:
      "Belangrijke fysieke onderdelen voor een grote arch: anterior pelvic tilt, lumbar extensie, rib cage extensie/flare, shoulder depression, lichte shoulder retraction, nek contact met de bank, lichte interne rotatie van de polsen. Doel bij bekken/lumbale wervelkolom: niet extreem anterior of posterior, maar controle in beide richtingen.",
    keywords: [
      "bench arch",
      "mobiliteit",
      "bekken",
      "lumbar",
      "rib cage",
      "schouder",
      "nek",
      "pols",
      "extensie",
    ],
  },
  {
    id: "bench-arch-oefeningen-bekken",
    title: "Bench arch oefeningen bekken & onderrug",
    category: "Coaching",
    content:
      "90/90 hip lift: brengt bekken richting neutraal en geeft controle over bekken en onderrug. Voor meer lumbar extensie: foam roller extensies, seal stretch, thoracic/rib cage mobiliteit — maken stijve tissues losser en meer extensie mogelijk.",
    keywords: [
      "90/90",
      "hip lift",
      "foam roller",
      "seal stretch",
      "thoracic",
      "mobiliteit",
      "onderrug",
      "bekken",
    ],
  },
  {
    id: "bench-arch-schouders-nek",
    title: "Bench arch schouderbladen & nek",
    category: "Coaching",
    content:
      "Veel atleten hebben te veel retractie of te veel protractie — eerst terug naar neutraal. Oefeningen: thread the needle, alternating dumbbell bench press, protraction/reaching drills. Niet maximaal retracten: shoulder depression is belangrijker dan maximale retractie. Nek: stevig contact met de bank voelen; te veel extensie of vlakke nek / strakke traps/scalenes kunnen problemen geven.",
    keywords: [
      "retractie",
      "protractie",
      "schouderbladen",
      "depression",
      "nek",
      "traps",
      "thread the needle",
      "setup schouder",
    ],
  },
  {
    id: "bench-arch-software-volgorde",
    title: "Bench arch techniek volgorde",
    category: "Coaching",
    content:
      "Software = techniek. Volgorde van belangrijkheid: 1) shoulder position, 2) rib cage position, 3) neck pressure, 4) hand pressure, 5) legs. Shoulders zo laag mogelijk, traps ontspannen, minimale nodige retractie. Rib cage verbindt benen en schouders — goede leg drive + ontspannen schouders tilt rib cage in extensie.",
    keywords: [
      "techniek",
      "volgorde",
      "shoulder position",
      "rib cage",
      "neck pressure",
      "hand pressure",
      "legs",
    ],
  },
  {
    id: "bench-arch-techniek-details",
    title: "Bench arch techniek details",
    category: "Coaching",
    content:
      "Neck pressure: nek stevig tegen bank — arch voelt stabiel en grippy; zonder nekcontact verlies je stabiliteit. Hand pressure: handen zijn ankerpunt tegen stang; zonder druk verankeren schouders niet. Leg drive: twee richtingen — verticaal (heupen omhoog, vermijden) vs horizontaal (kracht in arch/extensie). Duw jezelf richting het rack, niet omhoog.",
    keywords: [
      "leg drive",
      "hand pressure",
      "neck pressure",
      "rack",
      "horizontaal",
      "verticaal",
      "heupen",
      "anker",
    ],
  },
  {
    id: "bench-arch-fouten",
    title: "Bench arch veelgemaakte fouten",
    category: "Coaching",
    content:
      "Belangrijkste punten: shoulders down not back; gebruik stang als ankerpunt; voel nek tegen bank; push richting rack; focus niet alleen mobiliteit maar ook techniek; te veel retractie is vaak een fout (beperkt ruimte onderin, verslechtert schouderpositie); horizontale leg drive werkt beter voor grotere arch dan verticale leg drive.",
    keywords: [
      "fouten",
      "tips",
      "retractie",
      "te veel",
      "shoulders down",
      "bench tips",
      "bankdrukken setup",
    ],
  },
  {
    id: "squat-varianten-overzicht",
    title: "Squat varianten: traditioneel vs powerlifting vs box",
    category: "Coaching",
    content:
      "Onderzoek (12 powerlifters, 30/50/70% 1RM): traditionele squat, powerlifting squat en box squat hebben duidelijk verschillende biomechanica. Traditioneel = smalle stance (~48 cm). Powerlifting squat en box squat = vergelijkbare brede stance (~90 cm). Kies variant op basis van gewenst kinematic/kinetic profiel en trainingsdoel.",
    keywords: [
      "squat",
      "powerlifting squat",
      "box squat",
      "traditioneel",
      "varianten",
      "stance",
      "breed",
      "smal",
    ],
  },
  {
    id: "squat-com-en-knie",
    title: "Squat: kniepositie en center of mass",
    category: "Coaching",
    content:
      "Traditionele squat (excentrisch): knie reist voorbij tenen → anterior verplaatsing van system center of mass (COM). Powerlifting squat en box squat: verticalere scheen, posterior COM-verplaatsing. Dit verschil beïnvloedt piekmomenten in heup, knie, enkel en wervelkolom.",
    keywords: [
      "knie",
      "tenen",
      "com",
      "center of mass",
      "scheen",
      "excentrisch",
      "squat techniek",
      "voorwaarts",
    ],
  },
  {
    id: "squat-gewrichtsmomenten",
    title: "Squat piekmomenten per variant",
    category: "Coaching",
    content:
      "Wervelkolom & enkel: grootste piekmoment bij traditionele squat, daarna powerlifting squat, dan box squat (laagste). Heup: grootste momenten in alle 3 vlakken bij powerlifting squat. Box squat = minste belasting op rug/enkel; powerlifting squat = meeste heupbelasting; traditioneel = meeste rug/enkel stress.",
    keywords: [
      "moment",
      "heup",
      "enkel",
      "rug",
      "spine",
      "belasting",
      "box squat",
      "powerlifting squat",
      "blessure",
    ],
  },
  {
    id: "squat-coach-keuze",
    title: "Welke squat kiezen?",
    category: "Coaching",
    content:
      "Coach/atleet: selecteer squat-variant naar trainingsdoel. Box squat: minder rug/enkel moment — nuttig bij rugklachten of deload. Powerlifting squat: brede stance, heup-dominant, competitie-specifiek. Traditionele squat: smalle stance, meer knie/COM voorwaarts, hogere rug/enkel belasting — typisch hypertrofie/general fitness context.",
    keywords: [
      "welke squat",
      "kiezen",
      "doel",
      "rug",
      "heup",
      "hypertrofie",
      "powerlifting",
      "programmeren",
    ],
  },
  {
    id: "rep-continuum-model",
    title: "Repetition continuum (klassiek model)",
    category: "Coaching",
    content:
      "Klassiek model: 1-5 reps = maximale kracht, 8-12 = hypertrofie, 15+ = muscular endurance. Huidige literatuur: dit model is te simplistisch, vooral voor hypertrofie. Effort en proximity to failure zijn belangrijker dan exact rep aantal.",
    keywords: [
      "repetition continuum",
      "rep range",
      "reps",
      "kracht",
      "hypertrofie",
      "endurance",
      "8-12",
      "1-5",
    ],
  },
  {
    id: "rep-kracht",
    title: "Rep ranges en kracht",
    category: "Coaching",
    content:
      "Zware loads superieur voor 1RM kracht: hogere neuromusculaire adaptaties, betere motor unit recruitment, specificity naar squat/bench/deadlift. Specificity speelt grote rol — 1RM testen op dezelfde lifts als training. Beginners bouwen kracht ook met lichte loads (zelfs 20+ reps). Gevorderden hebben meer zware training nodig; hoe hoger niveau, hoe belangrijker specificity. Praktisch: zware compounds essentieel; lichte loads voor extra volume en fatigue management.",
    keywords: [
      "kracht",
      "strength",
      "1rm",
      "zwaar",
      "specificity",
      "powerlifting",
      "beginners",
      "gevorderd",
    ],
  },
  {
    id: "rep-hypertrofie",
    title: "Rep ranges en hypertrofie",
    category: "Coaching",
    content:
      "Hypertrofie mogelijk over bijna alle rep ranges — waarschijnlijk geen echte 'hypertrophy zone'. Zware, moderate en lichte loads kunnen vergelijkbare spiergroei geven als effort hoog genoeg is en sets dicht bij failure komen. Bij lichte loads is proximity to failure cruciaal: ver van failure = minder hypertrofie; dicht bij failure = vergelijkbaar aan zware loads. Dicht bij failure rekruteer je meer motor units, inclusief high-threshold.",
    keywords: [
      "hypertrofie",
      "spiergroei",
      "hypertrophy zone",
      "failure",
      "motor units",
      "lichte loads",
      "zware loads",
    ],
  },
  {
    id: "rep-ranges-praktisch",
    title: "Lichte vs zware vs moderate reps",
    category: "Coaching",
    content:
      "Lichte loads: minder gewrichtsstress, goede hypertrofie mogelijk; nadelen = discomfort, metabolische stress, tijdsintensief, hoge RPE. Zware loads: hoge specificity, efficiënt voor kracht; nadelen = joint stress, systemische fatigue, moeilijk veel volume, overreaching risico. Moderate reps = vaak meest praktisch: voldoende mechanical tension, minder discomfort, efficiënter, beter herstel, relatief weinig joint stress.",
    keywords: [
      "moderate",
      "licht",
      "zwaar",
      "joint stress",
      "volume",
      "mechanical tension",
      "RPE",
      "herstel",
    ],
  },
  {
    id: "rep-failure-fibers",
    title: "Failure, fiber types & minimum load",
    category: "Coaching",
    content:
      "Voor hypertrofie: proximity to failure belangrijker dan exact rep aantal. Weinig bewijs dat hoge reps alleen type I fibers trainen of lage reps alleen type II — effort en volledige motor unit recruitment lijken belangrijker. Minimum effectieve load: ~30% 1RM nog effectief; extreem licht (<20-30% 1RM) waarschijnlijk minder optimaal. Muscular endurance: hogere reps kunnen helpen maar bewijs inconsistent; relevanter lower body dan upper body.",
    keywords: [
      "failure",
      "proximity to failure",
      "fiber type",
      "type 1",
      "type 2",
      "30%",
      "1rm",
      "muscular endurance",
    ],
  },
  {
    id: "rep-programming",
    title: "Rep ranges in programming",
    category: "Coaching",
    content:
      "Kracht: focus zware compounds, specificity, regelmatig zware loads. Hypertrofie: vrijwel alle rep ranges werken; failure belangrijker dan exacte reps; moderate reps vaak meest praktisch. Optimale mix: zware loads voor strength/specificity + moderate voor efficiënte hypertrofie + hogere reps voor volume, herstel en joint management. Takeaway: hypertrofie flexibeler dan gedacht; strength blijft specifiek aan zware training.",
    keywords: [
      "programming",
      "programma",
      "periodisering",
      "mix",
      "volume",
      "combinatie",
      "takeaway",
      "coaching",
    ],
  },
  {
    id: "ess-overzicht",
    title: "ESS 4e — NSCA textbook referentie",
    category: "Referentie (ESS 4e)",
    content:
      "Essentials of Strength Training and Conditioning, 4th Edition (NSCA / Human Kinetics, 2016). Editors: G. Gregory Haff, N. Travis Triplett. Standaard CSCS-leerboek: anatomie/fysiologie, biomechanica, bio-energetics, adaptaties, testen, oefentechniek, program design, periodisering, revalidatie en facility management. In deze app: committed chunks = hoofdstukindex + coaching-samenvattingen; volledige tekst alleen lokaal via npm run ingest:ess (niet in git).",
    keywords: [
      "ess",
      "nsca",
      "essentials",
      "strength training",
      "conditioning",
      "cscs",
      "textbook",
      "boek",
      "haff",
      "triplett",
      "4th edition",
      "4e",
    ],
  },
  {
    id: "ess-hoofdstukken-science",
    title: "ESS 4e — Hoofdstukken 1–6 (wetenschap & adaptaties)",
    category: "Referentie (ESS 4e)",
    content:
      "Ch1 Structure and Function of Body Systems (musculoskeletal, neuromuscular, cardiovascular, respiratory). Ch2 Biomechanics of Resistance Exercise (kracht, power, weerstand, gewricht biomechanica). Ch3 Bioenergetics of Exercise and Training (ATP-PC, glycolytic, oxidative, metabolic specificity). Ch4 Endocrine Responses to Resistance Exercise. Ch5 Adaptations to Anaerobic Training (neural, muscular, connective tissue, overtraining, detraining). Ch6 Adaptations to Aerobic Endurance Training.",
    keywords: [
      "ess",
      "biomechanics",
      "bioenergetics",
      "endocrine",
      "anaerobic",
      "aerobic",
      "adaptations",
      "hoofdstuk 1",
      "hoofdstuk 2",
      "hoofdstuk 3",
      "hoofdstuk 4",
      "hoofdstuk 5",
      "hoofdstuk 6",
    ],
  },
  {
    id: "ess-hoofdstukken-athlete",
    title: "ESS 4e — Hoofdstukken 7–11 (atleet & voeding)",
    category: "Referentie (ESS 4e)",
    content:
      "Ch7 Age- and Sex-Related Differences (children, female athletes, older adults). Ch8 Psychology of Athletic Preparation and Performance (arousal, anxiety, motivation, focus). Ch9 Basic Nutrition Factors in Health. Ch10 Nutrition Strategies for Maximizing Performance (pre/during/post, body composition). Ch11 Performance-Enhancing Substances and Methods.",
    keywords: [
      "ess",
      "nutrition",
      "voeding",
      "psychology",
      "children",
      "female",
      "older adults",
      "supplements",
      "hoofdstuk 7",
      "hoofdstuk 8",
      "hoofdstuk 9",
      "hoofdstuk 10",
      "hoofdstuk 11",
    ],
  },
  {
    id: "ess-hoofdstukken-testing",
    title: "ESS 4e — Hoofdstukken 12–16 (testen & techniek)",
    category: "Referentie (ESS 4e)",
    content:
      "Ch12 Principles of Test Selection and Administration. Ch13 Administration, Scoring, and Interpretation of Selected Tests. Ch14 Warm-Up and Flexibility Training. Ch15 Exercise Technique for Free Weight and Machine Training (fundamentals, spotting, SBD/accessories). Ch16 Exercise Technique for Alternative Modes and Nontraditional Implement Training (bodyweight, core, bands/chains, unilateral).",
    keywords: [
      "ess",
      "testing",
      "testen",
      "warm-up",
      "flexibility",
      "stretching",
      "exercise technique",
      "spotting",
      "free weight",
      "hoofdstuk 12",
      "hoofdstuk 13",
      "hoofdstuk 14",
      "hoofdstuk 15",
      "hoofdstuk 16",
    ],
  },
  {
    id: "ess-hoofdstukken-programming",
    title: "ESS 4e — Hoofdstukken 17–22 (programmeren & revalidatie)",
    category: "Referentie (ESS 4e)",
    content:
      "Ch17 Program Design for Resistance Training (7-stappen model). Ch18 Plyometric Training. Ch19 Speed and Agility Training. Ch20 Aerobic Endurance Training. Ch21 Periodization. Ch22 Rehabilitation and Reconditioning.",
    keywords: [
      "ess",
      "program design",
      "periodization",
      "periodisering",
      "plyometric",
      "speed",
      "agility",
      "rehabilitation",
      "revalidatie",
      "hoofdstuk 17",
      "hoofdstuk 18",
      "hoofdstuk 19",
      "hoofdstuk 20",
      "hoofdstuk 21",
      "hoofdstuk 22",
    ],
  },
  {
    id: "ess-program-design-7-stappen",
    title: "ESS 4e — Program design (7 stappen)",
    category: "Coaching",
    content:
      "NSCA resistance program design (ESS ch.17): 1) Needs analysis (doel, atleet, testdata). 2) Exercise selection (competition lifts, assistance, remedial). 3) Training frequency (ervaring, volume, herstel). 4) Exercise order (compound → isolation, power voor strength). 5) Training load & reps (percentage/RPE, doel-afhankelijk). 6) Volume (sets × reps × load). 7) Rest periods (kracht = lang, hypertrofie/endurance = korter). Sluit aan bij RPE- en rep-range coaching in deze app.",
    keywords: [
      "program design",
      "programmeren",
      "needs analysis",
      "exercise selection",
      "frequency",
      "exercise order",
      "volume",
      "rest periods",
      "ess",
      "nsca",
      "hoofdstuk 17",
      "7 stappen",
    ],
  },
  {
    id: "ess-periodization",
    title: "ESS 4e — Periodization",
    category: "Coaching",
    content:
      "Periodization (ESS ch.21): trainingsstress systematisch verdelen over macrocyclus, mesocyclus en microcyclus. Doelen: piekperformance rond wedstrijd, overtraining vermijden, adaptatie sturen. Modellen: linear (progressieve load) vs undulating/nonlinear (frequente variatie in volume/intensiteit). Koppel macrocyclus aan competitieseizoen; mesocycli voor hypertrofie-, strength- of peaking-blocks.",
    keywords: [
      "periodization",
      "periodisering",
      "macrocycle",
      "mesocycle",
      "microcycle",
      "linear",
      "undulating",
      "ess",
      "hoofdstuk 21",
      "block",
    ],
  },
  {
    id: "ess-biomechanics-kracht",
    title: "ESS 4e — Biomechanica & kracht",
    category: "Coaching",
    content:
      "Biomechanics of Resistance Exercise (ESS ch.2): kracht = interactie spier-tendon-been; power = work/time. Weerstand: zwaartekracht, inertia, hydraulisch/elastisch. Joint biomechanics bepalen veilig ROM en belasting (knie/heup/schouder). Relevant voor SBD-techniek en squat-variant keuzes in deze kennisbank — kies oefeningen op basis van gewenste momenten en atleetbeperkingen.",
    keywords: [
      "biomechanics",
      "biomechanica",
      "kracht",
      "power",
      "moment",
      "joint",
      "rom",
      "ess",
      "hoofdstuk 2",
      "squat",
      "bench",
      "deadlift",
    ],
  },
  {
    id: "ess-anaerobic-adaptations",
    title: "ESS 4e — Anaerobic adaptaties",
    category: "Coaching",
    content:
      "Adaptations to Anaerobic Training (ESS ch.5): neural (motor unit recruitment, rate coding, intermuscular coördinatie), muscular (hypertrofie, fiber type), connective tissue. Ook endocrine responses, acute cardio/respiratory responses, compatibility van aerobic + anaerobic work, overtraining en detraining. Coach: monitor fatigue (/externals), volume en intensiteit balanceren.",
    keywords: [
      "anaerobic",
      "adaptations",
      "neural",
      "hypertrophy",
      "overtraining",
      "detraining",
      "motor unit",
      "ess",
      "hoofdstuk 5",
      "fatigue",
    ],
  },
  {
    id: "ess-exercise-technique",
    title: "ESS 4e — Oefentechniek SBD",
    category: "Coaching",
    content:
      "Exercise Technique for Free Weight and Machine Training (ESS ch.15): techniek-fundamentals, spotting, en uitvoering van squat, bench, deadlift en varianten. Alternatieve modes (ch.16): bodyweight, core stability, bands/chains, unilateral work. Gebruik voor techniekvragen naast bench-arch en squat-biomechanics chunks in deze app.",
    keywords: [
      "exercise technique",
      "techniek",
      "spotting",
      "squat",
      "bench",
      "deadlift",
      "free weight",
      "ess",
      "hoofdstuk 15",
      "hoofdstuk 16",
      "sbd",
    ],
  },
];
