
const { Router } = require('express');
const { getDepartamentos } = require('../controllers/departamentos.controller');

const router = Router();

/**
 * @swagger
 * /departamentos:
 *   get:
 *     summary: Obtiene la lista de todos los departamentos
 *     tags: [Catalogos]
 *     responses:
 *       200:
 *         description: Lista de departamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_departamento:
 *                     type: integer
 *                   nombre:
 *                     type: string
 *       500:
 *         description: Error en el servidor
 */
router.get('/departamentos', getDepartamentos);

module.exports = router;
