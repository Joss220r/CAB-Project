# Generador de Hashes de Contraseñas - CAB Project

Este directorio contiene herramientas para generar hashes bcrypt seguros para las contraseñas del sistema CAB.

## Archivos

- `generate_password_hash.js` - Script para generar hashes bcrypt
- `DB_CAB_seed.sql` - Datos de prueba con hash real para usuario admin

## Uso del Generador

### Ejecutar el script
```bash
cd database
node generate_password_hash.js
```

### Generar hash personalizado
```bash
node -e "const bcrypt=require('bcryptjs'); console.log(bcrypt.hashSync('TU_CONTRASEÑA',10))"
```

## Contraseñas de Prueba Disponibles

| Contraseña | Uso Recomendado | Hash Generado |
|------------|-----------------|---------------|
| `admin123` | Usuario administrador | `$2b$10$m6M61BhGKEK7LnWP6YU8Re.z2vDyNBebwulE7D7zfiCb/1ButMKvK` |
| `user123` | Usuarios normales | `$2b$10$Hd7Rmop9hkwCruZr86ATMugEbyJM8WJd4lXFHdtaUQ64NN2.gRmFq` |
| `test123` | Pruebas generales | `$2b$10$FQcPu8hssG6.HwWpyfwfReYjhM.gQLZGXek3/MvgkWlwUlqx5OKAe` |
| `password123` | Contraseña común | `$2b$10$kbGZx4fsgCqDcuHe4qx1mOkFmYcHPk9R4M7NXj9jUpvPBH9JFmgqm` |
| `CAB2025!` | Contraseña segura | `$2b$10$eODSobd5PO4I.oo1Ehhgb.eXv3zDkANPQ6KUhEKXEam5I.uq.4tCy` |

## Usuario Admin Configurado

**Email:** `admin@cab.local`  
**Contraseña:** `admin123`  
**Rol:** Admin

### Para hacer login:
```json
{
  "correo": "admin@cab.local",
  "password": "admin123"
}
```

## Instrucciones de Implementación

1. **Ejecutar scripts de base de datos:**
   ```sql
   -- Primero ejecutar la estructura
   sqlcmd -S tu_servidor -d tu_base_datos -i "DB_CAB V4.sql"
   
   -- Luego insertar los datos de prueba
   sqlcmd -S tu_servidor -d tu_base_datos -i "DB_CAB_seed.sql"
   ```

2. **Probar autenticación:**
   - Endpoint: `POST /api/auth/login`
   - Body: `{"correo":"admin@cab.local","password":"admin123"}`
   - Respuesta esperada: `{"token":"jwt_token_aqui"}`

3. **Usar token en requests protegidos:**
   - Header: `Authorization: Bearer jwt_token_aqui`

## Seguridad

- Los hashes se generan con bcrypt y 10 rondas de salt
- Nunca almacenes contraseñas en texto plano
- Cambia las contraseñas por defecto en producción
- El archivo `generate_password_hash.js` puede ejecutarse múltiples veces para generar nuevos hashes

## Notas

- Los hashes bcrypt son únicos en cada ejecución debido al salt aleatorio
- Para producción, usa contraseñas más seguras que las de ejemplo
- El script incluye ejemplos de UPDATE SQL para cambiar hashes existentes