
const sql = require('mssql');

const dbSettings = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true, // for azure
    trustServerCertificate: true, // change to true for local dev / self-signed certs
  },
};

async function getConnection() {
  try {
    const pool = await sql.connect(dbSettings);
    return pool;
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    throw error;
  }
}

// Función para verificar la conexión a la base de datos
async function testConnection() {
  try {
    console.log('🔄 Verificando conexión a la base de datos...');
    const pool = await sql.connect(dbSettings);
    
    // Hacer una consulta simple para verificar que la conexión funciona
    const result = await pool.request().query('SELECT 1 as test');
    
    if (result.recordset && result.recordset.length > 0) {
      console.log('✅ Conexión a la base de datos exitosa');
      console.log(`📊 Servidor: ${dbSettings.server}`);
      console.log(`🗄️  Base de datos: ${dbSettings.database}`);
      console.log(`👤 Usuario: ${dbSettings.user}`);
      return true;
    } else {
      throw new Error('La consulta de prueba no devolvió resultados');
    }
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:');
    console.error(`   Servidor: ${dbSettings.server || 'No configurado'}`);
    console.error(`   Base de datos: ${dbSettings.database || 'No configurado'}`);
    console.error(`   Usuario: ${dbSettings.user || 'No configurado'}`);
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

module.exports = {
  getConnection,
  testConnection,
};
