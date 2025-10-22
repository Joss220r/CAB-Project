
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors'); // Aún lo usamos para el manejo de OPTIONS
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

// Import routes
const catalogosRoutes = require('./routes/catalogos.routes');
const debugRoutes = require('./routes/debug.routes');
const comunidadesRoutes = require('./routes/comunidades.routes');
const departamentosRoutes = require('./routes/departamentos.routes');
const encuestasRoutes = require('./routes/encuestas.routes');
const municipiosRoutes = require('./routes/municipios.routes');
const respuestasRoutes = require('./routes/respuestas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');

// Initializations
const app = express();
const port = process.env.PORT || 3000;

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
apiRouter.use(respuestasRoutes);
apiRouter.use(usuariosRoutes);

app.use('/api', apiRouter);

// Start server
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
