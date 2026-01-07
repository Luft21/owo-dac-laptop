import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { cookie } = await request.json();

        if (!cookie) {
            return NextResponse.json({ success: false, message: 'Missing Data Source Session' }, { status: 401 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_DATASOURCE_URL;
        if (!baseUrl) {
            return NextResponse.json({ success: false, message: 'Missing Data Source URL configuration' }, { status: 500 });
        }

        // Fetch the page
        const response = await fetch(`${baseUrl}/proses`, {
            headers: {
                'Cookie': 'ci_session=' + cookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            return NextResponse.json({ success: false, message: `Failed to fetch data source: ${response.status}` }, { status: response.status });
        }

        const html = await response.text();

        // Regex to parse the table rows
        // Groups:
        // 1: No
        // 2: Type (DAC)
        // 3: Date
        // 4: Verifikator
        // 5: BAPP No
        // 6: SN (Button text inside td)
        // 7: NPSN
        // 8: Sekolah
        // 9: ID (href link)
        // Note: Removed </tr> check as it might be missing in some rows
        const regex = /<tr>\s*<td>\s*(\d+)\s*<\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<td>(.*?)<\/td>.*?<td>.*?>(.*?)<\/button>.*?<td>.*?>(.*?)<\/button>.*?<td>\s*(.*?)\s*<\/td>.*?<td>\s*(.*?)\s*<\/td>.*?href=.*?\/form\/(\d+)/gs;

        const results = [];
        let match;

        // Clean up helper
        const clean = (str: string) => str.replace(/&nbsp;/g, ' ').trim();

        while ((match = regex.exec(html)) !== null) {

            results.push({
                no: clean(match[1]),
                type: clean(match[2]),
                date: clean(match[3]),
                bapp: clean(match[5]),
                serial_number: clean(match[6]),
                npsn: clean(match[7]),
                nama_sekolah: clean(match[8]),
                action_id: clean(match[9])
            });
        }

        return NextResponse.json({ success: true, count: results.length, data: results });

    } catch (error: any) {
        console.error('Scrape API Error:', error);
        return NextResponse.json({ success: false, message: error.message || 'Scrape failed' }, { status: 500 });
    }
}
