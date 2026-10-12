type ReverseGeocodeResult = {
    country?: string | null;
    city?: string | null;
    placeName?: string | null;
};

type NominatimReverseResponse = {
    display_name?: string;
    name?: string;
    address?: {
        country?: string;
        city?: string;
        town?: string;
        village?: string;
        hamlet?: string;
        municipality?: string;
        county?: string;
        state?: string;
        suburb?: string;
        neighbourhood?: string;
        road?: string;
        attraction?: string;
        tourism?: string;
        leisure?: string;
    };
};

function getCityFromAddress(address: NominatimReverseResponse['address']) {
    if (!address) return null;

    return (
        address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.municipality ||
        null
    );
}

function getPlaceNameFromPayload(payload: NominatimReverseResponse) {
    const address = payload.address;

    const candidate =
        payload.name ||
        address?.attraction ||
        address?.tourism ||
        address?.leisure ||
        address?.road ||
        address?.suburb ||
        address?.neighbourhood ||
        payload.display_name;

    return candidate?.trim() || null;
}

export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('zoom', '18');

    const response = await fetch(url.toString(), {
        headers: {
            'User-Agent': 'photo_geo/0.5.0'
        },
        next: {
            revalidate: 60 * 60 * 24
        }
    });

    if (!response.ok) {
        throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const payload = (await response.json()) as NominatimReverseResponse;

    return {
        country: payload.address?.country?.trim() || null,
        city: getCityFromAddress(payload.address),
        placeName: getPlaceNameFromPayload(payload)
    };
}