/**
 * responses.js — Formato único de las respuestas JSON de la API.
 *
 * Centraliza la forma del contrato para no repetir `{ ok: true/false, ... }`
 * en cada controller. Reproduce exactamente las formas históricas:
 *   éxito  -> { ok: true,  ...payload }
 *   error  -> { ok: false, msg, ...extra }
 */
const { response } = require('express');

const sendOk = (res = response, payload = {}, status = 200) => {
    return res.status(status).json({ ok: true, ...payload });
};

const sendError = (res = response, status = 500, msg = 'Error interno del servidor', extra = {}) => {
    return res.status(status).json({ ok: false, msg, ...extra });
};

module.exports = { sendOk, sendError };
