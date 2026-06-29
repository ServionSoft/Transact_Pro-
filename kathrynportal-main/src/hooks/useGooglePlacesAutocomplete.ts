import { useEffect, useRef } from "react";
import { getGoogleMapsApiKey, loadGoogleMapsScript } from "@/lib/loadGoogleMapsScript";
import { parseGooglePlaceAddress, type ParsedGoogleAddress } from "@/lib/parseGooglePlaceAddress";

type UseGooglePlacesAutocompleteOptions = {
  inputEl: HTMLInputElement | null;
  enabled?: boolean;
  onPlaceSelected: (parsed: ParsedGoogleAddress) => void;
  onInputSync?: (street: string) => void;
};

export function useGooglePlacesAutocomplete({
  inputEl,
  enabled = true,
  onPlaceSelected,
  onInputSync,
}: UseGooglePlacesAutocompleteOptions): boolean {
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onInputSyncRef = useRef(onInputSync);
  onPlaceSelectedRef.current = onPlaceSelected;
  onInputSyncRef.current = onInputSync;

  const apiKey = getGoogleMapsApiKey();
  const active = enabled && Boolean(apiKey);

  useEffect(() => {
    if (!active || !inputEl) return;

    let autocomplete: google.maps.places.Autocomplete | null = null;
    let cancelled = false;

    loadGoogleMapsScript(apiKey!)
      .then(() => {
        if (cancelled || !inputEl || !window.google?.maps?.places?.Autocomplete) return;

        autocomplete = new google.maps.places.Autocomplete(inputEl, {

          fields: ["address_components", "formatted_address"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (!place?.address_components?.length) return;
          const parsed = parseGooglePlaceAddress(place);
          if (inputEl) {
            inputEl.value = parsed.street || inputEl.value;
          }
          onInputSyncRef.current?.(parsed.street || inputEl.value);
          onPlaceSelectedRef.current(parsed);
        });
      })
      .catch((err: unknown) => {
        if (import.meta.env.DEV) {
          const message = err instanceof Error ? err.message : "Google Places failed to load.";
          console.warn("[AddressAutocomplete]", message);
        }
      });

    return () => {
      cancelled = true;
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [active, apiKey, inputEl]);

  return active;
}
