import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { npsn, nama_sekolah, sn, session_id } = await request.json();

        if (!npsn || !nama_sekolah || !sn || !session_id) {
            return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
        }

        // Construct the body for x-www-form-urlencoded
        // npsn format: "20215401+-+SD+NEGERI+2+KEPONGPONGAN+KECAMATAN+TALUN"
        // It seems they want spaces replaced by '+' or standard URL encoding which usually encodes space as %20 or +.
        // Standard URLSearchParams encodes space as '+'.

        // Combining NPSN and Nama Sekolah
        const npsnValue = `${npsn} - ${nama_sekolah}`;

        const formData = new URLSearchParams();
        formData.append('draw', '1');
        formData.append('status', 'all');
        formData.append('npsn', npsnValue);
        formData.append('termin', 'all');
        formData.append('sn', sn);

        const targetUrl = 'https://kemdikdasmen.mastermedia.co.id/app/approval/filter_table';

        // console.log(`Checking approval for SN: ${sn}, NPSN: ${npsnValue}`);

        const res = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Cookie': `ci_session=${session_id}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: formData.toString()
        });

        const responseText = await res.text();
        // console.log('Approval API Status:', responseText);

        // Attempt parsing JSON if possible, otherwise return text
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = responseText;
        }

        // Local parsing logic
        let extractedId = null;
        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
            const rowData = data.data[0];
            // User says HTML is at index 8 ("<a href... data-id='...' ...>")
            // rowData is [1, "...", ..., "<a...>"]
            if (rowData && rowData.length > 8) {
                const htmlSnippet = rowData[8];
                console.log('HTML Snippet found:', htmlSnippet);
                const match = htmlSnippet.match(/data-id=['"]([^'"]+)['"]/);
                if (match && match[1]) {
                    extractedId = match[1];
                    console.log('Extracted ID:', extractedId);
                }
            }
        }

        // Check for session rotation
        let newSessionId = null;
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) {
            const match = setCookie.match(/ci_session=([^;]+)/);
            if (match && match[1]) {
                newSessionId = match[1];
                console.log('Session rotated:', newSessionId);
            }
        }

        return NextResponse.json({
            success: res.ok,
            status: res.status,
            data: data,
            extractedId,
            newSessionId
        });

    } catch (error: any) {
        console.error('Check Approval Error:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
