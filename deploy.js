const ftp = require("basic-ftp");
require("dotenv").config();

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true; // Muestra el progreso en consola

    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            secure: false // Cambia a true si tu servidor soporta FTPS
        });

        console.log("Conectado al servidor. Limpiando y subiendo...");

        // Asegurarse de que el directorio remoto existe
        await client.ensureDir(process.env.FTP_REMOTE_DIR);
        await client.cd(process.env.FTP_REMOTE_DIR);

        // Subir contenido de dist/tu-carpeta
        // Ajusta 'dist/nombre-de-tu-app' según tu carpeta de build
        await client.uploadFromDir("dist/voluntarios-hominum/browser");

        console.log("Despliegue completado con éxito.");
    } catch (err) {
        console.error("Error en el despliegue:", err);
    } finally {
        client.close();
    }
}

deploy();