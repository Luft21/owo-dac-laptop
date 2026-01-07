import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, password, type } = body;

        if (!username || !password) {
            return NextResponse.json({ success: false, message: 'Username and password are required' }, { status: 400 });
        }

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        let loginUrl;
        let baseUrl;
        if (type == "datasource") {
            baseUrl = process.env.NEXT_PUBLIC_DATASOURCE_URL;
            loginUrl = `${baseUrl}/auth/login`;
            formData.append('submit', '');
        } else {
            baseUrl = process.env.NEXT_PUBLIC_DAC_URL;
            loginUrl = `${baseUrl}/auth/ajax_login/`;
        }

        if (!baseUrl) {
            return NextResponse.json({ success: false, message: 'Configuration error: Missing Base URL' }, { status: 500 });
        }

        const response = await fetch(loginUrl, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            return NextResponse.json({ success: false, message: 'Login failed upstream' }, { status: response.status });
        }

        // Capture the cookie
        const setCookieHeader = response.headers.get('set-cookie');

        // We want to return the whole successful response, or at least the cookie.
        // The user specifically asked to "ambil cookie" and "const cookie = response.headers.get("set-cookie");"
        // We will return it in the JSON so the client can store it (or we could set it on the response directly as a cookie).
        // The user said: "nah ambil cookie dari const cookie = response.headers.get("set-cookie");"
        // "trus component login yang diconsume page.tsx pertama kali kalo ga ada ci_session di localstorage"
        // This implies manual handling. I will send the cookie string back to the client.

        const data = await response.json().catch(() => ({}));

        return NextResponse.json({
            success: true,
            message: 'Login successful',
            cookie: setCookieHeader,
            data: data
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}
