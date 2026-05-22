const Article = require('../models/articles-model');
const { v4: uuidv4 } = require('uuid');
const { cloudinaryUpload } = require('./cloudinary');

const uploadSingle = async (file, type, validExtensions, article) => {

    try {
        const extFile = file.mimetype.split('/').at(1);

        if (!validExtensions.includes(extFile)) {
            console.log('No es un tipo de extension valido');
            return false; 
        }

        // Generamos el nombre único basado en UUID
        const fileName = `${uuidv4()}.${extFile}`;
        
        // 2. Pasamos el BUFFER del archivo Y el NOMBRE único que inventamos
        await cloudinaryUpload(file.data, fileName); 

        // 3. Guardamos ÚNICAMENTE el string del nombre en MongoDB
        article.images.push(fileName); 
        await article.save();

        // 4. Retornamos el nombre a Angular para mantener la compatibilidad
        return fileName;

    } catch (error) {
        console.error("Error dentro de uploadSingle:", error);
        throw new Error(error.message || error);
    }
}

module.exports = {
    uploadSingle,
}