# Actualización: Encuestas con Datos Completos

## Cambio Realizado

El endpoint `GET /api/encuestas/:id` ahora devuelve la encuesta **completa** con todas sus preguntas y opciones anidadas en una sola petición.

## Estructura de Respuesta

```json
{
  "id_encuesta": 1,
  "titulo": "Encuesta de Nutrición Materno Infantil",
  "descripcion": "Evaluación nutricional de mujeres embarazadas y madres",
  "version": "1.0",
  "estado": "Activa",
  "grupo_focal": "Mujeres Embarazadas",
  "preguntas": [
    {
      "id_pregunta": 1,
      "id_encuesta": 1,
      "texto": "¿Está embarazada actualmente?",
      "tipo": "SiNo",
      "orden": 1,
      "requerida": true,
      "descripcion": null,
      "condicional": false,
      "condicional_pregunta_id": null,
      "id_categoria_pregunta": 1,
      "categoria_nombre": "Información General",
      "categoria": "Información General",
      "opciones": []
    },
    {
      "id_pregunta": 2,
      "id_encuesta": 1,
      "texto": "¿Cuántos meses de embarazo tiene?",
      "tipo": "OpcionUnica",
      "orden": 2,
      "requerida": true,
      "descripcion": "Seleccione el mes de embarazo",
      "condicional": true,
      "condicional_pregunta_id": 1,
      "id_categoria_pregunta": 1,
      "categoria_nombre": "Información General",
      "categoria": "Información General",
      "opciones": [
        {
          "id_opcion": 1,
          "id_pregunta": 2,
          "etiqueta": "1-3 meses",
          "valor": "1-3",
          "puntos": 1,
          "orden": 1,
          "condicional": false,
          "condicional_pregunta_id": null
        },
        {
          "id_opcion": 2,
          "id_pregunta": 2,
          "etiqueta": "4-6 meses",
          "valor": "4-6",
          "puntos": 2,
          "orden": 2,
          "condicional": false,
          "condicional_pregunta_id": null
        }
      ]
    }
  ]
}
```

## Campos Incluidos

### Encuesta
- `id_encuesta`
- `titulo`
- `descripcion`
- `version`
- `estado`
- `grupo_focal`
- `preguntas` (array)

### Preguntas
- `id_pregunta`
- `id_encuesta`
- `texto`
- `tipo` (SiNo, OpcionUnica, OpcionMultiple, Numerica, Texto, Fecha)
- `orden`
- `requerida` (true/false)
- `descripcion`
- `condicional` (true/false)
- `condicional_pregunta_id`
- `id_categoria_pregunta`
- `categoria_nombre`
- `categoria` (alias de categoria_nombre)
- `opciones` (array)

### Opciones
- `id_opcion`
- `id_pregunta`
- `etiqueta`
- `valor`
- `puntos`
- `orden`
- `condicional`
- `condicional_pregunta_id`

## Ventajas

1. ✅ **Una sola petición** en lugar de N+1 peticiones
2. ✅ **Mejor rendimiento** - reduce el tiempo de carga
3. ✅ **Datos consistentes** - todas las preguntas y opciones vienen juntas
4. ✅ **Menos errores** - no hay posibilidad de que fallen peticiones individuales
5. ✅ **Más rápido** - especialmente con muchas preguntas

## Frontend Actualizado

El componente `SurveyFormContainer.jsx` ahora:
1. Obtiene la encuesta completa con un solo `getSurveyById()`
2. Verifica si las preguntas y opciones ya vienen incluidas
3. Solo hace peticiones adicionales si los datos no están completos (fallback)

## Endpoints Adicionales (Fallback)

Si por alguna razón el endpoint principal no devuelve los datos completos, el frontend puede usar:
- `GET /api/preguntas/encuesta/:id` - Obtener preguntas por separado
- `GET /api/preguntas-opciones/pregunta/:id` - Obtener opciones por separado

Estos endpoints siguen disponibles como respaldo.

## Cómo Probar

1. Abrir consola del navegador (F12)
2. Ir a una encuesta
3. Buscar el log: `📊 Datos completos de encuesta:`
4. Verificar que el objeto incluya `preguntas` con sus `opciones`
5. Buscar el log: `✅ Usando preguntas del objeto encuesta`

## Deployment

Después de hacer commit de estos cambios:
```bash
cd CAB-Project
git add .
git commit -m "Mejorar endpoint de encuestas - incluir preguntas y opciones completas"
git push origin main
```

Render desplegará automáticamente la nueva versión.
