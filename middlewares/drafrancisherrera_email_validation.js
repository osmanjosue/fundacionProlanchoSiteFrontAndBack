/**
 * drafrancisherrera_email_validation.js — Valida el payload del formulario de
 * contacto del sitio drafrancisherrera.com ANTES de enviar el correo.
 *
 * Reutiliza helpers/validators.js (misma fuente que el frontend) para que las
 * reglas coincidan. Espejo de booking-validation.middleware.js:
 *   { ok:false, field, msg } con status 400 ante cualquier campo inválido.
 */
const {
    validateMinLength,
    validatePhone,
    validateEmail,
    validateRequired,
    optional,
} = require('../helpers/validators');

const MAX_BODY_BYTES = 5 * 1024;
const MAX_MESSAGE_LENGTH = 2000;

const validateContactPayload = (req, res, next) => {
    const length = Number(req.get('content-length') || 0);
    if (length > MAX_BODY_BYTES) {
        return res.status(413).json({ ok: false, msg: 'Cuerpo demasiado grande.' });
    }

    const { name, phone, email, message } = req.body || {};

    const nameErr = validateMinLength(name, 3);
    if (nameErr) return res.status(400).json({ ok: false, field: 'name', msg: nameErr });

    const phoneErr = validatePhone(phone);
    if (phoneErr) return res.status(400).json({ ok: false, field: 'phone', msg: phoneErr });

    const emailErr = optional(validateEmail)(email);
    if (emailErr) return res.status(400).json({ ok: false, field: 'email', msg: emailErr });

    const messageErr = validateRequired(message, 'Mensaje');
    if (messageErr) return res.status(400).json({ ok: false, field: 'message', msg: messageErr });

    if (typeof message === 'string' && message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ ok: false, field: 'message', msg: 'Mensaje demasiado largo.' });
    }

    return next();
};

module.exports = { validateContactPayload };
