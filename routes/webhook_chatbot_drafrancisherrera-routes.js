const { Router } = require('express');
const express = require('express');
const { forwardToN8n } = require('../controllers/webhook_chatbot_drafrancisherrera.controllers');
const {
    chatRateLimiter,
    verifyOrigin,
    verifyTurnstile,
    validateChatPayload,
} = require('../middlewares/chat-security.middleware');

const router = Router();

/**
 * Endpoint publico: el widget de chat llama aqui SIN credenciales del navegador.
 * La autenticacion hacia n8n la agrega el controller con N8N_API_KEY (secreto
 * del lado servidor). Como es publico, lo protegemos en capas:
 *
 *   express.json({limit})  -> rechaza cuerpos > 10kb al parsear
 *   chatRateLimiter        -> max. peticiones por IP/minuto
 *   verifyOrigin           -> Origin/Referer debe estar en la allowlist
 *   verifyTurnstile        -> anti-bot (opcional, gated por TURNSTILE_SECRET_KEY)
 *   validateChatPayload    -> valida evento, sesion y largo del mensaje
 *
 * Nota: NO se usa aqui el middleware validar-n8n-api-key.js. Ese valida un
 * header x-api-key entrante y esta pensado para una eventual ruta de callback
 * de n8n HACIA el backend, no para esta ruta publica del navegador.
 */
router.post(
    '/',
    express.json({ limit: '10kb' }),
    chatRateLimiter,
    verifyOrigin,
    verifyTurnstile,
    validateChatPayload,
    forwardToN8n
);

module.exports = router;
