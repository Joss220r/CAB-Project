
const { Router } = require('express');
const { getPreguntasByEncuesta, getOpcionesByPregunta } = require('../controllers/preguntas.controller');
const { verifyToken, requireAuthenticatedUser } = require('../middleware/auth');

const router = Router();

/**
 * @swagger
 * /preguntas/encuesta/{id}:
 *   get:
 *     summary: Obtiene todas las preguntas de una encuesta
 *     tags: [Preguntas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la encuesta
 *     responses:
 *       200:
 *         description: Lista de preguntas de la encuesta
 *       500:
 *         description: Error en el servidor
 */
router.get('/preguntas/encuesta/:id', verifyToken, requireAuthenticatedUser, getPreguntasByEncuesta);

/**
 * @swagger
 * /preguntas-opciones/pregunta/{id}:
 *   get:
 *     summary: Obtiene las opciones de una pregunta específica
 *     tags: [Preguntas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la pregunta
 *     responses:
 *       200:
 *         description: Lista de opciones de la pregunta
 *       500:
 *         description: Error en el servidor
 */
router.get('/preguntas-opciones/pregunta/:id', verifyToken, requireAuthenticatedUser, getOpcionesByPregunta);

module.exports = router;
