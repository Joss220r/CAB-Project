
const { getConnection } = require('../db');
const sql = require('mssql');

const getMunicipios = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query('SELECT * FROM cab.municipios');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};


const getMunicipiosByDepartamento = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id_departamento', sql.Int, id)
      .query('SELECT * FROM cab.municipios WHERE id_departamento = @id_departamento');
    res.json(result.recordset);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

module.exports = {
  getMunicipios,
  getMunicipiosByDepartamento,
};

