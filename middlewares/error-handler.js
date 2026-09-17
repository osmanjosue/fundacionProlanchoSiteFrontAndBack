/**
 * error-handler.js — Middleware de error global de Express (4 argumentos).
 * Único lugar donde se loguea y se formatea un error no controlado. Se monta
 * al final de index.js, después de todas las rutas.
 */
const { sendError } = require('../helpers/responses');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    console.log(err);

    // Error de índice único de Mongo (ej. numeroDocumento duplicado)
    if (err.code === 11000) {
        return sendError(res, 400, 'Ya existe un registro con ese valor único');
    }

    // Datos que no pasaron el filtro de express-validator y rompieron en Mongoose:
    // es culpa del cliente (400), no un fallo del servidor.
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return sendError(res, 400, 'Datos inválidos en la petición');
    }

    const status = err.statusCode || 500;
    const msg = err.message || 'Error interno del servidor';
    return sendError(res, status, msg);
};

module.exports = { errorHandler };
