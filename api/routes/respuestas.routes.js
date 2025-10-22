
const { Router } = require('express');
const { createRespuesta } = require('../controllers/respuestas.controller');

const router = Router();

/**
 * @swagger
 * /respuestas:
 *   post:
 *     summary: Guarda una encuesta completada
 *     tags: [Respuestas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RespuestaInput'
 *     responses:
 *       201:
 *         description: Respuesta guardada exitosamente
 *       400:
 *         description: Faltan datos o el formato es incorrecto
 *       409:
 *         description: El número de boleta ya existe
 *       500:
 *         description: Error en el servidor al procesar la transacción
 */
router.post('/respuestas', createRespuesta);

module.exports = router;
