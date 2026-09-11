/**
 * talento-email.helper.js — Correos del módulo de talento.
 *
 * Dos correos por postulación:
 *   1. Aviso interno a la fundación con todos los datos + enlace al CV.
 *   2. Acuse de recibo breve al postulante.
 *
 * Usa el transporter de email.service.js (cuenta Gmail de la fundación).
 * El destinatario del aviso interno lo fija el SERVIDOR (TALENTO_CONTACT_TO),
 * nunca el cliente, para que el endpoint no sirva de relé de correo abierto.
 *
 * Si el envío falla, devuelve false (mismo contrato que email.service.js).
 * El controlador llama estas funciones como fire-and-forget: un fallo de
 * correo NUNCA debe tumbar la petición.
 */
const { sendEmail } = require('./email.service');

/**
 * Destinatarios del aviso interno. Admite uno o varios correos separados
 * por coma en la variable de entorno (ej. "talento@fundacion.org, rrhh@fundacion.org").
 */
const TALENTO_RECIPIENTS = (process.env.TALENTO_CONTACT_TO || '')
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean);

// ── Mapeos de enums a etiquetas legibles ──────────────────────────────

const ETIQUETAS_AREAS = {
    'trabajo-social':        'Trabajo Social',
    'ingenieria-forestal':   'Ingeniería Forestal',
    'ingenieria-agronomica': 'Ingeniería Agronómica',
    'biologia':              'Biología',
    'contaduria':            'Contaduría',
    'administracion':        'Administración',
    'otro':                  'Otro',
};

const ETIQUETAS_NIVELES = {
    'bachiller':    'Bachiller',
    'tecnico':      'Técnico',
    'tecnologo':    'Tecnólogo',
    'profesional':  'Profesional',
    'posgrado':     'Posgrado',
};

// ── Utilidades ────────────────────────────────────────────────────────

/** Escapa caracteres HTML para que el contenido del usuario no rompa el correo. */
const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/** Formatea una fecha ISO a algo legible en español. */
const formatearFecha = (fecha) => {
    try {
        return new Date(fecha).toLocaleDateString('es-HN', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    } catch {
        return String(fecha);
    }
};

// ── Correo 1: aviso interno a la fundación ────────────────────────────

/**
 * Envía el correo de notificación a la fundación con todos los datos de
 * la postulación y un enlace directo al CV en Cloudinary.
 *
 * @param {Object} postulacion  Documento Mongoose de Talento (ya guardado).
 * @param {string} magicToken   JWT para acceder a la vista de solo lectura.
 * @returns {Promise<Object|false>}
 */
const enviarAvisoFundacion = async (postulacion, magicToken) => {
    if (!TALENTO_RECIPIENTS.length) {
        console.warn('TALENTO_CONTACT_TO no está configurado. No se enviará aviso de postulación.');
        return false;
    }

    if (!process.env.FRONTEND_URL) {
        console.warn('FRONTEND_URL no está configurado en .env. Se usará http://localhost:4200 por defecto, pero los enlaces fallarán en producción.');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const magicLinkUrl = magicToken ? `${frontendUrl}/talento/revisar/${postulacion._id}?token=${magicToken}` : null;

    const areaActual = postulacion.areasInteres.at(-1);
    const esRepostulacion = postulacion.areasInteres.length > 1;
    const etiquetaArea = ETIQUETAS_AREAS[areaActual?.area] || areaActual?.area || '—';
    const etiquetaNivel = ETIQUETAS_NIVELES[postulacion.nivelEducativo] || postulacion.nivelEducativo;

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #2c6b4f; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 20px;">
                📋 Nueva postulación${esRepostulacion ? ' (re-postulación)' : ''}
            </h2>
            <p style="color: #d4edda; margin: 8px 0 0; font-size: 14px;">
                ${escapeHtml(postulacion.nombreCompleto)} — ${etiquetaArea}
            </p>
        </div>

        ${esRepostulacion ? `
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 16px; margin: 16px 0 0; font-size: 13px;">
            ⚠️ Esta persona se ha postulado <strong>${postulacion.areasInteres.length} veces</strong>.
        </div>` : ''}

        <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px;">
            <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555; width: 40%;">Nombre completo</td>
                <td style="padding: 10px 16px;">${escapeHtml(postulacion.nombreCompleto)}</td>
            </tr>
            <tr style="background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555;">Nº Documento</td>
                <td style="padding: 10px 16px;">${escapeHtml(postulacion.numeroDocumento)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555;">Correo</td>
                <td style="padding: 10px 16px;">
                    <a href="mailto:${escapeHtml(postulacion.email)}" style="color: #2c6b4f;">${escapeHtml(postulacion.email)}</a>
                </td>
            </tr>
            <tr style="background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555;">Teléfono</td>
                <td style="padding: 10px 16px;">${escapeHtml(postulacion.telefono)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555;">Ciudad</td>
                <td style="padding: 10px 16px;">${escapeHtml(postulacion.ciudad)}</td>
            </tr>
            <tr style="background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555;">Nivel educativo</td>
                <td style="padding: 10px 16px;">${etiquetaNivel}</td>
            </tr>
            ${postulacion.tituloProfesional ? `
            <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555;">Título profesional</td>
                <td style="padding: 10px 16px;">${escapeHtml(postulacion.tituloProfesional)}</td>
            </tr>` : ''}
            <tr style="background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555;">Área de interés</td>
                <td style="padding: 10px 16px;">${etiquetaArea}</td>
            </tr>
            ${postulacion.anosExperiencia != null ? `
            <tr style="border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555;">Años de experiencia</td>
                <td style="padding: 10px 16px;">${postulacion.anosExperiencia}</td>
            </tr>` : ''}
            ${postulacion.linkedinUrl ? `
            <tr style="background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                <td style="padding: 10px 16px; font-weight: 600; color: #555;">LinkedIn</td>
                <td style="padding: 10px 16px;">
                    <a href="${escapeHtml(postulacion.linkedinUrl)}" target="_blank" rel="noopener" style="color: #2c6b4f;">${escapeHtml(postulacion.linkedinUrl)}</a>
                </td>
            </tr>` : ''}
        </table>

        ${postulacion.presentacion ? `
        <div style="margin: 16px 0; padding: 12px 16px; background: #f8f9fa; border-radius: 6px;">
            <p style="font-weight: 600; color: #555; margin: 0 0 6px; font-size: 13px;">Presentación:</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(postulacion.presentacion)}</p>
        </div>` : ''}

        ${magicToken ? `
        <div style="margin: 20px 0; text-align: center;">
            <a href="${escapeHtml(magicLinkUrl)}" target="_blank" rel="noopener"
               style="display: inline-block; padding: 14px 28px; background: #2c6b4f; color: #fff;
                      text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 10px;">
                🔗 Ver Postulación Completa
            </a>
            <p style="margin: 0; font-size: 12px; color: #777;">El enlace expira en 48 horas.</p>
        </div>` : ''}

        <div style="margin: 20px 0; text-align: center;">
            <a href="${escapeHtml(postulacion.urlCV)}" target="_blank" rel="noopener"
               style="display: inline-block; padding: 8px 16px; background: #e9ecef; color: #555;
                      text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 13px;">
                📄 Descargar CV original (PDF)
            </a>
        </div>

        <div style="margin-top: 20px; padding: 12px 16px; background: #e8f5e9; border-radius: 6px; font-size: 12px; color: #555;">
            <p style="margin: 0;">
                📅 Recibido: ${formatearFecha(postulacion.createdAt || new Date())}<br>
                💡 <strong>Tip:</strong> Puedes responder directamente a este correo para contactar al postulante.
            </p>
        </div>
    </div>`;

    return sendEmail({
        to: TALENTO_RECIPIENTS,
        replyTo: postulacion.email,
        subject: `Nueva postulación: ${postulacion.nombreCompleto} — ${etiquetaArea}`,
        html,
    });
};

// ── Correo 2: acuse de recibo al postulante ───────────────────────────

/**
 * Envía un acuse de recibo breve al postulante.
 *
 * @param {string} email   Correo del postulante.
 * @param {string} nombre  Nombre completo del postulante.
 * @returns {Promise<Object|false>}
 */
const enviarAcusePostulante = async (email, nombre) => {
    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #2c6b4f; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 20px;">Fundación Prolancho</h2>
        </div>

        <div style="padding: 24px 16px;">
            <p style="font-size: 15px; line-height: 1.6;">
                Estimado/a <strong>${escapeHtml(nombre)}</strong>,
            </p>
            <p style="font-size: 15px; line-height: 1.6;">
                Hemos recibido tu postulación correctamente. Nuestro equipo revisará
                tu información y hoja de vida.
            </p>
            <p style="font-size: 15px; line-height: 1.6;">
                Si tu perfil se ajusta a nuestras necesidades, nos pondremos en contacto
                contigo.
            </p>
            <p style="font-size: 15px; line-height: 1.6;">
                Gracias por tu interés en formar parte de la Fundación Prolancho.
            </p>
        </div>

        <div style="padding: 12px 16px; background: #f8f9fa; border-radius: 0 0 8px 8px; font-size: 12px; color: #888; text-align: center;">
            Este es un correo automático, por favor no respondas a este mensaje.
        </div>
    </div>`;

    return sendEmail({
        to: email,
        subject: 'Postulación recibida — Fundación Prolancho',
        html,
    });
};

module.exports = { enviarAvisoFundacion, enviarAcusePostulante };
