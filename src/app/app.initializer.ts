export function initializeGoogleAuth(): Promise<void> {
  return new Promise((resolve) => {
    // Si Google ya existe, resolvemos inmediatamente
    if ((window as any).google) {
      return resolve();
    }

    // Verificamos periódicamente si el script ya cargó
    const interval = setInterval(() => {
      if ((window as any).google) {
        clearInterval(interval);
        resolve();
      }
    }, 50);
    
    // Opcional: añadir un timeout por si el script falla al cargar
    setTimeout(() => {
      clearInterval(interval);
      console.warn('Google Identity Services no cargó a tiempo.');
      resolve();
    }, 5000);
  });
}