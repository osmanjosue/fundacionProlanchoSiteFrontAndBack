/**
 * talento-lectores.js — Validación de acceso al directorio de talento.
 *
 * Lee la variable de entorno TALENTO_LECTORES una sola vez al inicializarse.
 * IMPORTANTE: Cualquier cambio en la variable TALENTO_LECTORES en el archivo .env
 * requerirá reiniciar el servidor para que tome efecto.
 */

const LECTORES_AUTORIZADOS = (process.env.TALENTO_LECTORES || '')
    .split(',')
    .map((addr) => addr.trim().toLowerCase())
    .filter(Boolean);

/**
 * Comprueba si un correo está en la lista de lectores autorizados.
 *
 * @param {string} email Correo a consultar
 * @returns {boolean} true si tiene acceso, false si no
 */
const tieneAccesoLector = (email) => {
    if (!email) return false;
    const correoNormalizado = String(email).trim().toLowerCase();
    return LECTORES_AUTORIZADOS.includes(correoNormalizado);
};

module.exports = { tieneAccesoLector };
