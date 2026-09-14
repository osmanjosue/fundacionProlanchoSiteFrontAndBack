const jwt = require('jsonwebtoken');

/**
 * Genera un JWT para acceso de solo lectura (Magic Link)
 * @param {string} postulacionId - ID de Mongo de la postulación
 * @returns {Promise<string>} Token firmado
 */
const generarMagicLinkToken = (postulacionId) => {
    return new Promise((resolve, reject) => {
        // En el payload incluimos el ID de la postulación (uid)
        // y un flag para identificar que es un magic link
        const payload = {
            uid: postulacionId,
            type: 'magic-link'
        };

        jwt.sign(payload, process.env.MAGIC_LINK_SECRET, {
            expiresIn: '48h' // Expira en 48 horas
        }, (err, token) => {
            if (err) {
                console.error(err);
                reject('No se pudo generar el token del Magic Link');
            } else {
                resolve(token);
            }
        });
    });
};

/**
 * Verifica un token JWT de Magic Link
 * @param {string} token - JWT token
 * @returns {Object} Payload decodificado si es válido, lanza error si no lo es
 */
const verificarMagicLinkToken = (token) => {
    try {
        const payload = jwt.verify(token, process.env.MAGIC_LINK_SECRET);
        
        if (payload.type !== 'magic-link') {
            throw new Error('Tipo de token inválido');
        }

        return payload; // { uid, type, iat, exp }
    } catch (error) {
        throw new Error('Token inválido o expirado');
    }
};

const EXPIRACION_ACCESO = '15m';
const EXPIRACION_SESION = '8h';

/**
 * Genera un token de enlace para el acceso por correo
 * @param {string} email - Correo del lector
 * @returns {Promise<string>} Token firmado
 */
const generarTokenAccesoLector = (email) => {
    return new Promise((resolve, reject) => {
        const payload = { email, type: 'acceso-lector' };
        jwt.sign(payload, process.env.MAGIC_LINK_SECRET, { expiresIn: EXPIRACION_ACCESO }, (err, token) => {
            if (err) {
                console.error(err);
                reject('No se pudo generar el token de acceso');
            } else {
                resolve(token);
            }
        });
    });
};

/**
 * Verifica el token de enlace de correo
 * @param {string} token 
 * @returns {Object} Payload decodificado
 */
const verificarTokenAccesoLector = (token) => {
    try {
        const payload = jwt.verify(token, process.env.MAGIC_LINK_SECRET);
        if (payload.type !== 'acceso-lector') {
            throw new Error('Tipo de token inválido');
        }
        return payload;
    } catch (error) {
        throw new Error('Token de acceso inválido o expirado');
    }
};

/**
 * Genera el token de sesión (para la tabla)
 * @param {string} email - Correo del lector
 * @returns {Promise<string>} Token firmado
 */
const generarTokenSesionLector = (email) => {
    return new Promise((resolve, reject) => {
        const payload = { email, type: 'sesion-lector' };
        jwt.sign(payload, process.env.MAGIC_LINK_SECRET, { expiresIn: EXPIRACION_SESION }, (err, token) => {
            if (err) {
                console.error(err);
                reject('No se pudo generar el token de sesión');
            } else {
                resolve(token);
            }
        });
    });
};

/**
 * Verifica el token de sesión (del header)
 * @param {string} token 
 * @returns {Object} Payload decodificado
 */
const verificarTokenSesionLector = (token) => {
    try {
        const payload = jwt.verify(token, process.env.MAGIC_LINK_SECRET);
        if (payload.type !== 'sesion-lector') {
            throw new Error('Tipo de token inválido');
        }
        return payload;
    } catch (error) {
        throw new Error('Token de sesión inválido o expirado');
    }
};


module.exports = {
    generarMagicLinkToken,
    verificarMagicLinkToken,
    generarTokenAccesoLector,
    verificarTokenAccesoLector,
    generarTokenSesionLector,
    verificarTokenSesionLector
};
