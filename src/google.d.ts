export {};

declare global {
  interface Window {
    google: typeof google;
  }

  const google: {
    accounts: {
      id: {
        initialize: (config: any) => void;
        renderButton: (parent: HTMLElement, options: any) => void;
        prompt: () => void;
      };
    };
  };
}