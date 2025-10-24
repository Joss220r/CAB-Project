
const { getConnection } = require('../db');
const sql = require('mssql');

const getComunidades = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM cab.comunidades');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

const getComunidadesByMunicipio = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id_municipio', sql.Int, id)
      .query('SELECT * FROM cab.comunidades WHERE id_municipio = @id_municipio');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  getComunidades,
  getComunidadesByMunicipio,
};
