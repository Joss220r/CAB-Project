
const { getConnection } = require('../db');
const sql = require('mssql');

const createRespuesta = async (req, res) => {
  const { boleta_num, id_encuesta, id_comunidad, detalles, respuestas, metadata } = req.body;

  // Aceptar tanto 'detalles' como 'respuestas' para compatibilidad
  const datosRespuestas = detalles || respuestas;

  if (!boleta_num || !id_encuesta || !id_comunidad || !datosRespuestas || !Array.isArray(datosRespuestas)) {
    return res.status(400).json({ msg: 'Faltan datos requeridos. Se necesita: boleta_num, id_encuesta, id_comunidad y un array de respuestas/detalles.' });
  }

  // Tomar el usuario autenticado del token si existe, sino usar un valor por defecto
  // Esto permite que tanto usuarios autenticados como no autenticados puedan enviar respuestas
  const id_usuario = req.user?.id_usuario || null;

  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Insertar el encabezado de la respuesta
    const respuestaResult = await new sql.Request(transaction)
      .input('boleta_num', sql.BigInt, boleta_num)
      .input('id_encuesta', sql.BigInt, id_encuesta)
      .input('id_comunidad', sql.Int, id_comunidad)
      .input('id_usuario', sql.BigInt, id_usuario)
      .query('INSERT INTO cab.respuestas (boleta_num, id_encuesta, id_comunidad, id_usuario) VALUES (@boleta_num, @id_encuesta, @id_comunidad, @id_usuario); SELECT SCOPE_IDENTITY() as id_respuesta;');
    
    const id_respuesta = respuestaResult.recordset[0].id_respuesta;

    // 2. Iterar e insertar cada detalle de la respuesta
    for (const det of datosRespuestas) {
      const reqDetalle = new sql.Request(transaction);
      reqDetalle.input('id_respuesta', sql.BigInt, id_respuesta);
      reqDetalle.input('id_pregunta', sql.BigInt, det.id_pregunta);
      
      // Declarar siempre las variables, pasando el valor o NULL
      reqDetalle.input('id_opcion', sql.BigInt, det.id_opcion || null);
      reqDetalle.input('valor_numerico', sql.Decimal(10, 2), det.valor_numerico || null);

      // La consulta ahora funciona porque todas las variables siempre están declaradas.
      await reqDetalle.query(`
        INSERT INTO cab.respuestas_detalle (id_respuesta, id_pregunta, id_opcion, valor_numerico)
        VALUES (@id_respuesta, @id_pregunta, @id_opcion, @valor_numerico);
      `);
    }

    await transaction.commit();
    res.status(201).json({ id_respuesta, msg: 'Respuesta guardada exitosamente.' });

  } catch (err) {
    await transaction.rollback();
    console.error("Error en transacción:", err);

    if (err.originalError) {
      res.status(500).send(`Error de base de datos: ${err.originalError.message}`);
    } else {
      res.status(500).send(`Error en la transacción: ${err.message}`);
    }
  }
};

const generateBoletaNumber = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT ISNULL(MAX(boleta_num), 0) + 1 as boleta_num 
      FROM cab.respuestas
    `);
    res.json({ boleta_num: result.recordset[0].boleta_num });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  createRespuesta,
  generateBoletaNumber,
};
