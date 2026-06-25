/**
 * drafrancisherrera_email_helper.js — Envío de correo del formulario de contacto
 * del sitio drafrancisherrera.com mediante Brevo (SMTP).
 *
 * Se mantiene SEPARADO de helpers/email.service.js (que usa la cuenta Gmail de
 * fundacionprolancho): otro sitio, otra cuenta, otro proveedor. El destinatario
 * lo fija el SERVIDOR (DRAFRANCISHERRERA_CONTACT_TO), no el cliente, para que el
 * formulario no pueda usarse para enviar a direcciones arbitrarias.
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.BREVO_SMTP_PORT) || 587,
    secure: false, // STARTTLS en el puerto 587 (cert válido, sin hacks de TLS)
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
    },
});

/**
 * Destinatarios de las consultas. DRAFRANCISHERRERA_CONTACT_TO admite uno o
 * varios correos separados por coma (ej. "doctora@x.com, recepcion@x.com").
 * Editar el .env basta para agregar/quitar destinatarios, sin tocar código.
 */
const CONTACT_RECIPIENTS = (process.env.DRAFRANCISHERRERA_CONTACT_TO || '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);

/** Escapa caracteres HTML para que el contenido del usuario no rompa el correo. */
const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/**
 * Envía el correo de notificación de una consulta del formulario de contacto.
 * @returns la info de nodemailer si se envió, o `false` si falló (mismo contrato
 *          que helpers/email.service.js).
 */
const sendContactEmail = async ({ name, phone, email, message }) => {
    const html = `
        <h2>Nueva consulta desde drafrancisherrera.com</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Correo:</strong> ${email ? escapeHtml(email) : 'No proporcionado'}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${escapeHtml(message)}</p>
    `;

    try {
        return await transporter.sendMail({
            from: `Sitio drafrancisherrera.com <${process.env.DRAFRANCISHERRERA_MAIL_FROM}>`,
            to: CONTACT_RECIPIENTS,
            // Si el paciente dejó correo, la doctora responde directo con "Responder".
            replyTo: email || undefined,
            subject: `Nueva consulta de ${name}`,
            html,
        });
    } catch (error) {
        console.log(error);
        return false;
    }
};

module.exports = { sendContactEmail };
