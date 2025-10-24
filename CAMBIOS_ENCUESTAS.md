# Cambios realizados en la API para soporte de encuestas

## Resumen
Se agregaron los endpoints necesarios para que el sistema de encuestas funcione correctamente con el frontend.

## Nuevos endpoints agregados

### 1. Preguntas
- **GET `/api/preguntas/encuesta/:id`** - Obtiene todas las preguntas de una encuesta específica
  - Requiere autenticación
  - Retorna: Array de preguntas con sus categorías

- **GET `/api/preguntas-opciones/pregunta/:id`** - Obtiene las opciones de una pregunta
  - Requiere autenticación
  - Retorna: Array de opciones de la pregunta

### 2. Comunidades
- **GET `/api/comunidades/municipio/:id`** - Obtiene las comunidades de un municipio
  - No requiere autenticación
  - Retorna: Array de comunidades del municipio

### 3. Respuestas
- **GET `/api/respuestas/generar-boleta`** - Genera un número de boleta único
  - Requiere autenticación
  - Retorna: `{ boleta_num: number }`

## Modificaciones a endpoints existentes

### POST `/api/respuestas`
- Ahora acepta tanto `detalles` como `respuestas` en el body (compatibilidad)
- El `id_usuario` es opcional (permite envíos sin autenticación)
- Formato esperado:
```json
{
  "boleta_num": 123456,
  "id_encuesta": 1,
  "id_comunidad": 5,
  "metadata": { ... },
  "respuestas": [
    {
      "id_pregunta": 10,
      "valor": "respuesta",
      "id_opcion": 5,
      "valor_numerico": null
    }
  ]
}
```

## Archivos nuevos creados
- `api/controllers/preguntas.controller.js`
- `api/routes/preguntas.routes.js`

## Archivos modificados
- `api/controllers/comunidades.controller.js` - Agregada función `getComunidadesByMunicipio`
- `api/controllers/respuestas.controller.js` - Agregada función `generateBoletaNumber` y compatibilidad de formato
- `api/routes/comunidades.routes.js` - Agregado endpoint `/comunidades/municipio/:id`
- `api/routes/respuestas.routes.js` - Agregado endpoint `/respuestas/generar-boleta`
- `api/index.js` - Registradas las nuevas rutas de preguntas

## Cómo probar

1. Iniciar el servidor:
```bash
cd api
npm install
npm start
```

2. El servidor iniciará en `http://localhost:3000`

3. Ver la documentación completa en `http://localhost:3000/api-docs`

## Endpoints que requieren autenticación
Los siguientes endpoints requieren un token JWT en el header `Authorization: Bearer <token>`:
- `/api/preguntas/encuesta/:id`
- `/api/preguntas-opciones/pregunta/:id`
- `/api/respuestas/generar-boleta`
- `/api/encuestas`
- `/api/encuestas/:id`

## Endpoints públicos
Los siguientes endpoints NO requieren autenticación:
- `/api/departamentos`
- `/api/municipios`
- `/api/municipios/departamento/:id`
- `/api/comunidades`
- `/api/comunidades/municipio/:id`
- `/api/respuestas` (POST)

## Notas importantes
- La base de datos debe tener las tablas: `cab.preguntas`, `cab.preguntas_opciones`, `cab.respuestas`, `cab.respuestas_detalle`, `cab.comunidades`, etc.
- Asegúrate de tener el archivo `.env` configurado correctamente con las credenciales de la base de datos
