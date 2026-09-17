const { v4: uuidv4 } = require('uuid');
const { cloudinaryUpload, cloudinaryDelete } = require('./cloudinary');
const { TIPOS_CURRICULO, CARPETA_CURRICULOS } = require('../config/talento-listas')

const uploadCurriculo = async (file) => {
    const fileName = `${uuidv4()}.${TIPOS_CURRICULO[file.mimetype]}`
    const result = await cloudinaryUpload(file.data, fileName, { folder: CARPETA_CURRICULOS, resource_type: 'raw' });
    return { fileName, url: result.secure_url };
}

/**
 * Borrado "best effort": se usa para limpiar archivos huérfanos (un CV que se
 * subió pero cuyo guardado en Mongo falló, o el CV anterior de una re-postulación).
 * Si falla no debe tumbar la petición, solo queda registrado en el log.
 */
const deleteCurriculo = async (fileName) => {
    if (!fileName) return;
    try {
        await cloudinaryDelete(fileName, CARPETA_CURRICULOS, 'raw');
    } catch (error) {
        console.error('No se pudo borrar el curriculo en Cloudinary:', fileName, error);
    }
}

module.exports = { uploadCurriculo, deleteCurriculo };
