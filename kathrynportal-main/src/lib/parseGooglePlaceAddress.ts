export type ParsedGoogleAddress = {
  street: string;
  city: string;
  state: string;
  zip: string;
  county: string;
};

function getComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
  useShort = false,
): string {
  const match = components.find((c) => c.types.includes(type));
  if (!match) return "";
  return useShort ? match.short_name : match.long_name;
}

export function parseGooglePlaceAddress(place: google.maps.places.PlaceResult): ParsedGoogleAddress {
  const parts = place.address_components ?? [];
  const streetNumber = getComponent(parts, "street_number");
  const route = getComponent(parts, "route");
  const street =
    [streetNumber, route].filter(Boolean).join(" ").trim() ||
    place.formatted_address?.split(",")[0]?.trim() ||
    "";

  return {
    street,
    city: getComponent(parts, "locality") || getComponent(parts, "sublocality") || getComponent(parts, "postal_town"),
    state: getComponent(parts, "administrative_area_level_1", true),
    zip: getComponent(parts, "postal_code"),
    county: getComponent(parts, "administrative_area_level_2"),
  };
}
