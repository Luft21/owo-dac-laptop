import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { payload, cookie } = await req.json();

    if (!payload || !cookie) {
      return NextResponse.json(
        { success: false, message: "Missing payload or cookie" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_DATASOURCE_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { success: false, message: "Missing Data Source URL configuration" },
        { status: 500 }
      );
    }

    const formData = new FormData();
    Object.keys(payload).forEach((key) => {
      // Ensure we append strings for FormData
      const val = payload[key];
      formData.append(key, val == null ? "" : String(val));
    });

    console.log("Submitting form with payload:", payload);

    const target = `${baseUrl}/form_bapp/submit`;
    const res = await fetch(target, {
      method: "POST",
      headers: {
        Cookie: `ci_session=${cookie}`,
        // Let fetch set Content-Type for FormData
      },
      body: formData,
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("Forwarded submit returned non-ok:", res.status, text.slice(0, 300));
      return NextResponse.json(
        { success: false, message: `Data source responded ${res.status}` },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, message: "Submitted" });
  } catch (error: any) {
    console.error("Submit API error:", error);
    return NextResponse.json({ success: false, message: error.message || String(error) }, { status: 500 });
  }
}
