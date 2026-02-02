
export interface EvaluationField {
    id: string;
    label: string;
    name: string;
    options: string[];
}

export interface ApprovalLog {
    date: string;
    status: string;
    user: string;
    note: string;
}

export interface ShippingLog {
    date: string;
    status: string;
    note: string;
}

export interface ShippingData {
    logs: ShippingLog[];
    firstLogDate: string;
    firstStatus: string;
}

export interface ExtractedData {
    school: Record<string, string>;
    item: Record<string, string>;
    images: Array<{ src: string; title: string }>;
    history: ApprovalLog[];
    shipping: ShippingData;
    extractedId: string;
    resi: string;
    sentDate?: string;
}

// Helper to parse HTML
export const parseHtmlData = (html: string, initialExtractedId: string): ExtractedData => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Helper to get input value by label
    const getValueByLabel = (labelText: string): string => {
        const labels = Array.from(doc.querySelectorAll("label"));
        const targetLabel = labels.find((l) =>
            l.textContent?.trim().includes(labelText),
        );
        if (targetLabel && targetLabel.parentElement) {
            const input =
                targetLabel.parentElement.querySelector("input, textarea");
            if (input) {
                return (
                    (input as HTMLInputElement).value ||
                    input.getAttribute("value") ||
                    ""
                );
            }
        }
        return "";
    };

    const school: Record<string, string> = {
        npsn: getValueByLabel("NPSN"),
        nama_sekolah: getValueByLabel("Nama Sekolah"),
        alamat: getValueByLabel("Alamat"),
        kecamatan: getValueByLabel("Kecamatan"),
        kabupaten: getValueByLabel("Kabupaten"),
        provinsi: getValueByLabel("Provinsi"),
        pic: "N/A",
    };

    const item: Record<string, string> = {
        serial_number: getValueByLabel("Serial Number"),
        nama_barang: getValueByLabel("Nama Barang"),
    };

    let resi = getValueByLabel("No. Resi");
    if (!resi) resi = getValueByLabel("No Resi");
    if (!resi) {
        const bodyText = doc.body.textContent || "";
        const resiMatch = bodyText.match(/No\.?\s*Resi\s*[:\n]?\s*([A-Z0-9]+)/i);
        if (resiMatch) resi = resiMatch[1];
    }

    const approvalBtn = doc.querySelector('button[onclick*="approvalFunc"]');
    const htmlId = approvalBtn?.getAttribute("data-id");

    const imgs: Array<{ src: string; title: string }> = [];
    const imageCards = doc.querySelectorAll(".card .card-body .col-6");
    imageCards.forEach((card) => {
        const header = card.querySelector(".card-header");
        const img = card.querySelector("img");
        if (img) {
            imgs.push({
                title: header?.textContent?.trim() || "Dokumentasi",
                src: img.getAttribute("src") || "",
            });
        }
    });

    const logs: ApprovalLog[] = [];
    const logContainer = doc.querySelector("#logApproval .accordion-body");

    if (logContainer) {
        const logEntries = logContainer.querySelectorAll(".border.rounded");

        logEntries.forEach((entry) => {
            const noteElement = entry.querySelector(".mt-2.small");
            const actualNoteText =
                noteElement?.nextElementSibling?.textContent?.trim() || "-";
            logs.push({
                date: entry.querySelector(".text-muted")?.textContent?.trim() || "",
                status: entry.querySelector(".fw-bold")?.textContent?.trim() || "",
                user:
                    entry
                        .querySelector(".fw-semibold")
                        ?.textContent?.replace("User:", "")
                        .trim() || "",
                note: actualNoteText || " - ",
            });
        });
    }
    const shippingLogs: ShippingLog[] = [];
    let firstLogDate = "-";
    let firstStatus = "-";

    const logShippingContainer = doc.querySelector("#logShipping .accordion-body");

    if (logShippingContainer) {
        const shipEntries = logShippingContainer.querySelectorAll(".border.rounded");

        // Ambil entri pertama sebagai yang terbaru (atau 'pertama' sesuai request user)
        if (shipEntries.length > 0) {
            const firstEntry = shipEntries[0];
            firstLogDate = firstEntry.querySelector(".text-muted.small")?.textContent?.trim() || "-";
            firstStatus = firstEntry.querySelector(".badge")?.textContent?.trim() || "-";
        }

        // Opsional: Simpan semua log jika mau ditampilkan semua
        shipEntries.forEach(entry => {
            shippingLogs.push({
                date: entry.querySelector(".text-muted.small")?.textContent?.trim() || "-",
                status: entry.querySelector(".badge")?.textContent?.trim() || "-",
                note: entry.querySelector(".fst-italic")?.textContent?.replace("Catatan:", "").trim() || ""
            });
        });
    }

    // Parse Sent Date
    // Format "29 Januari 2026 13:45"
    let sentDate: string | undefined;
    const sentHistory = logs.find(log => log.status.toLowerCase().includes("terkirim"));
    if (sentHistory && sentHistory.date) {
        const parts = sentHistory.date.split(" ");
        if (parts.length >= 3) {
            const day = parts[0].padStart(2, "0");
            const monthName = parts[1].toLowerCase();
            const year = parts[2];

            const months = [
                "januari", "februari", "maret", "april", "mei", "juni",
                "juli", "agustus", "september", "oktober", "november", "desember"
            ];
            const monthIndex = months.indexOf(monthName);

            if (monthIndex >= 0) {
                const month = String(monthIndex + 1).padStart(2, "0");
                sentDate = `${year}-${month}-${day}`;
            }
        }
    }

    return {
        school,
        item,
        images: imgs,
        history: logs,
        shipping: {
            logs: shippingLogs,
            firstLogDate,
            firstStatus,
        },
        extractedId: htmlId || initialExtractedId,
        resi: resi || "-",
        sentDate
    };
};
