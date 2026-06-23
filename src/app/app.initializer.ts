export function initializeGoogleAuth(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as any;

    // Verificamos si ambas librerías ya están en window
    const checkReady = setInterval(() => {
      if (w.google && w.gapi) {
        clearInterval(checkReady);
        
        // Cargamos explícitamente el cliente de Google Calendar
        w.gapi.load('client', () => {
          w.gapi.client.init({
            // No necesitamos API_KEY si usamos el token de identidad (OIDC)
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"]
          }).then(() => {
            resolve();
          });
        });
      }
    }, 100);

    // Timeout de seguridad
    setTimeout(() => {
      clearInterval(checkReady);
      console.warn('Google APIs no cargaron a tiempo.');
      resolve();
    }, 8000);
  });
}