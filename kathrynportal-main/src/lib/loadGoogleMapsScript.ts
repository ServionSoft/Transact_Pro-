let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    __googleMapsPlacesReady?: () => void;
  }
}

export function getGoogleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  return key || undefined;
}

function placesReady(): boolean {
  return Boolean(window.google?.maps?.places?.Autocomplete);
}

function waitForPlaces(timeoutMs = 15000): Promise<void> {
  if (placesReady()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (placesReady()) {
        resolve();
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error("Timed out waiting for Google Places library."));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }
  if (placesReady()) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      waitForPlaces()
        .then(resolve)
        .catch((err) => {
          loadPromise = null;
          reject(err);
        });
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="true"]');
    if (existing) {
      finish();
      return;
    }

    window.__googleMapsPlacesReady = () => {
      delete window.__googleMapsPlacesReady;
      finish();
    };

    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=__googleMapsPlacesReady`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window.__googleMapsPlacesReady;
      loadPromise = null;
      reject(new Error("Failed to load Google Maps script."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
