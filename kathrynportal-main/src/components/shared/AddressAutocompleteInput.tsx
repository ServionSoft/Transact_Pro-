import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";
import { getGoogleMapsApiKey } from "@/lib/loadGoogleMapsScript";
import type { ParsedGoogleAddress } from "@/lib/parseGooglePlaceAddress";

export type AddressAutocompleteInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "defaultValue" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected?: (parsed: ParsedGoogleAddress) => void;
};

export const AddressAutocompleteInput = forwardRef<HTMLInputElement, AddressAutocompleteInputProps>(
  function AddressAutocompleteInput(
    { value, onChange, onPlaceSelected, className, autoComplete = "off", ...props },
    forwardedRef,
  ) {
    const innerRef = useRef<HTMLInputElement | null>(null);
    const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);
    const hasApiKey = Boolean(getGoogleMapsApiKey());
    const lastExternalValue = useRef(value);

    const setRef = useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        setInputEl(node);
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef],
    );

    // Sync programmatic updates (e.g. primary contact fill) without fighting Google Autocomplete typing.
    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      if (value !== lastExternalValue.current && value !== el.value) {
        el.value = value;
      }
      lastExternalValue.current = value;
    }, [value]);

    useGooglePlacesAutocomplete({
      inputEl,
      enabled: hasApiKey && Boolean(onPlaceSelected),
      onPlaceSelected: onPlaceSelected ?? (() => {}),
      onInputSync: onChange,
    });

    return (
      <Input
        ref={setRef}
        defaultValue={value}
        onChange={(e) => {
          lastExternalValue.current = e.target.value;
          onChange(e.target.value);
        }}
        autoComplete={autoComplete}
        className={cn(className)}
        {...props}
      />
    );
  },
);
