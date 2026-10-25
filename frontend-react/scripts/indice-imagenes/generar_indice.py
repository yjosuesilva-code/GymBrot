"""KAN-97 — Genera public/recursos/indice-imagenes.json a partir de free-exercise-db.

Fuente: https://github.com/yuhonas/free-exercise-db (licencia The Unlicense, dominio público).
Uso (desde frontend-react/):  python scripts/indice-imagenes/generar_indice.py
Si no existe scripts/indice-imagenes/exercises.json, lo descarga de GitHub (no se versiona).
Los nombres en español salen de traducciones.tsv (escritas a mano); las palabras clave, del GLOSARIO.
"""
import io
import json
import os
import re
import urllib.request

CARPETA = os.path.dirname(os.path.abspath(__file__))
ORIGEN = os.path.join(CARPETA, "exercises.json")
TRADUCCIONES = os.path.join(CARPETA, "traducciones.tsv")
SALIDA = os.path.join(CARPETA, "..", "..", "public", "recursos", "indice-imagenes.json")
URL_ORIGEN = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"

if not os.path.exists(ORIGEN):
    print("Descargando", URL_ORIGEN)
    urllib.request.urlretrieve(URL_ORIGEN, ORIGEN)

# Solo los ejercicios con las dos imágenes (posición inicial y final)
datos = [e for e in json.load(open(ORIGEN, encoding="utf-8")) if len(e["images"]) >= 2]

es = {}
for linea in io.open(TRADUCCIONES, encoding="utf-8"):
    if linea.startswith("#") or not linea.strip():
        continue
    id_, nombre = linea.rstrip("\n").split("\t")
    es[id_] = nombre
faltan = [e["id"] for e in datos if e["id"] not in es]
if faltan:
    raise SystemExit("Faltan traducciones en traducciones.tsv para: " + ", ".join(faltan))

# Músculo principal → nuestro GrupoMuscular (forearms y neck son aproximados)
GRUPO = {
    "abdominals": "Abdomen", "chest": "Pecho", "biceps": "Bíceps", "triceps": "Tríceps",
    "lats": "Espalda", "middle back": "Espalda", "lower back": "Espalda",
    "shoulders": "Hombros", "traps": "Hombros", "neck": "Hombros",
    "quadriceps": "Piernas", "hamstrings": "Piernas", "calves": "Piernas", "adductors": "Piernas",
    "glutes": "Glúteos", "abductors": "Glúteos", "forearms": "Bíceps",
}
# Equipo → nuestro EquipoEjercicio (lo que no está en la lista queda null)
EQUIPO = {
    "barbell": "Barra", "e-z curl bar": "Barra", "dumbbell": "Mancuerna", "cable": "Polea",
    "machine": "Máquina", "kettlebells": "Kettlebell", "bands": "Banda elástica", "body only": "Peso corporal",
}
CATEGORIA = {"stretching": "estiramiento", "cardio": "cardio"}  # el resto: "fuerza"

# Glosario: patrón (regex sobre el nombre en inglés, en minúsculas) → palabras clave en español
GLOSARIO = [
    (r"bench press|floor press", ["press de banca", "banca", "pecho"]),
    (r"^(?!.*(incline|decline)).*bench press", ["pecho plano", "banca plana"]),
    (r"incline", ["inclinado"]), (r"decline", ["declinado"]),
    (r"squat", ["sentadilla", "sentadillas"]),
    (r"lunge", ["zancada", "estocada", "desplante"]),
    (r"split squat", ["búlgara", "zancada"]),
    (r"deadlift", ["peso muerto"]), (r"romanian", ["rumano"]),
    (r"stiff", ["piernas rígidas", "peso muerto rumano"]),
    (r"sumo", ["sumo"]),
    (r"leg curl|hamstring curl|glute ham|glute-ham", ["femoral", "isquiotibiales", "curl femoral"]),
    (r"wrist|finger|forearm|plate pinch", ["antebrazo", "muñeca", "agarre"]),
    (r"^(?!.*(leg|wrist|finger|hamstring|lower back|reverse)).*curl", ["bíceps", "curl"]),
    (r"hammer", ["martillo"]), (r"preacher", ["predicador", "banco scott"]),
    (r"concentration", ["concentrado"]),
    (r"skull|lying triceps press|lying close-grip barbell triceps", ["rompecráneos", "press francés"]),
    (r"tricep", ["tríceps"]),
    (r"pushdown", ["jalón de tríceps", "extensión en polea"]),
    (r"kickback", ["patada"]),
    (r"\bdip", ["fondos", "paralelas"]),
    (r"pull[- ]?ups?|chin-?up|(?<!to )\bchins?\b(?! to)", ["dominadas", "barra fija"]),
    (r"pulldown|lat pull", ["jalón", "jalón al pecho", "polea alta", "dorsales"]),
    (r"\brows?\b", ["remo"]),
    (r"upright", ["remo al mentón", "remo al cuello"]),
    (r"shrug", ["encogimientos", "trapecio"]),
    (r"lateral raise|side lateral|side laterals|deltoid raise", ["vuelos laterales", "laterales", "deltoides"]),
    (r"front .*raise|front raise", ["elevación frontal", "vuelos frontales", "deltoides"]),
    (r"rear delt|reverse fly|reverse machine fly|rear lateral", ["pájaros", "deltoides posterior", "vuelos posteriores"]),
    (r"fly|flye", ["aperturas"]),
    (r"butterfly", ["peck deck", "pec deck", "mariposa", "contractor de pecho"]),
    (r"crossover|iron cross", ["cruce de poleas", "crossover"]),
    (r"shoulder press|military|overhead press|push press|seated dumbbell press|standing dumbbell press", ["press militar", "press de hombro", "hombro"]),
    (r"arnold", ["press arnold"]),
    (r"calf|calves|soleus|gastrocnemius", ["pantorrilla", "gemelos"]),
    (r"leg press", ["prensa", "prensa de piernas"]),
    (r"leg extension", ["cuádriceps", "silla de cuádriceps", "extensiones"]),
    (r"hip thrust|glute bridge|butt lift|hip raise|hip lift|hip bridge", ["puente de glúteo", "empuje de cadera", "glúteo"]),
    (r"glute|\bbutt[ -]", ["glúteo", "cola"]),
    (r"kettlebell", ["pesa rusa", "kettlebell"]),
    (r"swing", ["swing"]),
    (r"crunch|sit-?up|jackknife|tuck", ["abdominales", "abdomen"]),
    (r"plank|bridge$|side bridge", ["plancha", "isométrico"]),
    (r"oblique|side bend|twist|wood ?chop|windmill", ["oblicuos", "cintura"]),
    (r"leg raise|leg lift|pull-in|flutter|scissor|knee.*raise", ["elevación de piernas", "abdomen bajo"]),
    (r"hyperextension|back extension|lower back curl|superman", ["lumbares", "espalda baja", "banco romano"]),
    (r"good morning", ["buenos días", "lumbar", "isquiotibiales"]),
    (r"push-?up", ["flexiones", "flexiones de pecho", "lagartijas"]),
    (r"smith", ["smith", "multipower"]),
    (r"hack", ["hack"]),
    (r"treadmill|jogging|running|trail", ["caminadora", "trotadora", "trotar", "correr"]),
    (r"bicycl|bike", ["bicicleta", "spinning"]),
    (r"elliptical", ["elíptica"]),
    (r"stairmaster|step mill|power stairs", ["escaladora", "escaleras"]),
    (r"rowing", ["remo ergómetro", "remoergómetro"]),
    (r"jump|hop|bound|leap|skip", ["saltos", "pliometría"]),
    (r"sled|prowler", ["trineo"]),
    (r"\bclean|snatch|jerk", ["halterofilia", "olímpico"]),
    (r"smr", ["rodillo de espuma", "foam roller", "liberación miofascial"]),
    (r"stretch|pose|circles", ["estiramiento", "movilidad"]),
    (r"band", ["banda", "liga", "banda elástica"]),
    (r"cable|pulley", ["polea"]),
    (r"dumbbell", ["mancuerna", "mancuernas"]),
    (r"barbell|bar\b", ["barra"]),
    (r"machine|leverage", ["máquina"]),
    (r"medicine ball", ["balón medicinal"]),
    (r"exercise ball|stability ball|physioball", ["balón de pilates", "fitball"]),
    (r"abductor", ["abductores", "glúteo medio"]), (r"adductor|groin", ["aductores", "ingle"]),
    (r"farmer|yoke|carry", ["paseo del granjero", "cargas"]),
    (r"battling ropes", ["cuerdas de batalla", "cuerdas"]),
    (r"rope jumping", ["saltar lazo", "comba", "cuerda"]),
    (r"mountain climber", ["escaladores"]),
    (r"russian twist", ["giros rusos"]),
    (r"sissy", ["sissy"]),
    (r"step.?up", ["step", "subidas al cajón"]),
    (r"box jump", ["saltos al cajón"]),
    (r"neck", ["cuello"]),
    (r"suspended", ["trx", "suspensión"]),
    (r"pullover", ["pullover"]),
    (r"face pull", ["face pull", "deltoides posterior"]),
    (r"pallof", ["antirrotación", "core"]),
]
GLOSARIO = [(re.compile(p), claves) for p, claves in GLOSARIO]

indice = []
for e in datos:
    en = e["name"]
    categoria = CATEGORIA.get(e["category"], "fuerza")
    if e["category"] == "cardio":
        grupo = "Cardio"
    elif e["category"] in ("olympic weightlifting", "strongman"):
        grupo = "Cuerpo completo"
    else:
        grupo = GRUPO[e["primaryMuscles"][0]]
    equipo = EQUIPO.get(e["equipment"] or "")
    claves = []
    bajo = en.lower()
    for patron, palabras in GLOSARIO:
        if patron.search(bajo):
            claves += palabras
    if categoria == "estiramiento":
        claves.append("estiramiento")
    claves.append(grupo.lower())
    if equipo:
        claves.append(equipo.lower())
    vistas = set()
    claves = [c for c in claves if not (c in vistas or vistas.add(c))]  # sin repetidos, en orden
    indice.append({"id": e["id"], "en": en, "es": es[e["id"]], "claves": claves,
                   "grupo": grupo, "equipo": equipo, "cat": categoria})

io.open(SALIDA, "w", encoding="utf-8", newline="\n").write(
    json.dumps(indice, ensure_ascii=False, separators=(",", ":")))
print(len(indice), "ejercicios escritos en", os.path.normpath(SALIDA))
