
const { Router } = require('express');
const { getPreguntasByEncuesta, getOpcionesByPregunta, filterPreguntas } = require('../controllers/preguntas.controller');
const { verifyToken, requireAuthenticatedUser } = require('../middleware/auth');

const router = Router();

/**
 * @swagger
 * /preguntas/filter:
 *   get:
 *     summary: Filtra preguntas según múltiples criterios
 *     tags: [Preguntas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_encuesta
 *         schema:
 *           type: integer
 *         description: ID de la encuesta
 *       - in: query
 *         name: id_categoria
 *         schema:
 *           type: integer
 *         description: ID de la categoría de pregunta
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [OpcionUnica, OpcionMultiple, Numerica, SiNo, Fecha, Texto]
 *         description: Tipo de pregunta
 *       - in: query
 *         name: texto
 *         schema:
 *           type: string
 *         description: Búsqueda parcial en el texto de la pregunta
 *     responses:
 *       200:
 *         description: Lista de preguntas filtradas
 *       500:
 *         description: Error en el servidor
 */
router.get('/preguntas/filter', verifyToken, requireAuthenticatedUser, filterPreguntas);

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
