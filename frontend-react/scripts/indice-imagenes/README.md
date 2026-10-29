# Generador del índice de imágenes (KAN-97)

Crea `public/recursos/indice-imagenes.json`, el índice que usa el modal de **Ejercicios** para sugerir
imágenes de referencia mientras se escribe el nombre de un ejercicio propio.

## Qué hace
1. Lee `exercises.json` de free-exercise-db. Si no está en esta carpeta, lo descarga de GitHub; no se
   versiona (está en `.gitignore`).
2. Se queda con los ejercicios que traen las dos imágenes (posición inicial y final): son 873.
3. A cada uno le agrega:
   - el **nombre en español**, desde `traducciones.tsv` (traducción propia, escrita a mano);
   - **palabras clave en español**, desde el `GLOSARIO` del script (sinónimos de gimnasios de Colombia:
     vuelos, estocadas, pesa rusa, trotadora…);
   - el **grupo muscular** y el **equipo** convertidos a nuestras listas (`GrupoMuscular`,
     `EquipoEjercicio`);
   - la **categoría** (fuerza, cardio o estiramiento).
4. Escribe el JSON compacto en `public/recursos/indice-imagenes.json`.

Las imágenes **no se descargan**: la app las enlaza en
`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<id>/0.jpg` (y `1.jpg`).

## Cómo correrlo
Necesita Python 3, sin librerías extra. Desde `frontend-react/`:

```
python scripts/indice-imagenes/generar_indice.py
```

Si la fuente agrega ejercicios nuevos, el script se detiene y lista los que no tienen traducción.
Agrégalos a `traducciones.tsv` (formato: `id<TAB>nombre en español`) y vuelve a correrlo.

## Fuente y licencia
[free-exercise-db](https://github.com/yuhonas/free-exercise-db), de yuhonas, publicado bajo
**The Unlicense** (dominio público): se puede copiar, modificar y redistribuir sin pedir permiso. Se
cita por cortesía. Ver también `DECISIONES.md` (D5).
