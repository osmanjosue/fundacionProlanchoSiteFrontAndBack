const TIPOS_CURRICULO = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
}
const NIVELES_EDUCATIVOS = ['bachiller', 'tecnico', 'tecnologo', 'profesional', 'posgrado'];

// Perfiles que la fundación recluta habitualmente (confirmado). 'otro' queda como
// salida para perfiles sin título universitario (campo, logística, promotoría, etc.).
const AREAS_INTERES = [
    'trabajo-social',
    'ingenieria-forestal',
    'ingenieria-agronomica',
    'biologia',
    'contaduria',
    'administracion',
    'otro',
];

// Tamaño máximo del CV. Vive aquí para que la ruta (express-fileupload) y el
// middleware de validación usen el mismo número y no se desincronicen.
const MAX_CURRICULO_SIZE = 5 * 1024 * 1024; // 5MB

// Carpeta de Cloudinary donde viven los currículos (separada de 'uploads').
const CARPETA_CURRICULOS = 'curriculos';

// Techo del ?limit= del listado, para que nadie vuelque la colección completa.
const MAX_LIMITE_LISTADO = 50;

module.exports = {
    TIPOS_CURRICULO,
    NIVELES_EDUCATIVOS,
    AREAS_INTERES,
    MAX_CURRICULO_SIZE,
    CARPETA_CURRICULOS,
    MAX_LIMITE_LISTADO,
};
