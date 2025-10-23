const jwt = require('jsonwebtoken');
const { getConnection } = require('../db');
const sql = require('mssql');

// Clave secreta para JWT (en producción debe estar en variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'tu_clave_secreta_muy_segura_aqui_2024';
const JWT_EXPIRES_IN = '12h'; // 12 horas de duración

/**
 * Genera un token JWT para un usuario
 * @param {Object} user - Objeto usuario con id_usuario, correo, rol
 * @returns {string} Token JWT
 */
const generateToken = (user) => {
  const payload = {
    id: user.id_usuario,
    correo: user.correo,
    rol: user.rol
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'CAB-API',
    audience: 'CAB-CLIENT'
  });
};

/**
 * Middleware para verificar token JWT
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const verifyToken = async (req, res, next) => {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        msg: 'Token de acceso requerido',
        error: 'NO_TOKEN'
      });
    }

    // Verificar formato "Bearer token"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ 
        msg: 'Formato de token inválido',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Verificar y decodificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar que el usuario aún existe y está activo
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.BigInt, decoded.id)
      .query('SELECT id_usuario, nombre, correo, rol, activo FROM cab.usuarios WHERE id_usuario = @id AND activo = 1');

    if (result.recordset.length === 0) {
      return res.status(401).json({ 
        msg: 'Usuario no encontrado o inactivo',
        error: 'USER_NOT_FOUND'
      });
    }

    // Agregar información del usuario al request
    req.user = result.recordset[0];
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        msg: 'Token inválido',
        error: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        msg: 'Token expirado',
        error: 'TOKEN_EXPIRED'
      });
    }

    console.error('Error en verificación de token:', error);
    return res.status(500).json({ 
      msg: 'Error interno del servidor',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Middleware para verificar roles específicos
 * @param {string[]} allowedRoles - Array de roles permitidos
 * @returns {Function} Middleware function
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        msg: 'Usuario no autenticado',
        error: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ 
        msg: 'Permisos insuficientes',
        error: 'INSUFFICIENT_PERMISSIONS',
        required_roles: allowedRoles,
        user_role: req.user.rol
      });
    }

    next();
  };
};

/**
 * Middleware solo para administradores
 */
const requireAdmin = requireRole(['Admin']);

/**
 * Middleware para administradores y encuestadores
 */
const requireAuthenticatedUser = requireRole(['Admin', 'Encuestador']);

module.exports = {
  generateToken,
  verifyToken,
  requireRole,
  requireAdmin,
  requireAuthenticatedUser,
  JWT_SECRET,
  JWT_EXPIRES_IN
};