const Talento = require('../models/talento-model');
const { uploadCurriculo, deleteCurriculo } = require('../helpers/uploadCurriculo');
const { sendOk, sendError } = require('../helpers/responses');
const { MAX_LIMITE_LISTADO, ESTADOS_TALENTO } = require('../config/talento-listas');

/**
 * Mongoose interpreta `doc.campo = undefined` como un $unset. Al re-postular sin
 * enviar un campo opcional (ej. linkedinUrl) se borraría el valor anterior, así
 * que solo copiamos las claves que realmente vinieron en la petición.
 */
const soloDefinidos = (objeto) =>
    Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined));

const actualizarTalento = async (talento, datosPersonales, area, fileName, url) => {
    Object.assign(talento, soloDefinidos(datosPersonales));
    talento.nombreArchivoCV = fileName;
    talento.urlCV = url;
    talento.areasInteres.push({ area, fecha: new Date() });
    talento.estado = ESTADOS_TALENTO[0];
    await talento.save();
    return talento;
};

const registrarTalento = async (datosPersonales, numeroDocumento, area, fileName, url) => {
    const nuevo = new Talento({
        ...soloDefinidos(datosPersonales),
        numeroDocumento,
        nombreArchivoCV: fileName,
        urlCV: url,
        areasInteres: [{ area, fecha: new Date() }],
    });
    await nuevo.save();
    return nuevo;
};

const crearPostulacion = async (req, res) => {
    const { nombreCompleto, numeroDocumento, email, telefono, ciudad,
        nivelEducativo, tituloProfesional, anosExperiencia,
        linkedinUrl, presentacion, aceptaTratamientoDatos, area, } = req.body;

    const datosPersonales = {
        nombreCompleto, email, telefono, ciudad,
        nivelEducativo, tituloProfesional, anosExperiencia,
        linkedinUrl, presentacion, aceptaTratamientoDatos,
    };

    const { fileName, url } = await uploadCurriculo(req.curriculo);
    const existente = await Talento.findOne({ numeroDocumento });
    const cvAnterior = existente?.nombreArchivoCV;

    try {
        existente
            ? await actualizarTalento(existente, datosPersonales, area, fileName, url)
            : await registrarTalento(datosPersonales, numeroDocumento, area, fileName, url);
    } catch (error) {
        // El archivo ya está en Cloudinary pero no quedó referenciado en Mongo.
        await deleteCurriculo(fileName);
        throw error;
    }

    // Solo cuando el guardado fue exitoso soltamos el CV que acaba de ser reemplazado.
    if (cvAnterior && cvAnterior !== fileName) {
        await deleteCurriculo(cvAnterior);
    }

    // Endpoint público y anónimo: NO devolvemos el documento. Si alguien envía el
    // numeroDocumento de otra persona, la respuesta no puede revelarle sus datos.
    return sendOk(res, { msg: 'Postulación recibida' }, existente ? 200 : 201);
};

const listarPostulaciones = async (req, res) => {
    const pagina = Math.max(1, parseInt(req.query.page) || 1);
    const limite = Math.min(Math.max(1, parseInt(req.query.limit) || 10), MAX_LIMITE_LISTADO);
    const skip = (pagina - 1) * limite;

    // ?estado= filtra la bandeja del panel (ej. ver solo las pendientes).
    // El valor ya viene validado contra ESTADOS_TALENTO en la ruta.
    const filtro = req.query.estado ? { estado: req.query.estado } : {};

    const [postulaciones, total] = await Promise.all([
        // Sin sort, skip/limit puede repetir u omitir registros entre páginas.
        Talento.find(filtro).sort({ createdAt: -1 }).skip(skip).limit(limite),
        Talento.countDocuments(filtro),
    ]);

    return sendOk(res, {
        postulaciones,
        paginacion: {
            total,
            pagina,
            limite,
            totalPaginas: Math.ceil(total / limite),
        },
    }, 200);
};

const verPostulacion = async (req, res) => {
    const { id } = req.params;

    const talento = await Talento.findById(id);

    if (!talento) {
        return sendError(res, 404, 'Postulación no encontrada');
    }

    return sendOk(res, { talento }, 200);
};

/**
 * Marca el seguimiento que hace la fundación sobre una postulación
 * (nuevo -> revisado / descartado). No toca el resto del documento.
 */
const cambiarEstadoPostulacion = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const talento = await Talento.findByIdAndUpdate(
        id,
        { estado },
        { new: true, runValidators: true },
    );

    if (!talento) {
        return sendError(res, 404, 'Postulación no encontrada');
    }

    return sendOk(res, { talento }, 200);
};

module.exports = {
    crearPostulacion,
    listarPostulaciones,
    verPostulacion,
    cambiarEstadoPostulacion,
};
