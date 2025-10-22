
const { Router } = require('express');


const { getUsuarios, createUsuario, updateUsuario, deleteUsuario } = require('../controllers/usuarios.controller');

const router = Router();

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Obtiene la lista de todos los usuarios
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *       500:
 *         description: Error en el servidor
 */
router.get('/usuarios', getUsuarios);

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Crea un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               correo:
 *                 type: string
 *               pass_hash:
 *                 type: string
 *                 description: 'Contraseña en texto plano (temporalmente)'
 *               rol:
 *                 type: string
 *                 example: 'Encuestador'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Faltan datos
 *       409:
 *         description: El correo ya está en uso
 *       500:
 *         description: Error en el servidor
 */
router.post('/usuarios', createUsuario);

/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Actualiza un usuario existente
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del usuario a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         description: Faltan datos
 *       404:
 *         description: Usuario no encontrado
 *       409:
 *         description: El correo ya está en uso por otro usuario
 *       500:
 *         description: Error en el servidor
 */
router.put('/usuarios/:id', updateUsuario);

/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     summary: Elimina un usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del usuario a eliminar
 *     responses:
 *       204:
 *         description: Usuario eliminado exitosamente
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error en el servidor
 */
router.delete('/usuarios/:id', deleteUsuario);

module.exports = router;


