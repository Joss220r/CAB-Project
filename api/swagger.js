
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API de Encuestas CAB',
    version: '1.0.0',
    description: 'Documentación de la API para el sistema de encuestas CAB.',
  },
  servers: [
    {
      url: '/api',
      description: 'Servidor de desarrollo',
    },
  ],
  
  
  components: {
    schemas: {
      Municipio: {
        type: 'object',
        properties: {
          id_municipio: {
            type: 'integer',
            description: 'ID del municipio',
            example: 1
          },
          id_departamento: {
            type: 'integer',
            description: 'ID del departamento al que pertenece',
            example: 2
          },
          nombre: {
            type: 'string',
            description: 'Nombre del municipio',
            example: 'Guastatoya'
          }
        }
      },
      Usuario: {
        type: 'object',
        properties: {
          id_usuario: {
            type: 'integer',
            description: 'ID del usuario',
            example: 1
          },
          nombre: {
            type: 'string',
            description: 'Nombre completo del usuario',
            example: 'Juan Pérez'
          },
          correo: {
            type: 'string',
            description: 'Correo electrónico del usuario',
            example: 'juan.perez@example.com'
          },
          rol: {
            type: 'string',
            description: 'Rol del usuario (Admin, Encuestador)',
            example: 'Encuestador'
          },
          activo: {
            type: 'boolean',
            description: 'Estado del usuario',
            example: true
          }
        }
      },
      OpcionInput: {
        type: 'object',
        properties: {
          etiqueta: { type: 'string', example: 'Casi siempre' },
          valor: { type: 'string', example: 'casi_siempre' },
          puntos: { type: 'integer', example: 75 },
          orden: { type: 'integer', example: 1 }
        }
      },
      PreguntaInput: {
        type: 'object',
        properties: {
          id_categoria_pregunta: { type: 'integer', example: 1 },
          texto: { type: 'string', example: '¿Con qué frecuencia lava sus manos?' },
          tipo: { type: 'string', example: 'OpcionUnica' },
          orden: { type: 'integer', example: 1 },
          opciones: {
            type: 'array',
            items: { $ref: '#/components/schemas/OpcionInput' }
          }
        }
      },
      EncuestaInput: {
        type: 'object',
        properties: {
          titulo: { type: 'string', example: 'Encuesta de Hábitos de Higiene' },
          descripcion: { type: 'string', example: 'Evaluación de hábitos de higiene en la comunidad.' },
          id_grupo_focal: { type: 'integer', example: 1 },
          version: { type: 'string', example: 'v1.1' },
          preguntas: {
            type: 'array',
            items: { $ref: '#/components/schemas/PreguntaInput' }
          }
        }
      },
      RespuestaDetalleInput: {
        type: 'object',
        properties: {
          id_pregunta: { type: 'integer', example: 100 },
          id_opcion: { type: 'integer', description: 'ID de la opción seleccionada (para preguntas de opción)', example: 200 },
          valor_numerico: { type: 'number', description: 'Valor para preguntas numéricas', example: 8 }
        }
      },
      RespuestaInput: {
        type: 'object',
        properties: {
          boleta_num: { type: 'integer', example: 101 },
          id_encuesta: { type: 'integer', example: 1 },
          id_comunidad: { type: 'integer', example: 1 },
          id_usuario: { type: 'integer', example: 1 },
          detalles: {
            type: 'array',
            items: { $ref: '#/components/schemas/RespuestaDetalleInput' }
          }
        }
      }
    }
  }
};

const path = require('path');

const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [path.join(__dirname, 'routes', '**', '*.js')],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
