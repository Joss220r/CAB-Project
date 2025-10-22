
const { Router } = require('express');
const {
  getGruposFocales,
  getCategoriasPreguntas,
  getSubcategoriasByCategoria,
} = require('../controllers/catalogos.controller');

const router = Router();

/**
 * @swagger
 * /grupos-focales:
 *   get:
 *     summary: Obtiene la lista de todos los grupos focales
 *     tags: [Catalogos]
 *     responses:
 *       200:
 *         description: Lista de grupos focales
 */
router.get('/grupos-focales', getGruposFocales);

/**
 * @swagger
 * /categorias-preguntas:
 *   get:
 *     summary: Obtiene la lista de todas las categorías de preguntas
 *     tags: [Catalogos]
 *     responses:
 *       200:
 *         description: Lista de categorías de preguntas
 */
router.get('/categorias-preguntas', getCategoriasPreguntas);

/**
 * @swagger
 * /categorias-preguntas/{id}/subcategorias:
 *   get:
 *     summary: Obtiene las subcategorías de una categoría de pregunta específica
 *     tags: [Catalogos]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la categoría de pregunta padre
 *     responses:
 *       200:
 *         description: Lista de subcategorías
 */
router.get('/categorias-preguntas/:id/subcategorias', getSubcategoriasByCategoria);

module.exports = router;
