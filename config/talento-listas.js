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

module.exports = { TIPOS_CURRICULO, NIVELES_EDUCATIVOS, AREAS_INTERES }