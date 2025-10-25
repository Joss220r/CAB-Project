
const { getConnection } = require('../db');
const sql = require('mssql');

const getPreguntasByEncuesta = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id_encuesta', sql.BigInt, id)
      .query(`
        SELECT 
          p.id_pregunta,
          p.id_encuesta,
          p.texto,
          p.tipo,
          p.orden,
          p.requerida,
          p.descripcion,
          p.condicional,
          p.condicional_pregunta_id,
          cp.nombre as categoria_nombre,
          p.id_categoria_pregunta
        FROM cab.preguntas p
        LEFT JOIN cab.categorias_preguntas cp ON p.id_categoria_pregunta = cp.id_categoria_pregunta
        WHERE p.id_encuesta = @id_encuesta
        ORDER BY p.orden
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const getOpcionesByPregunta = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id_pregunta', sql.BigInt, id)
      .query(`
        SELECT 
          id_opcion,
          id_pregunta,
          etiqueta,
          valor,
          puntos,
          orden,
          condicional,
          condicional_pregunta_id
        FROM cab.preguntas_opciones
        WHERE id_pregunta = @id_pregunta
        ORDER BY orden
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const filterPreguntas = async (req, res) => {
  try {
    const { id_encuesta, id_categoria, tipo, texto } = req.query;
    const pool = await getConnection();
    const request = pool.request();

    let query = `
      SELECT 
        p.id_pregunta,
        p.id_encuesta,
        p.texto,
        p.tipo,
        p.orden,
        p.requerida,
        p.puntaje_maximo,
        cp.nombre as categoria_nombre,
        p.id_categoria_pregunta,
        e.titulo as encuesta_titulo
      FROM cab.preguntas p
      LEFT JOIN cab.categorias_preguntas cp ON p.id_categoria_pregunta = cp.id_categoria_pregunta
      LEFT JOIN cab.encuestas e ON p.id_encuesta = e.id_encuesta
      WHERE 1=1
    `;

    if (id_encuesta) {
      request.input('id_encuesta', sql.BigInt, id_encuesta);
      query += ' AND p.id_encuesta = @id_encuesta';
    }

    if (id_categoria) {
      request.input('id_categoria', sql.TinyInt, id_categoria);
      query += ' AND p.id_categoria_pregunta = @id_categoria';
    }

    if (tipo) {
      request.input('tipo', sql.VarChar(20), tipo);
      query += ' AND p.tipo = @tipo';
    }

    if (texto) {
      request.input('texto', sql.VarChar(300), `%${texto}%`);
      query += ' AND p.texto LIKE @texto';
    }

    query += ' ORDER BY p.id_encuesta, p.orden';

    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  getPreguntasByEncuesta,
  getOpcionesByPregunta,
  filterPreguntas,
};
