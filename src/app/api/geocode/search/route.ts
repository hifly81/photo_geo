import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '8');
  url.searchParams.set('q', query);

  const response = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'photo-geo-app/1.0'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    return NextResponse.json({ results: [], error: 'Geocoding failed' }, { status: 500 });
  }

  const data = await response.json();

  const results = (Array.isArray(data) ? data : []).map((item: any) => {
    const city =
      item.address?.city ??
      item.address?.town ??
      item.address?.village ??
      item.address?.municipality ??
      item.address?.county ??
      '';

    const name =
      item.name ??
      item.address?.attraction ??
      item.address?.museum ??
      item.address?.tourism ??
      item.address?.building ??
      item.address?.amenity ??
      item.address?.shop ??
      item.address?.leisure ??
      item.address?.road ??
      city ??
      item.display_name;

    return {
      id: String(item.place_id),
      label: item.display_name,
      name,
      city,
      country: item.address?.country ?? '',
      latitude: Number(item.lat),
      longitude: Number(item.lon)
    };
  });

  return NextResponse.json({ results });
}
