const { v4: uuidv4 } = require('uuid');
const { cloudinaryUpload } = require('./cloudinary');
const { TIPOS_CURRICULO } = require('../config/talento-listas')

const uploadCurriculo = async (file) => {

    try {
        const fileName = `${uuidv4()}.${TIPOS_CURRICULO[file.mimetype]}`
        const result = await cloudinaryUpload(file.data, fileName, { folder: 'curriculos', resource_type: 'raw' });
        return { fileName, url: result.secure_url };
    }
    catch (error) {
        console.error("Error dentro de uploadCurriculo:", error);
        throw new Error(error.message || error);
    }

}

module.exports = { uploadCurriculo };