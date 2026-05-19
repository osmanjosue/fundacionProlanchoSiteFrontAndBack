/* 
    route: /api/projects
*/

const { response } = require('express');
const Project = require('../models/project-model');

const getProjects = async (req, res = response) => {

    const projects = await Project.find({published: true}, 'projectName userId published img')
    res.json({
        ok: true,
        projects
    })
}

const createProject = async (req, res = response) => {

    const userId = req.uid;
    const project = new Project({ userId, ...req.body });

    try {

        if (project.projectName===" ") { //se llama en modal-proyecto.component.ts (newProject(){})
            return res.status(400).json({
                ok: false,
                msg: 'No se permiten campos vacios'
            })
        }
        await project.save();
        res.json({
            ok: true,
            project,
        });

    } catch (error) {
        console.log(error)
        res.status(500).json({
            ok: false,
            msg: 'Error al crear proyecto',
        });
    }
}

const editProject = async (req, res = response) => {

    const projectId = req.params.id;

    try {

        const projectDB = await Project.findById(projectId);
        
        if (!projectDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontro el proyecto'
            })
        }
        
        const projectBody = req.body;
        const updatedProject = await Project.findByIdAndUpdate(projectId, projectBody, {new: true});

        res.json({
            ok: true,
            proyecto: updatedProject,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar el usuario',
        });
    }

}

const deleteProject = async (req, res=response) => {

    const projectId = req.params.id;
    try {

        const projectDB = await Project.findById(projectId);
        
        if (!projectDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontro el proyecto'
            })
        }
        
        await Project.findByIdAndDelete(projectId);

        res.status(200).json({
            ok: true,
            msg: 'Proyecto Eliminado Correctamente'
        });

    } catch (error){
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'No se puedo hacer la peticion DELETE'
        })        
    }
}

module.exports = {
    getProjects,
    createProject,
    editProject,
    deleteProject,
}