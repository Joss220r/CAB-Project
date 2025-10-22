
const { Router } = require('express');
const { getConnection } = require('../db');
const sql = require('mssql');

const router = Router();

router.post('/debug-respuesta', async (req, res) => {
  let pool;
  try {
    pool = await getConnection();

    // Intenta insertar un único detalle con datos fijos
    // Asegúrate de que id_respuesta=1, id_pregunta=5, id_opcion=22 existan
    await pool.request()
      .input('id_respuesta', sql.BigInt, 1)
      .input('id_pregunta', sql.BigInt, 5)
      .input('id_opcion', sql.BigInt, 22)
      .input('valor_numerico', sql.Decimal(10, 2), null)
      .query(`
        INSERT INTO cab.respuestas_detalle (id_respuesta, id_pregunta, id_opcion, valor_numerico)
        VALUES (@id_respuesta, @id_pregunta, @id_opcion, @valor_numerico);
      `);

    res.status(200).send("La inserción de depuración simple fue exitosa.");

  } catch (err) {
    res.status(500).json({
      message: "La inserción de depuración falló. Error real abajo.",
      errorName: err.name,
      errorMessage: err.message,
      errorCode: err.code,
      originalError: err.originalError
    });
  }
});

module.exports = router;
