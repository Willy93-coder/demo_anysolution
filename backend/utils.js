const fs = require('node:fs/promises');

// Crear funcion para escribir json en funcion de llave valor (hashmap)
exports.jsonTaskCron = async (data) => {
    try {
        await fs.appendFile('./cronTask.json', data)
    } catch (e) {
        console.error('Error al escribir el archivo cronTask.json ' + e);
    }
};

exports.createJsonNGSI = (json, dataObj) => {

};

exports.updateJsonNGSI = async (url, ngsi) => {

};