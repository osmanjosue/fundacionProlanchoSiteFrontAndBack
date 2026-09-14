const { sendError } = require('../helpers/responses');
const { verificarTokenSesionLector } = require('../helpers/jwt-magic-link');
const { tieneAccesoLector } = require('../helpers/talento-lectores');

const validarLectorTalento = (req, res, next) => {
    const token = req.header('x-lector-token');
    const msgError = 'Acceso denegado o sesión expirada';

    if (!token) {
        return sendError(res, 401, msgError);
    }

    try {
        const payload = verificarTokenSesionLector(token);

        if (!tieneAccesoLector(payload.email)) {
            return sendError(res, 401, msgError);
        }

        req.lectorEmail = payload.email;
        next();
    } catch (error) {
        return sendError(res, 401, msgError);
    }
};

module.exports = {
    validarLectorTalento
};
