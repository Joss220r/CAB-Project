
const { getConnection } = require('../db');
const sql = require('mssql');

const getGruposFocales = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM cab.grupos_focales');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const getCategoriasPreguntas = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM cab.categorias_preguntas');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const getSubcategoriasByCategoria = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id_categoria', sql.TinyInt, id)
      .query('SELECT * FROM cab.subcategorias_preguntas WHERE id_categoria_pregunta = @id_categoria');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  getGruposFocales,
  getCategoriasPreguntas,
  getSubcategoriasByCategoria,
};
