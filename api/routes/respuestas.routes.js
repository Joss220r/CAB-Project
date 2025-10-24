
const { Router } = require('express');
const { createRespuesta, generateBoletaNumber } = require('../controllers/respuestas.controller');
const { verifyToken, requireAuthenticatedUser } = require('../middleware/auth');

const router = Router();

/**
 * @swagger
 * /respuestas:
 *   post:
 *     summary: Guarda una encuesta completada
 *     tags: [Respuestas]
 *     security:
 *       - bearerAuth: []
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

/**
 * @swagger
 * /respuestas/generar-boleta:
 *   get:
 *     summary: Genera un número de boleta único
 *     tags: [Respuestas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Número de boleta generado
 *       500:
 *         description: Error en el servidor
 */
router.get('/respuestas/generar-boleta', verifyToken, requireAuthenticatedUser, generateBoletaNumber);

module.exports = router;
