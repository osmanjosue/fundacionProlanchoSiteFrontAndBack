const { response } = require('express');
const User = require('../models/user-model');
const bcrypt = require ('bcryptjs');
const { generarJWT } = require('../helpers/jwt');

const getUsers = async (req, res = response) => {

    // console.log({User});

    const user = await User.find({}, 'name role')

    res.json ({
        ok: true, 
        user,
        uid: req.uid,
    })

}

const createUser = async (req, res = response) => {

    const uidOperador = req.uid;

    // CORRECCIÓN: Debes retornar una respuesta JSON con un status code
    if (uidOperador !== '65766ece679c24f393c98b73') {
        return res.status(403).json({
            ok: false,
            msg: 'No tienes permisos para crear usuarios'
        });
    }

    try{

        const user = new User(req.body);

        //password encryption

        const salt = bcrypt.genSaltSync();
        user.password = bcrypt.hashSync(user.password, salt); //pudiste haber desestructurado al inicio pero usar el mismo user.password no parece estar mal

        await user.save();

        //Generar el TOKEN - JWT
        const token = await generarJWT( user._id );

        res.json({
            ok: true,
            user,
            token
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error en usuarios... revisar logs'
        })
    }
}

// TODO: terminar el controlador de updateUser, validar token
const updateUser =async(req, res=response)=> {

    const uid = req.params.id;
    /* const {nombre, role, email, ...demas}=req.body; //se puede hacer asi tambien */
    
    try{

        const usuarioDB = await User.findById(uid);

        if(!usuarioDB){
            return res.status(404).json({
                ok: false,
                msj: 'No existe un usuario por ese id'
            });
        }

        //Actualizaciones
        const {pasword, email, ...campos}=req.body;

        if (usuarioDB.email !== email){
            const existeEmail=await Usuario.findOne({email});
            if(existeEmail){
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un usuario con ese email'
                });
            }
        }

        if(!usuarioDB.google){
            campos.email=email;
        } else if(usuarioDB.email !==email){
            return res.status(400).json({
                ok: false,
                msg: 'Usuario de google no puede cambiar su correo'
            });
        }


        const usuarioActualizado= await Usuario.findByIdAndUpdate(uid, campos, {new: true});


        res.json({
            ok: true,
            usuario: usuarioActualizado
        });

    }
    catch(error){
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        });
    }
}



module.exports = {
    getUsers,
    createUser
}