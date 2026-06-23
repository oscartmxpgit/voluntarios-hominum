export function initializeGoogleAuth(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as any;

    const waitForGoogle = () => {
      if (w.google && w.gapi) {
        w.gapi.load('client', () => {
          w.gapi.client.init({
            discoveryDocs: [
              "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"
            ]
          }).then(() => {
            resolve();
          }).catch(() => {
            console.warn('gapi.client.init falló');
            resolve();
          });
        });
      } else {
        setTimeout(waitForGoogle, 100);
      }
    };

    waitForGoogle();
  });
}