
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
      reqDetalle.input('valor_texto', sql.NVarChar, det.valor_texto || null);

      // La consulta ahora funciona porque todas las variables siempre están declaradas.
      await reqDetalle.query(`
        INSERT INTO cab.respuestas_detalle (id_respuesta, id_pregunta, id_opcion, valor_numerico, valor_texto)
        VALUES (@id_respuesta, @id_pregunta, @id_opcion, @valor_numerico, @valor_texto);
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

const getAllRespuestas = async (req, res) => {
  try {
    const pool = await getConnection();

    // Query complejo que une todas las tablas necesarias
    const result = await pool.request().query(`
      SELECT
        r.id_respuesta,
        r.boleta_num,
        r.id_encuesta,
        e.titulo as encuesta_nombre,
        r.id_comunidad,
        c.nombre as comunidad_nombre,
        r.id_usuario,
        u.nombre as usuario_nombre,
        r.fecha_creacion,
        rd.id_pregunta,
        p.texto as pregunta_texto,
        p.tipo as pregunta_tipo,
        p.id_categoria_pregunta,
        cp.nombre as categoria_nombre,
        rd.id_opcion,
        po.etiqueta as opcion_etiqueta,
        po.valor as opcion_valor,
        rd.valor_numerico,
        rd.valor_texto
      FROM cab.respuestas r
      INNER JOIN cab.encuestas e ON r.id_encuesta = e.id_encuesta
      INNER JOIN cab.comunidades c ON r.id_comunidad = c.id_comunidad
      LEFT JOIN cab.usuarios u ON r.id_usuario = u.id_usuario
      INNER JOIN cab.respuestas_detalle rd ON r.id_respuesta = rd.id_respuesta
      INNER JOIN cab.preguntas p ON rd.id_pregunta = p.id_pregunta
      LEFT JOIN cab.categorias_preguntas cp ON p.id_categoria_pregunta = cp.id_categoria_pregunta
      LEFT JOIN cab.preguntas_opciones po ON rd.id_opcion = po.id_opcion
      ORDER BY r.fecha_creacion DESC, r.id_respuesta, rd.id_pregunta
    `);

    // Estructurar los datos para el frontend
    const respuestasMap = {};

    result.recordset.forEach(row => {
      const detalleKey = `${row.id_respuesta}-${row.id_pregunta}`;

      // Determinar el valor de la respuesta según el tipo de pregunta
      let respuestaValor = '';
      if (row.pregunta_tipo === 'SiNo') {
        respuestaValor = row.valor_numerico === 1 ? 'Sí' : row.valor_numerico === 0 ? 'No' : '';
      } else if (row.pregunta_tipo === 'Numerica') {
        respuestaValor = row.valor_numerico !== null ? row.valor_numerico.toString() : '';
      } else if (row.pregunta_tipo === 'Texto' || row.pregunta_tipo === 'Fecha') {
        respuestaValor = row.valor_texto || '';
      } else if (row.id_opcion) {
        respuestaValor = row.opcion_etiqueta || '';
      }

      respuestasMap[detalleKey] = {
        id: detalleKey,
        id_respuesta: row.id_respuesta,
        boleta_num: row.boleta_num,
        encuestaId: row.id_encuesta,
        encuestaNombre: row.encuesta_nombre,
        comunidadId: row.id_comunidad,
        comunidadNombre: row.comunidad_nombre,
        usuarioId: row.id_usuario,
        usuarioNombre: row.usuario_nombre,
        preguntaId: row.id_pregunta,
        pregunta: row.pregunta_texto,
        preguntaTipo: row.pregunta_tipo,
        respuesta: respuestaValor,
        categoria: row.id_categoria_pregunta,
        categoriaNombre: row.categoria_nombre || 'Sin categoría',
        fecha: row.fecha_creacion ? row.fecha_creacion.toISOString().split('T')[0] : null
      };
    });

    const respuestas = Object.values(respuestasMap);

    console.log(`✅ Se encontraron ${respuestas.length} detalles de respuestas`);
    res.json(respuestas);

  } catch (error) {
    console.error('❌ Error obteniendo respuestas:', error);
    res.status(500).json({
      msg: 'Error al obtener las respuestas',
      error: error.message
    });
  }
};

module.exports = {
  createRespuesta,
  generateBoletaNumber,
  getAllRespuestas,
};
