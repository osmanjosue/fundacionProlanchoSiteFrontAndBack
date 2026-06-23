/**
 * error-handler.js — Middleware de error global de Express (4 argumentos).
 * Único lugar donde se loguea y se formatea un error no controlado. Se monta
 * al final de index.js, después de todas las rutas.
 */
const { sendError } = require('../helpers/responses');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    console.log(err);
    const status = err.statusCode || 500;
    const msg = err.message || 'Error interno del servidor';
    return sendError(res, status, msg);
};

module.exports = { errorHandler };
