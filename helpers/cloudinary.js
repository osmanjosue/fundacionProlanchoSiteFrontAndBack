const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Ahora la función acepta el buffer y el nombre del archivo
const cloudinaryUpload = async (fileBuffer, fileName) => {
    try {
        // Extraemos solo el UUID eliminando el '.jpg' o '.png' para el public_id
        const publicIdClean = fileName.split('.').at(0);

        const options = {
            public_id: publicIdClean, // Forzamos a Cloudinary a usar nuestro UUID
            overwrite: true,
            folder: 'uploads',
        };

        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(options, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }).end(fileBuffer);
        });

        return result; // Retorna el objeto completo de Cloudinary de forma segura
    }
    catch (err) {
        throw new Error(JSON.stringify(err));
    }
}

// Corregimos para que borre usando el nombre guardado en Mongo (ej: "uuid.jpg")
const cloudinaryDelete = async (fileName) => {
    try {
        const publicIdClean = fileName.split('.').at(0);
        // Construimos la ruta exacta dentro de Cloudinary (ej: "uploads/tu-uuid")
        const pathInCloudinary = `uploads/${publicIdClean}`; 
        
        const result = await cloudinary.uploader.destroy(pathInCloudinary);
        console.log("Resultado del borrado en Cloudinary:", result);
        return result;
    } catch (error) {
        console.error("Error al borrar en Cloudinary:", error);
        throw error;
    }
}

module.exports = {
    cloudinaryUpload,
    cloudinaryDelete,
};