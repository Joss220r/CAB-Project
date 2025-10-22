
const { getConnection } = require('../db');
const sql = require('mssql');

const getUsuarios = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT id_usuario, nombre, correo, rol, activo, creado_en FROM cab.usuarios');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};


const createUsuario = async (req, res) => {
  const { nombre, correo, pass_hash, rol } = req.body;

  if (!nombre || !correo || !pass_hash || !rol) {
    return res.status(400).json({ msg: 'Por favor, incluye todos los campos: nombre, correo, pass_hash, rol' });
  }

  // TODO: Implementar hashing de contraseña con bcrypt. Guardar contraseñas en texto plano es inseguro.

  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('nombre', sql.VarChar, nombre)
      .input('correo', sql.VarChar, correo)
      .input('pass_hash', sql.VarChar, pass_hash) // Contraseña en texto plano
      .input('rol', sql.VarChar, rol)
      .query('INSERT INTO cab.usuarios (nombre, correo, pass_hash, rol) VALUES (@nombre, @correo, @pass_hash, @rol); SELECT SCOPE_IDENTITY() as id;');
    
    res.status(201).json({ id: result.recordset[0].id, nombre, correo, rol });
  } catch (error) {
    // Error de llave única (correo duplicado)
    if (error.number === 2627) {
      return res.status(409).json({ msg: 'El correo electrónico ya está en uso.' });
    }
    res.status(500).send(error.message);
  }
};


const updateUsuario = async (req, res) => {
  const { id } = req.params;
  const { nombre, correo, rol, activo } = req.body;

  if (!nombre || !correo || !rol || activo === undefined) {
    return res.status(400).json({ msg: 'Por favor, incluye todos los campos: nombre, correo, rol, activo' });
  }

  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.BigInt, id)
      .input('nombre', sql.VarChar, nombre)
      .input('correo', sql.VarChar, correo)
      .input('rol', sql.VarChar, rol)
      .input('activo', sql.Bit, activo)
      .query('UPDATE cab.usuarios SET nombre = @nombre, correo = @correo, rol = @rol, activo = @activo WHERE id_usuario = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ msg: 'Usuario no encontrado.' });
    }

    res.json({ id, nombre, correo, rol, activo });
  } catch (error) {
    // Manejo de correo duplicado en actualización
    if (error.number === 2627) {
      return res.status(409).json({ msg: 'El correo electrónico ya está en uso por otro usuario.' });
    }
    res.status(500).send(error.message);
  }
};

const deleteUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.BigInt, id)
      .query('DELETE FROM cab.usuarios WHERE id_usuario = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ msg: 'Usuario no encontrado.' });
    }

    res.sendStatus(204); // No content
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
};


