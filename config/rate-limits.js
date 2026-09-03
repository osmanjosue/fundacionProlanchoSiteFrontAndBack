/**
 * rate-limits.js — Fuente única de los límites de peticiones por ruta.
 *
 * Centraliza los valores (max / ventana / mensaje) que antes estaban dispersos
 * como números mágicos en index.js y en cada archivo de rutas. Ajustar un límite
 * = editar un solo lugar.
 */
const MINUTE = 60 * 1000;

const RATE_LIMITS = {
    global: { max: 100, windowMs: 1 * MINUTE, message: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
    login: { max: 3, windowMs: 1 * MINUTE, message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en un minuto.' },
    email: { max: 5, windowMs: 1 * MINUTE, message: 'Demasiados correos enviados. Intenta de nuevo en un minuto.' },
    chat: { max: 50, windowMs: 5 * MINUTE, message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
    booking: { max: 10, windowMs: 15 * MINUTE, message: 'Demasiadas solicitudes de cita. Intenta de nuevo en unos minutos.' },
    talento: { max: 5, windowMs: 15 * MINUTE, message: 'Demasiadas postulaciones enviadas. Intenta de nuevo más tarde.' },
};

module.exports = { RATE_LIMITS };
