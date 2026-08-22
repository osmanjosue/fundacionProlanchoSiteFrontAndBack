const { response } = require('express');
const { TIPOS_CURRICULO } = require('../config/talento-listas');

const MAX_CURRICULO_SIZE = 5 * 1024 * 1024; // 5MB

const curriculoUploadMiddleware = (req, res = response, next) => {
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.curriculo) {
        return res.status(400).json({
            ok: false,
            msg: 'No se subio ningun archivo (curriculum)'
        });
    }

    const curriculo = req.files.curriculo;

    //si es un array significa que has mas de un archivo, en este caso no se permite
    if (Array.isArray(curriculo)) {
        return res.status(400).json({
            ok: false,
            msg: 'Solo se permite un archivo de curriculo'
        });
    }

    if (!TIPOS_CURRICULO.includes(curriculo.mimetype)) {
        return res.status(400).json({
            ok: false,
            msg: 'El curriculo debe ser un archivo PDF o Word (.docx)'
        });
    }

    if (curriculo.size > MAX_CURRICULO_SIZE) {
        return res.status(400).json({
            ok: false,
            msg: 'El curriculo no puede pesar mas de 5MB'
        });
    }

    req.body.files = curriculo;

    next();
}

module.exports = {
    curriculoUploadMiddleware
}
