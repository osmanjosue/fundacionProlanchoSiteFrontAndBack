const Talento = require('../models/talento-model');
const { uploadCurriculo, deleteCurriculo } = require('../helpers/uploadCurriculo');
const { sendOk, sendError } = require('../helpers/responses');
const { MAX_LIMITE_LISTADO, ESTADOS_TALENTO } = require('../config/talento-listas');
const { enviarAvisoFundacion, enviarAcusePostulante } = require('../helpers/talento-email.helper');
const { generarMagicLinkToken } = require('../helpers/jwt-magic-link');

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

    let postulacionGuardada;
    try {
        postulacionGuardada = existente
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

    // Generar el token mágico para el enlace del correo
    let magicToken = null;
    try {
        magicToken = await generarMagicLinkToken(postulacionGuardada._id);
    } catch (error) {
        console.error('Error generando magic link:', error);
    }

    // Fire-and-forget: si falla el correo, la postulación ya está en MongoDB.
    enviarAvisoFundacion(postulacionGuardada, magicToken)
        .catch((err) => console.error('Correo aviso fundación falló:', err));
        
    enviarAcusePostulante(email, nombreCompleto)
        .catch((err) => console.error('Correo acuse postulante falló:', err));

    // Endpoint público y anónimo: NO devolvemos el documento. Si alguien envía el
    // numeroDocumento de otra persona, la respuesta no puede revelarle sus datos.
    return sendOk(res, { msg: 'Postulación recibida' }, existente ? 200 : 201);
};

const listarPostulaciones = async (req, res) => {
    const pagina = Math.max(1, parseInt(req.query.page) || 1);
    const limite = Math.min(Math.max(1, parseInt(req.query.limit) || 10), MAX_LIMITE_LISTADO);
    const skip = (pagina - 1) * limite;

    // ?estado= filtra la bandeja del panel (ej. ver solo las pendientes).
    // El valor ya viene validado contra ESTADOS_TALENTO y AREAS_INTERES en la ruta.
    const filtro = {};
    if (req.query.estado) {
        filtro.estado = req.query.estado;
    }
    if (req.query.area) {
        // Al filtrar por 'areasInteres.area', se incluye a cualquier persona que se haya
        // postulado a esta área alguna vez, incluso si su postulación más reciente es a
        // otra área distinta. Esto es intencionado para no perder candidatos.
        filtro['areasInteres.area'] = req.query.area;
    }

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

/**
 * Controlador para la ruta pública protegida con Magic Link.
 * Devuelve la postulación validada por el middleware.
 */
const verPostulacionPorMagicLink = async (req, res) => {
    // El ID viene en la URL y ya fue validado por el middleware (req.magicPayload.uid)
    const { id } = req.params;

    const talento = await Talento.findById(id);

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
    verPostulacionPorMagicLink,
};
