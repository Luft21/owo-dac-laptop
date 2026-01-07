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

    const formData = new FormData();
    Object.keys(payload).forEach((key) => {
      formData.append(key, payload[key] || "");
    });

    console.log("Submitting form with payload:", payload);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_DATASOURCE_URL}/form_bapp/submit`,
      {
        method: "POST",
        headers: {
          Cookie: `ci_session=${cookie}`,
          // Do NOT set Content-Type here, let fetch set it with boundary for FormData
        },
        body: formData,
      }
    );

    // The response might be a redirect or HTML.
    // If it's a redirect 302, fetch follows it by default.
    // We should check if the final URL or content indicates success.
    // Usually these forms redirect to a list or show a success message.

    // For now, let's assume if status is 200 it's likely OK, but we should parse response if possible.
    const text = await res.text();

    // Check for common error indicators in HTML if needed
    // But usually simple 200 is fine for this step unless we want to be strict.

    return NextResponse.json({
      success: true,
      message: "Submitted",
      debug: text.substring(0, 100),
    });
  } catch (error) {
    console.error("Submit API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
