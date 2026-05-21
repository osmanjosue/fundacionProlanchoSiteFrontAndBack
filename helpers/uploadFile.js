const Article = require('../models/articles-model')
const { v4: uuidv4 } = require('uuid');
const { cloudinaryUpload } = require('./cloudinary');
const path = require('path'); // <-- Importamos path nativo de Node

const uploadSingle = async (file, type, validExtensions, article) => {

    try {
        const extFile = file.mimetype.split('/').at(1);

        if (!validExtensions.includes(extFile)) {
            console.log('No es un tipo de extension valido');
            return false; // Retornamos falso para que Angular sepa que no se procesó
        }

        const fileName = `${uuidv4()}.${extFile}`;
        
        // FORZAMOS RUTA ABSOLUTA PARA EL VPS
        // Modifica los '../' dependiendo de qué tan profundo esté este archivo helper
        const absolutePath = path.join(__dirname, '../uploads', type, fileName);

        // 1. Esperamos a que el archivo se mueva COMPLETAMENTE a la carpeta local
        // Nota: express-fileupload requiere envolver .mv en una Promesa si no responde con una de forma nativa
        await new Promise((resolve, reject) => {
            file.mv(absolutePath, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        // 2. Ahora que el archivo SÍ existe localmente de forma segura, lo subimos a Cloudinary
        await cloudinaryUpload(absolutePath);

        // 3. Agregamos al array del artículo y salvamos en MongoDB
        article.images.push(fileName);
        await article.save();

        // 4. Retornamos el nombre con éxito total
        return fileName;

    } catch (error) {
        console.error("Error dentro de uploadSingle:", error);
        // Retornamos falso o lanzamos el error limpio para que el controlador que maneja el HTTP (el res.status) sepa qué responder
        throw new Error(error.message || error);
    }
}

module.exports = {
    uploadSingle,
}