const bcrypt = require('bcryptjs');

/**
 * Script para generar hashes de contraseñas usando bcrypt
 * Útil para crear datos de prueba con contraseñas seguras
 */

// Configuración
const SALT_ROUNDS = 10; // Número de rondas de salt (10 es estándar)

// Contraseñas de ejemplo para generar hashes
const passwords = [
    'admin123',      // Para usuario admin
    'user123',       // Para usuarios normales
    'test123',       // Para pruebas
    'password123',   // Contraseña común
    'CAB2025!'       // Contraseña más segura
];

console.log('=== GENERADOR DE HASHES DE CONTRASEÑAS ===\n');
console.log('Generando hashes bcrypt con', SALT_ROUNDS, 'rondas de salt...\n');

// Generar hashes para cada contraseña
passwords.forEach((password, index) => {
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    console.log(`${index + 1}. Contraseña: "${password}"`);
    console.log(`   Hash: ${hash}`);
    console.log('');
});

console.log('=== INSTRUCCIONES DE USO ===');
console.log('1. Copia el hash de la contraseña que desees usar');
console.log('2. Reemplaza el valor de pass_hash en DB_CAB_seed.sql');
console.log('3. Ejecuta el script SQL para insertar los datos');
console.log('4. Usa la contraseña original para hacer login en la API\n');

console.log('=== EJEMPLO PARA USUARIO ADMIN ===');
const adminPassword = 'admin123';
const adminHash = bcrypt.hashSync(adminPassword, SALT_ROUNDS);
console.log(`UPDATE cab.usuarios SET pass_hash = '${adminHash}' WHERE correo = 'admin@cab.local';`);
console.log(`-- Luego usa: {"correo":"admin@cab.local","password":"${adminPassword}"} para login\n`);

console.log('=== GENERAR HASH PERSONALIZADO ===');
console.log('Para generar un hash de una contraseña específica, ejecuta:');
console.log('node -e "const bcrypt=require(\'bcryptjs\'); console.log(bcrypt.hashSync(\'TU_CONTRASEÑA\',10))"');