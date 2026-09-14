const { sendOk, sendError } = require('../helpers/responses');
const { tieneAccesoLector } = require('../helpers/talento-lectores');
const { generarTokenAccesoLector, verificarTokenAccesoLector, generarTokenSesionLector } = require('../helpers/jwt-magic-link');
const { enviarAccesoDirectorio } = require('../helpers/talento-email.helper');

/**
 * POST /api/talento/acceso
 * Solicita el enlace de acceso por correo.
 */
const solicitarAcceso = async (req, res) => {
    const { email } = req.body;

    const procesarSolicitud = async () => {
        if (tieneAccesoLector(email)) {
            try {
                const token = await generarTokenAccesoLector(email);
                await enviarAccesoDirectorio(email, token);
            } catch (error) {
                console.error('Error procesando solicitud de acceso:', error);
            }
        }
    };

    procesarSolicitud();

    return sendOk(res, { msg: 'Si tu correo tiene acceso, recibirás un enlace en unos minutos.' });
};

const canjearAcceso = async (req, res) => {
    const { token } = req.body;
    const msgError = 'El enlace no es válido o ha caducado';

    try {
        const payload = verificarTokenAccesoLector(token);

        if (!tieneAccesoLector(payload.email)) {
            return sendError(res, 401, msgError);
        }

        const tokenSesion = await generarTokenSesionLector(payload.email);

        return sendOk(res, {
            msg: 'Sesión iniciada correctamente',
            email: payload.email,
            token: tokenSesion
        });
    } catch (error) {
        return sendError(res, 401, msgError);
    }
};

module.exports = {
    solicitarAcceso,
    canjearAcceso
};
