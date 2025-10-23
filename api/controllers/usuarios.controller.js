
const { getConnection } = require('../db');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');

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
  const { nombre, correo, password, rol } = req.body;

  if (!nombre || !correo || !password || !rol) {
    return res.status(400).json({ msg: 'Por favor, incluye todos los campos: nombre, correo, password, rol' });
  }

  // Validar longitud de contraseña
  if (password.length < 6) {
    return res.status(400).json({ msg: 'La contraseña debe tener al menos 6 caracteres' });
  }

  // Validar rol
  if (!['Admin', 'Encuestador'].includes(rol)) {
    return res.status(400).json({ msg: 'El rol debe ser Admin o Encuestador' });
  }

  try {
    // Hash de la contraseña
    const saltRounds = 12;
    const pass_hash = await bcrypt.hash(password, saltRounds);

    const pool = await getConnection();
    const result = await pool
      .request()
      .input('nombre', sql.VarChar, nombre)
      .input('correo', sql.VarChar, correo)
      .input('pass_hash', sql.VarChar, pass_hash)
      .input('rol', sql.VarChar, rol)
      .query('INSERT INTO cab.usuarios (nombre, correo, pass_hash, rol) VALUES (@nombre, @correo, @pass_hash, @rol); SELECT SCOPE_IDENTITY() as id;');
    
    res.status(201).json({ 
      id: result.recordset[0].id, 
      nombre, 
      correo, 
      rol,
      msg: 'Usuario creado exitosamente'
    });
  } catch (error) {
    // Error de llave única (correo duplicado)
    if (error.number === 2627) {
      return res.status(409).json({ msg: 'El correo electrónico ya está en uso.' });
    }
    console.error('Error al crear usuario:', error);
    res.status(500).json({ msg: 'Error interno del servidor' });
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

// Función de login
const loginUsuario = async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ msg: 'Por favor, incluye correo y contraseña' });
  }

  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('correo', sql.VarChar, correo)
      .query('SELECT id_usuario, nombre, correo, pass_hash, rol, activo FROM cab.usuarios WHERE correo = @correo');

    if (result.recordset.length === 0) {
      return res.status(401).json({ msg: 'Credenciales inválidas' });
    }

    const usuario = result.recordset[0];

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({ msg: 'Usuario inactivo. Contacta al administrador.' });
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.pass_hash);
    if (!passwordValida) {
      return res.status(401).json({ msg: 'Credenciales inválidas' });
    }

    // Generar token JWT
    const token = generateToken(usuario);

    res.json({
      msg: 'Login exitoso',
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// Obtener perfil del usuario autenticado
const getProfile = async (req, res) => {
  try {
    // req.user viene del middleware de autenticación
    res.json({
      usuario: {
        id: req.user.id_usuario,
        nombre: req.user.nombre,
        correo: req.user.correo,
        rol: req.user.rol,
        activo: req.user.activo
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// Cambiar contraseña del usuario autenticado
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ msg: 'Por favor, incluye la contraseña actual y la nueva contraseña' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ msg: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const pool = await getConnection();
    
    // Obtener contraseña actual del usuario
    const userResult = await pool
      .request()
      .input('id', sql.BigInt, req.user.id_usuario)
      .query('SELECT pass_hash FROM cab.usuarios WHERE id_usuario = @id');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(currentPassword, userResult.recordset[0].pass_hash);
    if (!passwordValida) {
      return res.status(401).json({ msg: 'Contraseña actual incorrecta' });
    }

    // Hash de la nueva contraseña
    const saltRounds = 12;
    const newPassHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    await pool
      .request()
      .input('id', sql.BigInt, req.user.id_usuario)
      .input('pass_hash', sql.VarChar, newPassHash)
      .query('UPDATE cab.usuarios SET pass_hash = @pass_hash WHERE id_usuario = @id');

    res.json({ msg: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

module.exports = {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  loginUsuario,
  getProfile,
  changePassword
};


