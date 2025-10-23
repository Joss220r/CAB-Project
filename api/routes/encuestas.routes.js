
const { Router } = require('express');
const { createEncuesta, getEncuestas, getEncuestaById, updateEncuestaEstado } = require('../controllers/encuestas.controller');
const { verifyToken, requireAdmin, requireAuthenticatedUser } = require('../middleware/auth');

const router = Router();

/**
 * @swagger
 * /encuestas:
 *   get:
 *     summary: Obtiene una lista de todas las encuestas
 *     tags: [Encuestas]
 *     responses:
 *       200:
 *         description: Lista de encuestas con el conteo de preguntas.
 *       500:
 *         description: Error en el servidor
 */
router.get('/encuestas', verifyToken, requireAuthenticatedUser, getEncuestas);

/**
 * @swagger
 * /encuestas/{id}:
 *   get:
 *     summary: Obtiene el detalle completo de una encuesta, incluyendo preguntas y opciones
 *     tags: [Encuestas]
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
 *         description: Objeto de la encuesta con sus preguntas y opciones anidadas.
 *       404:
 *         description: Encuesta no encontrada
 *       500:
 *         description: Error en el servidor
 */
router.get('/encuestas/:id', verifyToken, requireAuthenticatedUser, getEncuestaById);

/**
 * @swagger
 * /encuestas/{id}/estado:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Actualiza el estado de una encuesta (Activa/Inactiva)
 *     tags: [Encuestas]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la encuesta a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *                 description: "El nuevo estado de la encuesta. Debe ser 'Activa' o 'Inactiva'."
 *                 example: "Activa"
 *     responses:
 *       200:
 *         description: Estado de la encuesta actualizado exitosamente
 *       400:
 *         description: El estado proporcionado no es válido
 *       404:
 *         description: Encuesta no encontrada
 *       500:
 *         description: Error en el servidor
 */
router.put('/encuestas/:id/estado', verifyToken, requireAdmin, updateEncuestaEstado);

/**
 * @swagger
 * /encuestas:
 *   post:
 *     summary: Crea una nueva encuesta con sus preguntas y opciones (Solo Admin)
 *     tags: [Encuestas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EncuestaInput'
 *     responses:
 *       201:
 *         description: Encuesta creada exitosamente
 *       400:
 *         description: Faltan datos o el formato es incorrecto
 *       500:
 *         description: Error en el servidor al procesar la transacción
 */
router.post('/encuestas', verifyToken, requireAdmin, createEncuesta);

module.exports = router;



