
const { getConnection } = require('../db');
const sql = require('mssql');

const createEncuesta = async (req, res) => {
  const { titulo, descripcion, id_grupo_focal, version, preguntas } = req.body;

  if (!titulo || !version || !id_grupo_focal || !preguntas || !Array.isArray(preguntas) || preguntas.length === 0) {
    return res.status(400).json({ msg: 'Faltan datos requeridos. Se necesita: titulo, version, id_grupo_focal y un array de preguntas.' });
  }

  const pool = await getConnection();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Insertar la encuesta principal
    const encuestaResult = await new sql.Request(transaction)
      .input('titulo', sql.VarChar, titulo)
      .input('descripcion', sql.VarChar, descripcion)
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
            .input('puntos', sql.Int, opt.puntos)
            .input('orden', sql.Int, opt.orden)
            .input('condicional', sql.Bit, opt.condicional || 0)
            .input('condicional_pregunta_id', sql.BigInt, opt.condicional_pregunta_id)
            .query('INSERT INTO cab.preguntas_opciones (id_pregunta, etiqueta, valor, puntos, orden, condicional, condicional_pregunta_id) VALUES (@id_pregunta, @etiqueta, @valor, @puntos, @orden, @condicional, @condicional_pregunta_id);');
        }
      }
    }

    await transaction.commit();
    res.status(201).json({ id_encuesta, msg: 'Encuesta creada exitosamente con todas sus preguntas y opciones.' });

  } catch (err) {
    await transaction.rollback();
    res.status(500).send(err.message);
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
        gf.nombre as grupo_focal,
        COUNT(p.id_pregunta) as numero_preguntas
      FROM cab.encuestas e
      LEFT JOIN cab.grupos_focales gf ON e.id_grupo_focal = gf.id_grupo_focal
      LEFT JOIN cab.preguntas p ON e.id_encuesta = p.id_encuesta
      GROUP BY 
        e.id_encuesta, e.titulo, e.descripcion, e.version, e.estado, gf.nombre
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};


const getEncuestaById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request().input('id', sql.BigInt, id).query(`
      SELECT 
        e.id_encuesta,
        e.titulo,
        e.descripcion,
        e.version,
        e.estado,
        (SELECT nombre FROM cab.grupos_focales WHERE id_grupo_focal = e.id_grupo_focal) as grupo_focal,
        (
          SELECT
            p.id_pregunta,
            p.texto,
            p.tipo,
            p.orden,
            (SELECT nombre FROM cab.categorias_preguntas WHERE id_categoria_pregunta = p.id_categoria_pregunta) as categoria,
            (
              SELECT
                po.id_opcion,
                po.etiqueta,
                po.valor,
                po.puntos,
                po.orden
              FROM cab.preguntas_opciones po
              WHERE po.id_pregunta = p.id_pregunta
              ORDER BY po.orden
              FOR JSON PATH
            ) as opciones
          FROM cab.preguntas p
          WHERE p.id_encuesta = e.id_encuesta
          ORDER BY p.orden
          FOR JSON PATH
        ) as preguntas
      FROM cab.encuestas e
      WHERE e.id_encuesta = @id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ msg: 'Encuesta no encontrada.' });
    }

    // Parsear los strings JSON anidados (si es necesario)
    const encuesta = result.recordset[0];
    if (encuesta.preguntas && typeof encuesta.preguntas === 'string') {
      encuesta.preguntas = JSON.parse(encuesta.preguntas);
    }

    if (encuesta.preguntas && Array.isArray(encuesta.preguntas)) {
      encuesta.preguntas.forEach(p => {
        if (p.opciones && typeof p.opciones === 'string') {
          p.opciones = JSON.parse(p.opciones);
        }
      });
    }

    res.json(encuesta);
  } catch (error) {
    res.status(500).send(error.message);
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

    res.json({ id, estado });
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  createEncuesta,
  getEncuestas,
  getEncuestaById,
  updateEncuestaEstado,
};



