const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Ahora la función acepta el buffer y el nombre del archivo
// extraOptions es opcional: si no se pasa, el comportamiento es igual que antes (retrocompatible).
// Sirve para que otros llamadores (ej. currículos) puedan pisar el folder o agregar resource_type: 'raw'.
const cloudinaryUpload = async (fileBuffer, fileName, extraOptions = {}) => {
    try {
        // Extraemos solo el UUID eliminando el '.jpg' o '.png' para el public_id
        const publicIdClean = fileName.split('.').at(0);

        const options = {
            public_id: publicIdClean, // Forzamos a Cloudinary a usar nuestro UUID
            overwrite: true,
            folder: 'uploads',
            ...extraOptions, // se fusiona al final para poder sobreescribir los valores de arriba
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
        // Logueamos el detalle del proveedor pero NO lo propagamos al cliente:
        // el error-handler global usa err.message como `msg` de la respuesta.
        console.error('Error subiendo a Cloudinary:', err);
        const error = new Error('No se pudo subir el archivo. Intenta de nuevo mas tarde.');
        error.statusCode = 502;
        throw error;
    }
}

// Corregimos para que borre usando el nombre guardado en Mongo (ej: "uuid.jpg")
// `folder` y `resourceType` por defecto reproducen el comportamiento anterior;
// los currículos viven en otra carpeta y se suben como 'raw'.
const cloudinaryDelete = async (fileName, folder = 'uploads', resourceType = 'image') => {
    try {
        const publicIdClean = fileName.split('.').at(0);
        // Construimos la ruta exacta dentro de Cloudinary (ej: "uploads/tu-uuid")
        const pathInCloudinary = `${folder}/${publicIdClean}`;

        const result = await cloudinary.uploader.destroy(pathInCloudinary, { resource_type: resourceType });
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