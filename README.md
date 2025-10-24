# CAB Project - API de Encuestas

API REST para el sistema de encuestas CAB (Centro Agrícola Bautista).

## 📋 Descripción

Esta API permite gestionar encuestas, usuarios, respuestas y catálogos relacionados con el sistema CAB.

## 🚀 Tecnologías

- Node.js (>=18.0.0)
- Express 5.x
- SQL Server (MSSQL)
- JWT para autenticación
- Swagger para documentación de API

## 📦 Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/Joss220r/CAB-Project.git
cd CAB-Project/api

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor
npm start
```

## 🌐 Despliegue en Render

### Opción 1: Usando render.yaml (Recomendado)

1. Crear cuenta en [Render](https://render.com)
2. Conectar tu repositorio de GitHub
3. Render detectará automáticamente el archivo `render.yaml`
4. Configurar las variables de entorno en el dashboard:
   - `DB_SERVER`: Servidor de SQL Server
   - `DB_USER`: Usuario de base de datos
   - `DB_PASSWORD`: Contraseña de base de datos
   - `DB_DATABASE`: Nombre de la base de datos (DB_CAB)
   - `JWT_SECRET`: Se generará automáticamente

### Opción 2: Configuración Manual

1. En Render Dashboard, hacer clic en "New +"
2. Seleccionar "Web Service"
3. Conectar repositorio de GitHub
4. Configurar:
   - **Name**: cab-api
   - **Region**: Oregon (o tu preferencia)
   - **Branch**: main
   - **Root Directory**: (dejar vacío)
   - **Runtime**: Node
   - **Build Command**: `cd api && npm install`
   - **Start Command**: `cd api && npm start`
5. Agregar variables de entorno (Environment Variables):
   ```
   NODE_ENV=production
   PORT=10000
   DB_SERVER=tu-servidor.database.windows.net
   DB_PORT=1433
   DB_USER=tu-usuario
   DB_PASSWORD=tu-contraseña
   DB_DATABASE=DB_CAB
   JWT_SECRET=genera-una-clave-secreta-aqui
   ```
6. Click en "Create Web Service"

## 🔒 Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `DB_SERVER` | Servidor SQL Server | `localhost` o `server.database.windows.net` |
| `DB_PORT` | Puerto de SQL Server | `1433` |
| `DB_USER` | Usuario de base de datos | `sa` |
| `DB_PASSWORD` | Contraseña de base de datos | `tu-password` |
| `DB_DATABASE` | Nombre de base de datos | `DB_CAB` |
| `JWT_SECRET` | Secreto para JWT | `clave-segura-aleatoria` |

## 📚 Documentación API

Una vez desplegado, la documentación Swagger estará disponible en:
- Local: `http://localhost:3000/api-docs`
- Producción: `https://tu-app.onrender.com/api-docs`

## 🔑 Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil (requiere auth)
- `PUT /api/auth/change-password` - Cambiar contraseña (requiere auth)

### Catálogos
- `GET /api/departamentos` - Lista de departamentos
- `GET /api/municipios` - Lista de municipios
- `GET /api/comunidades` - Lista de comunidades
- `GET /api/grupos-focales` - Lista de grupos focales

### Encuestas (requiere autenticación)
- `GET /api/encuestas` - Lista de encuestas
- `GET /api/encuestas/:id` - Detalle de encuesta
- `POST /api/encuestas` - Crear encuesta (solo Admin)
- `PUT /api/encuestas/:id/estado` - Actualizar estado (solo Admin)

### Respuestas (requiere autenticación)
- `POST /api/respuestas` - Guardar respuestas de encuesta
- `GET /api/respuestas/generar-boleta` - Generar número de boleta

### Usuarios (solo Admin)
- `GET /api/usuarios` - Lista de usuarios
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario

## 🛠️ Solución de Problemas

### Error de conexión a base de datos
- Verificar que las variables de entorno estén configuradas correctamente
- Asegurar que el servidor SQL Server permita conexiones externas
- Verificar firewall y reglas de seguridad
- En Azure SQL, agregar la IP de Render a la whitelist

### Error de autenticación JWT
- Verificar que `JWT_SECRET` esté configurado
- Los tokens expiran en 12 horas por defecto

### El servidor no inicia en Render
- Verificar logs en Render Dashboard
- Asegurar que todas las variables de entorno estén configuradas
- Verificar que el comando de inicio sea correcto: `cd api && npm start`

## 👥 Contribuir

1. Fork del proyecto
2. Crear branch para feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

ISC

## 📞 Contacto

Para soporte o preguntas, contactar al equipo de desarrollo.
