/**
 * chat-security.middleware.js — Capa de seguridad de la ruta publica del chat.
 *
 * La ruta del chat es publica (el widget la llama sin login). CORS solo frena
 * a otros sitios en el NAVEGADOR; no detiene a un script con curl/Postman. Por
 * eso estos middlewares anaden las barreras que CORS no cubre:
 *
 *   1) chatRateLimiter   - limita peticiones por IP (anti-abuso / costo de IA)
 *   2) verifyOrigin      - verifica Origin/Referer del lado servidor
 *   3) verifyTurnstile   - anti-bot (Cloudflare Turnstile), opcional por env
 *   4) validateChatPayload - valida la forma y el tamano del cuerpo
 *
 * Se aplican en ese orden en el router del chat.
 */

const { ALLOWED_ORIGINS } = require('../config/allowed-origins');
const { createRateLimiter } = require('./rate-limiter');
const { RATE_LIMITS } = require('../config/rate-limits');

// Eventos validos: deben coincidir con el contrato del frontend (chatCore.ts).
const VALID_EVENTS = ['session_start', 'message', 'escalation_request'];
const MAX_MESSAGE_LENGTH = 2000;   // caracteres
const MAX_BODY_BYTES = 10 * 1024;  // 10 KB

/**
 * 1) Rate limiting: max. 50 peticiones por IP cada 5 minutos.
 * Frena la inundacion del endpoint y, sobre todo, evita una factura de IA
 * disparada (cada mensaje implica una llamada al modelo). El limite es holgado
 * para un humano (una persona no escribe 50 mensajes en 5 min) pero corta bots.
 */
const chatRateLimiter = createRateLimiter(RATE_LIMITS.chat.max, RATE_LIMITS.chat.windowMs, RATE_LIMITS.chat.message);

/**
 * 2) Verificacion de origen del lado servidor (defensa en profundidad).
 * Es falsificable por un cliente que no sea navegador, pero suma una barrera
 * y bloquea llamadas con Origin de dominios no permitidos.
 */
const verifyOrigin = (req, res, next) => {
    const origin = req.get('origin');
    const referer = req.get('referer');

    if (origin && ALLOWED_ORIGINS.includes(origin)) return next();
    if (referer && ALLOWED_ORIGINS.some((o) => referer.startsWith(o))) return next();

    return res.status(403).json({ ok: false, msg: 'Origen no permitido.' });
};

/**
 * 3) Anti-bot con Cloudflare Turnstile. OPCIONAL: si no hay TURNSTILE_SECRET_KEY
 * configurada, el middleware se omite (queda inerte hasta que se active).
 * El frontend envia el token en el header 'cf-turnstile-response'.
 */
const verifyTurnstile = async (req, res, next) => {
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) return next(); // no configurado todavia -> no se exige

    const token = req.get('cf-turnstile-response') || (req.body && req.body.turnstileToken);
    if (!token) {
        return res.status(403).json({ ok: false, msg: 'Falta verificacion anti-bot.' });
    }

    try {
        const params = new URLSearchParams();
        params.append('secret', secret);
        params.append('response', token);
        if (req.ip) params.append('remoteip', req.ip);

        const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
        });
        const outcome = await verify.json();

        if (!outcome.success) {
            return res.status(403).json({ ok: false, msg: 'Verificacion anti-bot fallida.' });
        }
        return next();
    } catch (e) {
        console.log('Turnstile error:', e);
        return res.status(502).json({ ok: false, msg: 'No se pudo verificar anti-bot.' });
    }
};

/**
 * 4) Validacion del payload: rechaza cuerpos enormes, eventos desconocidos y
 * mensajes demasiado largos ANTES de reenviar a n8n.
 */
const validateChatPayload = (req, res, next) => {
    const length = Number(req.get('content-length') || 0);
    if (length > MAX_BODY_BYTES) {
        return res.status(413).json({ ok: false, msg: 'Cuerpo demasiado grande.' });
    }

    const body = req.body || {};

    if (!VALID_EVENTS.includes(body.event)) {
        return res.status(400).json({ ok: false, msg: 'Evento invalido.' });
    }
    if (!body.session || typeof body.session.id !== 'string') {
        return res.status(400).json({ ok: false, msg: 'Sesion invalida.' });
    }
    if (body.message !== undefined) {
        if (typeof body.message.text !== 'string') {
            return res.status(400).json({ ok: false, msg: 'Mensaje invalido.' });
        }
        if (body.message.text.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({ ok: false, msg: 'Mensaje demasiado largo.' });
        }
    }

    return next();
};

module.exports = {
    chatRateLimiter,
    verifyOrigin,
    verifyTurnstile,
    validateChatPayload,
    VALID_EVENTS,
    MAX_MESSAGE_LENGTH,
    MAX_BODY_BYTES,
};
