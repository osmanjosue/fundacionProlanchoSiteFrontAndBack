const { response } = require('express');
const { sendEmail } = require('../helpers/email.service');
const { sendOk, sendError } = require('../helpers/responses');

const sendEmailController = async (req, res = response) => {
    const { ...emailData } = req.body;

    const emailInformation = await sendEmail(emailData);

    // sendEmail devuelve false si nodemailer falló: ya no se deja al cliente colgado.
    if (!emailInformation) {
        return sendError(res, 502, 'No se pudo enviar el correo. Intenta de nuevo más tarde.');
    }

    sendOk(res, {
        msg: 'Correo enviado exitosamente',
        emailInformation,
    });
};

module.exports = {
    sendEmailController,
};
