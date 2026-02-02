import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const npsn = searchParams.get("npsn");

  if (!npsn) {
    return NextResponse.json(
      { error: "NPSN parameter is required" },
      { status: 400 }
    );
  }

  try {
    const externalUrl = `https://jkt-dc01.taila6748c.ts.net/fetch-school-data?npsn=${npsn}`;
    const response = await fetch(externalUrl, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `External API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("DEBUG: External API Failed (Soft Fail):", error.message);
    // Return empty structure with error flag, status 200 to prevent frontend console red error
    return NextResponse.json(
      {
        namaKepsek: null,
        guruLain: [],
        error: "Server Data Offline",
        debug: error.message
      },
      { status: 200 }
    );
  }
}
