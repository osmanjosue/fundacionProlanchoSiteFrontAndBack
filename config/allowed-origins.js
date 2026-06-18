/**
 * allowed-origins.js — Fuente única de verdad de los orígenes permitidos.
 *
 * Se usa en dos lugares:
 *   1) La configuración de CORS (index.js) — controla qué dominios pueden
 *      llamar al backend desde el NAVEGADOR.
 *   2) El middleware verifyOrigin del chat — verifica el header Origin/Referer
 *      del lado servidor como defensa en profundidad.
 *
 * Tener la lista en un solo lugar evita que CORS y la verificación de origen
 * se desincronicen.
 */
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://drafrancisherrera.com',
    'https://www.drafrancisherrera.com',
    'https://fundacionprolancho.org',
    'https://www.fundacionprolancho.org',
];

module.exports = { ALLOWED_ORIGINS };
