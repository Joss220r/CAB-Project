
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors'); // Aún lo usamos para el manejo de OPTIONS
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { testConnection } = require('./db');

// Import routes
const catalogosRoutes = require('./routes/catalogos.routes');
const debugRoutes = require('./routes/debug.routes');
const comunidadesRoutes = require('./routes/comunidades.routes');
const departamentosRoutes = require('./routes/departamentos.routes');
const encuestasRoutes = require('./routes/encuestas.routes');
const municipiosRoutes = require('./routes/municipios.routes');
const preguntasRoutes = require('./routes/preguntas.routes');
const respuestasRoutes = require('./routes/respuestas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

// Initializations
const app = express();
const port = process.env.PORT || 3000;

// Para Render: escuchar en 0.0.0.0
//const host = process.env.HOST || '0.0.0.0';

// Middlewares
app.use(express.json());

// Middleware
app.use(cors({ origin: '*', methods: 'GET,POST,PUT,DELETE', allowedHeaders: 'Content-Type,Authorization' }));

// API Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.get('/', (req, res) => {
  res.send('API para Encuestas CAB - v1.0');
});

const apiRouter = express.Router();
apiRouter.use(catalogosRoutes);
apiRouter.use(debugRoutes);
apiRouter.use(comunidadesRoutes);
apiRouter.use(departamentosRoutes);
apiRouter.use(encuestasRoutes);
apiRouter.use(municipiosRoutes);
apiRouter.use(preguntasRoutes);
apiRouter.use(respuestasRoutes);
apiRouter.use(usuariosRoutes);

app.use('/api', apiRouter);

// Start server
async function startServer() {
  console.log('🚀 Iniciando servidor CAB API...\n');
  
  // Verificar conexión a la base de datos
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.log('\n⚠️  ADVERTENCIA: El servidor se iniciará sin conexión a la base de datos');
    console.log('   Las rutas que requieren BD no funcionarán correctamente');
    console.log('   Verifica la configuración en el archivo .env\n');
  }
  
  // Iniciar el servidor
  app.listen(port, () => {
    console.log('\n🎉 Servidor CAB API iniciado exitosamente');
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`📚 Documentación: http://localhost:${port}/api-docs`);
    console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    
    if (dbConnected) {
      console.log('🔗 Estado BD: Conectada ✅');
    } else {
      console.log('🔗 Estado BD: Desconectada ❌');
    }
    
    console.log('\n📋 Endpoints disponibles:');
    console.log('   GET  /api/departamentos');
    console.log('   GET  /api/municipios');
    console.log('   GET  /api/comunidades');
    console.log('   POST /api/auth/login');
    console.log('   GET  /api/encuestas (requiere auth)');
    console.log('   POST /api/respuestas (requiere auth)');
    console.log('\n✨ ¡Listo para recibir peticiones!');
  });
}

// Manejar errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Error no manejado:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err.message);
  process.exit(1);
});

startServer();
