
const { Router } = require('express');

const { getMunicipios, getMunicipiosByDepartamento } = require('../controllers/municipios.controller');

const router = Router();

/**
 * @swagger
 * /municipios:
 *   get:
 *     summary: Obtiene la lista de todos los municipios
 *     tags: [Catalogos]
 *     responses:
 *       200:
 *         description: Lista de municipios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id_municipio:
 *                     type: integer
 *                   id_departamento:
 *                     type: integer
 *                   nombre:
 *                     type: string
 *       500:
 *         description: Error en el servidor
 */
router.get('/municipios', getMunicipios);

/**
 * @swagger
 * /municipios/departamento/{id}:
 *   get:
 *     summary: Obtiene los municipios de un departamento específico
 *     tags: [Catalogos]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del departamento
 *     responses:
 *       200:
 *         description: Lista de municipios para el departamento especificado
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Municipio'
 *       404:
 *         description: Departamento no encontrado
 *       500:
 *         description: Error en el servidor
 */
router.get('/municipios/departamento/:id', getMunicipiosByDepartamento);


module.exports = router;

