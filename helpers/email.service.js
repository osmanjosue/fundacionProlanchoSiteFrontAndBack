const nodemailer = require('nodemailer')

/* interface SendMailOptions {
    to: string;
    subject: string;
    htmlBody: string;
} */

// CONFIGURACIÓN LIMPIA PARA PRODUCCIÓN/LOCAL
const transporter = nodemailer.createTransport({
    // Eliminamos 'service' para que Nodemailer obedezca estrictamente al host y puerto manual
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAILER_EMAIL,
        pass: process.env.MAILER_SECRET_KEY,
    },
    tls: {
        family: 4, // <-- Esto obliga a Node a usar IPv4, solucionando el problema del VPS
        // Por defecto se validan los certificados (seguro). Solo si el VPS lo exige,
        // setear MAILER_TLS_REJECT_UNAUTHORIZED=false en el .env.
        rejectUnauthorized: process.env.MAILER_TLS_REJECT_UNAUTHORIZED !== 'false',
    }
})

const sendEmail = async (options) => {

    const { to, replyTo, subject, html } = options;

    try {
        const sentInformation = await transporter.sendMail({
            // Es buena práctica usar la misma variable del correo remitente aquí
            from: `fundacionprolancho.org <${process.env.MAILER_EMAIL}>`,
            to: to,
            replyTo: replyTo,
            subject: subject,
            html: html,
        })
        /* console.log(sentInformation); */
        return sentInformation;
    } catch (error) {
        console.log(error)
        return false;
    }

}

module.exports = {
    sendEmail
}