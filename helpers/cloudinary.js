const { v2: cloudinary } = require('cloudinary');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * El public_id se arma distinto segun el tipo de recurso, y la asimetria es de
 * Cloudinary, no nuestra:
 *
 *   - 'image': el public_id va SIN extension. Cloudinary detecta el formato y la
 *     agrega el solo a la URL de entrega.
 *   - 'raw'  : el public_id ES el nombre del archivo, extension incluida. Si se
 *     la quitamos, el objeto queda sin extension y se entrega como
 *     application/octet-stream con Content-Disposition: attachment. El navegador
 *     lo descarga en vez de mostrarlo y un <object type="application/pdf"> no
 *     renderiza nada.
 *
 * Cualquier cambio aqui hay que reflejarlo en cloudinaryDelete: si suben y
 * borran con public_ids distintos, los archivos reemplazados quedan huerfanos.
 */
const construirPublicId = (fileName, resourceType) =>
    resourceType === 'raw' ? fileName : fileName.split('.').at(0);

// Ahora la función acepta el buffer y el nombre del archivo
// extraOptions es opcional: si no se pasa, el comportamiento es igual que antes (retrocompatible).
// Sirve para que otros llamadores (ej. currículos) puedan pisar el folder o agregar resource_type: 'raw'.
const cloudinaryUpload = async (fileBuffer, fileName, extraOptions = {}) => {
    try {
        const options = {
            public_id: construirPublicId(fileName, extraOptions.resource_type),
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
        // Misma regla que en la subida (ver construirPublicId): en 'raw' la
        // extension es parte del public_id y quitarla apuntaria a un objeto
        // inexistente, dejando el archivo real huerfano en Cloudinary.
        const publicIdClean = construirPublicId(fileName, resourceType);
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