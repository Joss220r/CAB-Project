
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

module.exports = {
  getPreguntasByEncuesta,
  getOpcionesByPregunta,
};
