const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()-]{8,20}$/;
const PHONE_MIN_DIGITS = 8;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const validateMinLength = (value, min) => {
    if (!value || typeof value !== 'string' || value.trim().length < min) {
        return `Debe tener al menos ${min} caracteres.`;
    }
    return null;
};

const validatePhone = (value) => {
    if (!value || typeof value !== 'string' || !value.trim()) return 'Telefono es requerido.';
    const digits = value.replace(/\D/g, '');
    if (digits.length < PHONE_MIN_DIGITS || !PHONE_RE.test(value)) {
        return 'Numero de telefono invalido (minimo 8 digitos).';
    }
    return null;
};

const validateEmail = (value) => {
    if (!value || typeof value !== 'string' || !value.trim()) return 'Correo es requerido.';
    if (!EMAIL_RE.test(value)) return 'Correo electronico invalido.';
    return null;
};

const validateFutureDate = (value) => {
    if (!value || typeof value !== 'string') return 'Fecha es requerida.';
    if (!DATE_RE.test(value)) return 'Formato de fecha invalido (YYYY-MM-DD).';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(value + 'T00:00:00');
    if (selected < today) return 'La fecha no puede ser anterior a hoy.';
    return null;
};

const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * Valida que la fecha+hora combinadas esten al menos `minLeadHours` horas en el
 * futuro. Interpreta la fecha+hora en la zona fija `tzOffset` (ej. '-06:00' para
 * Honduras) y compara contra el tiempo absoluto, para que front y back coincidan
 * sin importar la zona horaria del servidor.
 */
const validateFutureDateTime = (date, time, minLeadHours, tzOffset) => {
    if (!date || typeof date !== 'string') return 'Fecha es requerida.';
    if (!time || typeof time !== 'string') return 'Hora es requerida.';
    if (!TIME_RE.test(time)) return 'Formato de hora invalido.';
    const when = new Date(`${date}T${time}:00${tzOffset}`);
    if (Number.isNaN(when.getTime())) return 'Fecha u hora invalida.';
    if (when.getTime() < Date.now() + minLeadHours * 60 * 60 * 1000) {
        return `Debes agendar con al menos ${minLeadHours} horas de anticipacion.`;
    }
    return null;
};

const validateRequired = (value, fieldName) => {
    if (!value || typeof value !== 'string' || !value.trim()) return `${fieldName} es requerido.`;
    return null;
};

/**
 * Hace opcional cualquier validador: si el campo esta vacio lo da por valido;
 * si tiene contenido, aplica el validador original (ej. valida el formato).
 */
const optional = (validator) => (value) => {
    if (!value || typeof value !== 'string' || !value.trim()) return null;
    return validator(value);
};

module.exports = {
    validateMinLength,
    validatePhone,
    validateEmail,
    validateFutureDate,
    validateFutureDateTime,
    validateRequired,
    optional,
};
