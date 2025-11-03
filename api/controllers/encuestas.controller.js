
const { getConnection } = require('../db');
const sql = require('mssql');

const createEncuesta = async (req, res) => {
  const { titulo, descripcion, id_grupo_focal, version, preguntas } = req.body;

  if (!titulo || !version || !id_grupo_focal || !preguntas || !Array.isArray(preguntas) || preguntas.length === 0) {
    return res.status(400).json({ msg: 'Faltan datos requeridos. Se necesita: titulo, version, id_grupo_focal y un array de preguntas.' });
  }

  let pool;
  let transaction;

  try {
    pool = await getConnection();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    // 1. Insertar la encuesta principal
    const encuestaResult = await new sql.Request(transaction)
      .input('titulo', sql.VarChar, titulo)
      .input('descripcion', sql.VarChar, descripcion || null)
      .input('id_grupo_focal', sql.TinyInt, id_grupo_focal)
      .input('version', sql.VarChar, version)
      .query('INSERT INTO cab.encuestas (titulo, descripcion, id_grupo_focal, version, estado) VALUES (@titulo, @descripcion, @id_grupo_focal, @version, \'Inactiva\'); SELECT SCOPE_IDENTITY() as id_encuesta;');
    
    const id_encuesta = encuestaResult.recordset[0].id_encuesta;

    // 2. Iterar e insertar cada pregunta
    for (const preg of preguntas) {
      const preguntaResult = await new sql.Request(transaction)
        .input('id_encuesta', sql.BigInt, id_encuesta)
        .input('id_categoria_pregunta', sql.TinyInt, preg.id_categoria_pregunta)
        .input('texto', sql.VarChar, preg.texto)
        .input('tipo', sql.VarChar, preg.tipo)
        .input('orden', sql.Int, preg.orden)
        .query('INSERT INTO cab.preguntas (id_encuesta, id_categoria_pregunta, texto, tipo, orden) VALUES (@id_encuesta, @id_categoria_pregunta, @texto, @tipo, @orden); SELECT SCOPE_IDENTITY() as id_pregunta;');
      
      const id_pregunta = preguntaResult.recordset[0].id_pregunta;

      // 3. Si hay opciones, iterar e insertarlas
      if (preg.opciones && Array.isArray(preg.opciones)) {
        for (const opt of preg.opciones) {
          await new sql.Request(transaction)
            .input('id_pregunta', sql.BigInt, id_pregunta)
            .input('etiqueta', sql.VarChar, opt.etiqueta)
            .input('valor', sql.VarChar, opt.valor)
            .input('puntos', sql.Int, opt.puntos || 0)
            .input('orden', sql.Int, opt.orden)
            .input('condicional', sql.Bit, opt.condicional || 0)
            .input('condicional_pregunta_id', sql.BigInt, opt.condicional_pregunta_id || null)
            .query('INSERT INTO cab.preguntas_opciones (id_pregunta, etiqueta, valor, puntos, orden, condicional, condicional_pregunta_id) VALUES (@id_pregunta, @etiqueta, @valor, @puntos, @orden, @condicional, @condicional_pregunta_id);');
        }
      }
    }

    await transaction.commit();
    res.status(201).json({ id_encuesta, msg: 'Encuesta creada exitosamente con todas sus preguntas y opciones.' });

  } catch (err) {
    console.error('Error al crear encuesta:', err);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Error al hacer rollback:', rollbackErr);
      }
    }
    res.status(500).json({ msg: 'Error al crear encuesta', error: err.message });
  }
};


const getEncuestas = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        e.id_encuesta,
        e.titulo,
        e.descripcion,
        e.version,
        e.estado,
        e.id_grupo_focal,
        gf.nombre as grupo_focal,
        COUNT(p.id_pregunta) as numero_preguntas
      FROM cab.encuestas e
      LEFT JOIN cab.grupos_focales gf ON e.id_grupo_focal = gf.id_grupo_focal
      LEFT JOIN cab.preguntas p ON e.id_encuesta = p.id_encuesta
      GROUP BY 
        e.id_encuesta, e.titulo, e.descripcion, e.version, e.estado, e.id_grupo_focal, gf.nombre
      ORDER BY e.id_encuesta DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener encuestas:', error);
    res.status(500).json({ msg: 'Error al obtener encuestas', error: error.message });
  }
};


const getEncuestaById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[getEncuestaById] Iniciando con ID:', id);

    const pool = await getConnection();
    console.log('[getEncuestaById] Conexión a BD obtenida');

    // 1. Obtener datos de la encuesta
    console.log('[getEncuestaById] Consultando datos de encuesta...');
    const encuestaResult = await pool.request()
      .input('id', sql.BigInt, id)
      .query(`
        SELECT
          e.id_encuesta,
          e.titulo,
          e.descripcion,
          e.version,
          e.estado,
          e.vigente_desde,
          e.vigente_hasta,
          e.id_grupo_focal,
          gf.nombre as grupo_focal
        FROM cab.encuestas e
        LEFT JOIN cab.grupos_focales gf ON e.id_grupo_focal = gf.id_grupo_focal
        WHERE e.id_encuesta = @id
      `);

    console.log('[getEncuestaById] Encuesta encontrada:', encuestaResult.recordset.length > 0);

    if (encuestaResult.recordset.length === 0) {
      console.log('[getEncuestaById] Encuesta no encontrada');
      return res.status(404).json({ msg: 'Encuesta no encontrada.' });
    }

    const encuesta = encuestaResult.recordset[0];

    // 2. Obtener preguntas de la encuesta
    console.log('[getEncuestaById] Consultando preguntas...');
    const preguntasResult = await pool.request()
      .input('id_encuesta', sql.BigInt, id)
      .query(`
        SELECT
          p.id_pregunta,
          p.id_encuesta,
          p.texto,
          p.tipo,
          p.orden,
          p.requerida,
          p.puntaje_maximo,
          p.id_categoria_pregunta,
          cp.nombre as categoria_nombre
        FROM cab.preguntas p
        LEFT JOIN cab.categorias_preguntas cp ON p.id_categoria_pregunta = cp.id_categoria_pregunta
        WHERE p.id_encuesta = @id_encuesta
        ORDER BY p.orden
      `);

    console.log('[getEncuestaById] Preguntas encontradas:', preguntasResult.recordset.length);

    // 3. Obtener opciones de todas las preguntas
    console.log('[getEncuestaById] Consultando opciones...');
    const opcionesResult = await pool.request()
      .input('id_encuesta', sql.BigInt, id)
      .query(`
        SELECT
          po.id_opcion,
          po.id_pregunta,
          po.etiqueta,
          po.valor,
          po.puntos,
          po.orden,
          po.condicional,
          po.condicional_pregunta_id
        FROM cab.preguntas_opciones po
        INNER JOIN cab.preguntas p ON po.id_pregunta = p.id_pregunta
        WHERE p.id_encuesta = @id_encuesta
        ORDER BY po.id_pregunta, po.orden
      `);

    console.log('[getEncuestaById] Opciones encontradas:', opcionesResult.recordset.length);

    // 4. Construir el objeto con preguntas y opciones anidadas
    console.log('[getEncuestaById] Construyendo objeto de respuesta...');
    encuesta.preguntas = preguntasResult.recordset.map(pregunta => {
      // Filtrar las opciones que pertenecen a esta pregunta
      const opcionesDePregunta = opcionesResult.recordset.filter(
        op => op.id_pregunta === pregunta.id_pregunta
      );

      return {
        ...pregunta,
        opciones: opcionesDePregunta
      };
    });

    console.log('[getEncuestaById] Enviando respuesta exitosa');
    res.json(encuesta);
  } catch (error) {
    console.error('[getEncuestaById] ERROR:', error);
    console.error('[getEncuestaById] Stack:', error.stack);
    console.error('[getEncuestaById] Detalles:', {
      message: error.message,
      code: error.code,
      number: error.number,
      state: error.state,
      class: error.class,
      serverName: error.serverName,
      procName: error.procName,
      lineNumber: error.lineNumber
    });
    res.status(500).json({ msg: 'Error al obtener encuesta', error: error.message });
  }
};


const updateEncuestaEstado = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado || (estado !== 'Activa' && estado !== 'Inactiva')) {
    return res.status(400).json({ msg: "El campo 'estado' es requerido y debe ser 'Activa' o 'Inactiva'." });
  }

  try {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.BigInt, id)
      .input('estado', sql.VarChar, estado)
      .query('UPDATE cab.encuestas SET estado = @estado WHERE id_encuesta = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ msg: 'Encuesta no encontrada.' });
    }

    res.json({ id, estado, msg: 'Estado actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar estado de encuesta:', error);
    res.status(500).json({ msg: 'Error al actualizar estado', error: error.message });
  }
};

const getEncuestasActivas = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT
        e.id_encuesta,
        e.titulo,
        e.descripcion,
        e.version,
        e.estado,
        e.vigente_desde,
        e.vigente_hasta,
        e.id_grupo_focal,
        gf.nombre as grupo_focal,
        (
          SELECT COUNT(*)
          FROM cab.preguntas p
          WHERE p.id_encuesta = e.id_encuesta
        ) as preguntas_count
      FROM cab.encuestas e
      LEFT JOIN cab.grupos_focales gf ON e.id_grupo_focal = gf.id_grupo_focal
      WHERE e.estado = 'Activa'
      ORDER BY e.id_encuesta DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error al obtener encuestas activas:', error);
    res.status(500).json({ msg: 'Error al obtener encuestas activas', error: error.message });
  }
};

module.exports = {
  createEncuesta,
  getEncuestas,
  getEncuestaById,
  updateEncuestaEstado,
  getEncuestasActivas,
};



