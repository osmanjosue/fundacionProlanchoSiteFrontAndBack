const { response } = require('express');
const { sendError } = require('../helpers/responses');
const { TIPOS_CURRICULO, MAX_CURRICULO_SIZE } = require('../config/talento-listas');

const curriculoUploadMiddleware = (req, res = response, next) => {
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.curriculo) {
        return sendError(res, 400, 'No se subio ningun archivo (curriculum)');
    }

    const curriculo = req.files.curriculo;

    //si es un array significa que has mas de un archivo, en este caso no se permite
    if (Array.isArray(curriculo)) {
        return sendError(res, 400, 'Solo se permite un archivo de curriculo');
    }

    if (!Object.keys(TIPOS_CURRICULO).includes(curriculo.mimetype)) {
        return sendError(res, 400, 'El curriculo debe ser un archivo PDF o Word (.docx)');
    }

    // Red de seguridad: normalmente el `abortOnLimit` de express-fileupload ya
    // respondió 413 antes de llegar aquí, pero no dependemos de esa config.
    if (curriculo.size > MAX_CURRICULO_SIZE) {
        return sendError(res, 400, 'El curriculo no puede pesar mas de 5MB');
    }

    // Fuera del body: el archivo no es un campo del formulario.
    req.curriculo = curriculo;

    next();
}

module.exports = {
    curriculoUploadMiddleware
}
