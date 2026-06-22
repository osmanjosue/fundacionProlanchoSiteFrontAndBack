const {
    validateMinLength,
    validatePhone,
    validateEmail,
    validateFutureDate,
    validateFutureDateTime,
    validateRequired,
    optional,
} = require('../helpers/validators');

const VALID_TIPOS = ['Presencial', 'Online'];
const MAX_BODY_BYTES = 5 * 1024;
const MAX_MOTIVO_LENGTH = 1000;

// Reglas de agendamiento (deben coincidir con BOOKING_RULES del frontend).
const MIN_LEAD_HOURS = 2;
const TZ_OFFSET = '-06:00'; // Honduras (UTC-6, sin horario de verano)

const validateBookingPayload = (req, res, next) => {
    const length = Number(req.get('content-length') || 0);
    if (length > MAX_BODY_BYTES) {
        return res.status(413).json({ ok: false, msg: 'Cuerpo demasiado grande.' });
    }

    const { nombre, telefono, email, fecha, hora, tipo, motivo } = req.body || {};

    const nombreErr = validateMinLength(nombre, 3);
    if (nombreErr) return res.status(400).json({ ok: false, field: 'nombre', msg: nombreErr });

    const telefonoErr = validatePhone(telefono);
    if (telefonoErr) return res.status(400).json({ ok: false, field: 'telefono', msg: telefonoErr });

    const emailErr = optional(validateEmail)(email);
    if (emailErr) return res.status(400).json({ ok: false, field: 'email', msg: emailErr });

    const fechaErr = validateFutureDate(fecha);
    if (fechaErr) return res.status(400).json({ ok: false, field: 'fecha', msg: fechaErr });

    const horaErr = validateFutureDateTime(fecha, hora, MIN_LEAD_HOURS, TZ_OFFSET);
    if (horaErr) return res.status(400).json({ ok: false, field: 'hora', msg: horaErr });

    if (!VALID_TIPOS.includes(tipo)) {
        return res.status(400).json({ ok: false, field: 'tipo', msg: 'Tipo de consulta invalido.' });
    }

    const motivoErr = validateRequired(motivo, 'Motivo de consulta');
    if (motivoErr) return res.status(400).json({ ok: false, field: 'motivo', msg: motivoErr });

    if (typeof motivo === 'string' && motivo.length > MAX_MOTIVO_LENGTH) {
        return res.status(400).json({ ok: false, field: 'motivo', msg: 'Motivo demasiado largo.' });
    }

    return next();
};

module.exports = { validateBookingPayload };
