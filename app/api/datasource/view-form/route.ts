import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { id, cookie } = await request.json();

        if (!id || !cookie) {
            return NextResponse.json({ success: false, message: 'Missing id or cookie' }, { status: 400 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_DATASOURCE_URL;
        if (!baseUrl) {
            return NextResponse.json({ success: false, message: 'Missing Data Source URL configuration' }, { status: 500 });
        }

        const targetUrl = `${baseUrl}/view_form/${id}`;

        const res = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Cookie': `ci_session=${cookie}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!res.ok) {
            return NextResponse.json({ success: false, message: `Failed to fetch view form: ${res.status}` }, { status: res.status });
        }

        const html = await res.text();

        return NextResponse.json({ success: true, html });

    } catch (error: any) {
        console.error('View Form Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
