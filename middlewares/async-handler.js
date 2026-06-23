/**
 * async-handler.js — Envuelve un controller asíncrono y reenvía cualquier
 * rechazo de promesa a `next(err)`, para que lo capture el error-handler global.
 * Evita repetir try/catch + console.log + res.status(500) en cada controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { asyncHandler };
