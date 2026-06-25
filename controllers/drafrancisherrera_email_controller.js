const { response } = require('express');
const { sendContactEmail } = require('../helpers/drafrancisherrera_email_helper');
const { sendOk, sendError } = require('../helpers/responses');

/**
 * Recibe el body ya validado (drafrancisherrera_email_validation) y envía el
 * correo de la consulta a la doctora vía Brevo. No deja la petición colgada:
 * si el envío falla, responde 502.
 */
const sendContactEmailController = async (req, res = response) => {
    const { name, phone, email, message } = req.body;

    const info = await sendContactEmail({ name, phone, email, message });

    if (!info) {
        return sendError(res, 502, 'No se pudo enviar el mensaje. Intenta de nuevo más tarde.');
    }

    sendOk(res, { msg: 'Mensaje enviado exitosamente' });
};

module.exports = { sendContactEmailController };
