
const { Router } = require('express');
const { getComunidades, getComunidadesByMunicipio } = require('../controllers/comunidades.controller');

const router = Router();

/**
 * @swagger
 * /comunidades:
 *   get:
 *     summary: Obtiene la lista de todas las comunidades
 *     tags: [Catalogos]
 *     responses:
 *       200:
 *         description: Lista de comunidades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_comunidad:
 *                     type: integer
 *                   id_municipio:
 *                     type: integer
 *                   nombre:
 *                     type: string
 *                   area:
 *                     type: string
 *       500:
 *         description: Error en el servidor
 */
router.get('/comunidades', getComunidades);

/**
 * @swagger
 * /comunidades/municipio/{id}:
 *   get:
 *     summary: Obtiene las comunidades de un municipio específico
 *     tags: [Catalogos]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del municipio
 *     responses:
 *       200:
 *         description: Lista de comunidades para el municipio especificado
 *       500:
 *         description: Error en el servidor
 */
router.get('/comunidades/municipio/:id', getComunidadesByMunicipio);

module.exports = router;
