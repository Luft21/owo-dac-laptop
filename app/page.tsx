"use client";

import { useEffect, useState, useRef } from "react";
import Login from "@/components/Login";
import Sidebar, {
  defaultEvaluationValues,
  EvaluationField,
} from "@/components/Sidebar";
import StickyInfoBox from "@/components/StickyInfoBox";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// Helper Interface
interface ExtractedData {
  school: Record<string, string>;
  item: Record<string, string>;
  images: Array<{ src: string; title: string }>;
  history: string[]; // Simple array of strings for history
  extractedId: string;
  resi: string;
}

export default function Home() {
  const [dacAuthenticated, setDacAuthenticated] = useState(false);
  const [dataSourceAuthenticated, setDataSourceAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [sheetData, setSheetData] = useState<any[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  // Detail State
  const [selectedSn, setSelectedSn] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ExtractedData | null>(null);
  const [currentExtractedId, setCurrentExtractedId] = useState<string | null>(
    null
  );
  const [rawDataHtml, setRawDataHtml] = useState<string>("");

  // Form State
  const [evaluationForm, setEvaluationForm] = useState(defaultEvaluationValues);
  const [sidebarOptions, setSidebarOptions] = useState<EvaluationField[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snBapp, setSnBapp] = useState("");
  const [id, setId] = useState("");

  // Image Viewer State
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null
  );
  const [imageRotation, setImageRotation] = useState(0);

  // Verification Date
  const [verificationDate, setVerificationDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const dacSession = localStorage.getItem("dac_session");
    const dsSession = localStorage.getItem("datasource_session");

    // BACKWARD COMPATIBILITY
    const oldSession = localStorage.getItem("ci_session");
    if (oldSession && !dacSession) {
      localStorage.setItem("dac_session", oldSession);
      localStorage.removeItem("ci_session");
      setDacAuthenticated(true);
    } else if (dacSession) {
      setDacAuthenticated(true);
    }

    if (dsSession) setDataSourceAuthenticated(true);
    setIsLoading(false);
  }, []);

  // Fetch Data when authenticated
  useEffect(() => {
    if (dacAuthenticated && dataSourceAuthenticated) {
      fetchScrapedData();
    }
  }, [dacAuthenticated, dataSourceAuthenticated]);

  // Navigate/Auto-select Logic
  useEffect(() => {
    if (sheetData.length > 0) {
      if (currentTaskIndex < sheetData.length) {
        handleSelectItem(sheetData[currentTaskIndex]);
        // Reset Form
        setEvaluationForm(defaultEvaluationValues); // Removed constant default
        // Logic to reset form based on current options will be handled in useEffect or Sidebar
        setCustomReason("");
      } else {
        setSelectedSn(null);
        setParsedData(null);
      }
    }

    // Fetch Sidebar Options if not loaded
    if (sheetData.length > 0 && sidebarOptions.length === 0) {
      fetchSidebarOptions(); // This will also init the form
    }
  }, [sheetData, currentTaskIndex, sidebarOptions.length]); // added dependency

  // Parse HTML Effect
  useEffect(() => {
    if (rawDataHtml && currentExtractedId) {
      parseHtml(rawDataHtml, currentExtractedId);
    }
  }, [rawDataHtml, currentExtractedId]);

  // Debug: Log ID when it changes
  useEffect(() => {
    console.log("Current ID State Updated:", id);
  }, [id]);

  const fetchScrapedData = async () => {
    const dsSession = localStorage.getItem("datasource_session");
    // We can filter by username/verifikator if needed, but for now grab all or server filters
    // const username = localStorage.getItem('username');

    if (!dsSession) return;

    try {
      const res = await fetch("/api/datasource/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie: dsSession,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Sort by Date (optional) or just use as is
        const sorted = json.data.sort((a: any, b: any) => {
          // Assuming newer tasks should be first or last?
          // Let's keep original order for now unless specified
          return 0;
        });
        setSheetData(sorted);
        setCurrentTaskIndex(0);
      } else {
        console.error("Failed to fetch scraped data:", json.message);
      }
    } catch (e) {
      console.error("Error fetching scraped data:", e);
    }
  };

  const handleSelectItem = async (item: any) => {
    setSelectedSn(item.serial_number);
    setDetailLoading(true);
    setRawDataHtml("");
    setParsedData(null);
    setCurrentExtractedId(null);
    setSnBapp(item.serial_number || "");

    let currentSessionId = localStorage.getItem("dac_session");

    try {
      // If we already have action_id from scrape, we can try to skip check-approval's ID finding
      // But check-approval might be needed for session freshness or side effects.
      // Let's call check-approval as requested.

      const checkRes = await fetch("/api/check-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npsn: item.npsn,
          nama_sekolah: item.nama_sekolah,
          sn: item.serial_number,
          session_id: currentSessionId,
        }),
      });
      const checkJson = await checkRes.json();
      const targetId = checkJson.extractedId;

      if (targetId) {
        setCurrentExtractedId(targetId);
        const detailRes = await fetch("/api/get-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: targetId, session_id: currentSessionId }),
        });
        const detailJson = await detailRes.json();

        if (detailJson.html) setRawDataHtml(detailJson.html);
      } else {
        console.log("No extracted ID found for this item");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const parseHtml = (html: string, initialExtractedId: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Helper to get input value by label
    const getValueByLabel = (labelText: string): string => {
      const labels = Array.from(doc.querySelectorAll("label"));
      const targetLabel = labels.find((l) =>
        l.textContent?.trim().includes(labelText)
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

    setParsedData({
      school,
      item,
      images: imgs,
      history: [],
      extractedId: htmlId || initialExtractedId,
      resi: resi || "-",
    });
  };

  const fetchSidebarOptions = async () => {
    if (sheetData.length === 0) return;
    const item = sheetData[0]; // Use first item to scrape options
    const dsSession = localStorage.getItem("datasource_session");

    // We need action_id to fetch the form
    if (!item.action_id || !dsSession) {
      console.warn("Missing action_id or session for fetching sidebar options");
      return;
    }

    try {
      const res = await fetch("/api/get-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.action_id,
          cookie: dsSession,
        }),
      });
      const json = await res.json();

      if (json.success && json.html) {
        setId(json.id_user);
        parseSidebarOptions(json.html, json.id_user);
      } else {
        console.error("Failed to fetch form HTML:", json.message);
      }
    } catch (e) {
      console.error("Failed to fetch sidebar options", e);
    }
  };

  const parseSidebarOptions = (html: string, preloadedIdUser: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const fieldMapping: Omit<EvaluationField, "options">[] = [
      { id: "F", label: "TGL BAPP", name: "ket_tgl_bapp" },
      { id: "G", label: "GEO TAGGING", name: "geo_tag" },
      { id: "H", label: "FOTO SEKOLAH/PAPAN NAMA", name: "f_papan_identitas" },
      { id: "I", label: "FOTO BOX & PIC", name: "f_box_pic" },
      { id: "J", label: "FOTO KELENGKAPAN UNIT", name: "f_unit" },
      { id: "K", label: "DXDIAG", name: "spesifikasi_dxdiag" },
      { id: "O", label: "BARCODE SN BAPP", name: "bc_bapp_sn" },
      { id: "Q", label: "BAPP HAL 1", name: "bapp_hal1" },
      { id: "R", label: "BAPP HAL 2", name: "bapp_hal2" },
      { id: "S", label: "TTD BAPP", name: "nm_ttd_bapp" },
      { id: "T", label: "STEMPEL", name: "stempel" },
    ];

    const newOptions: EvaluationField[] = [];
    const newDefaults: Record<string, string> = {};

    fieldMapping.forEach((field) => {
      const select = doc.querySelector(`select[name="${field.name}"]`);
      const opts: string[] = [];
      if (select) {
        // Find optgroups/options. The dump shows options inside optgroup
        const options = select.querySelectorAll("option");
        options.forEach((opt) => {
          const val = opt.value;
          if (val && val.trim() !== "") {
            opts.push(val);
          }
        });
      }

      // Fallback if no options found? Or maybe keep empty?
      if (opts.length > 0) {
        newOptions.push({ ...field, options: opts });
        newDefaults[field.id] = opts[0];
      } else {
        newOptions.push({
          ...field,
          options: ["Sesuai", "Tidak Sesuai", "Tidak Ada"],
        }); // Fallback
        newDefaults[field.id] = "Sesuai";
      }
    });

    setSidebarOptions(newOptions);
    setEvaluationForm(newDefaults);
  };
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (currentImageIndex === null || !parsedData) return;

      if (e.key === "Escape" || e.key === " ") setCurrentImageIndex(null);
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") nextImage();
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") prevImage();

      // Logika Rotasi 90 derajat
      if (e.key.toLowerCase() === "q") rotateImage("left");
      if (e.key.toLowerCase() === "e") rotateImage("right");
    };

    const handleMouse = (e: MouseEvent) => {
      if (currentImageIndex === null || !parsedData) return;
      if (e.button === 3) {
        e.preventDefault();
        prevImage();
      }
      if (e.button === 4) {
        e.preventDefault();
        nextImage();
      }
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleMouse);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleMouse);
    };
  }, [currentImageIndex, parsedData]);

  const submitToDataSource = async (isApproved: boolean) => {
    // isApproved is mostly for tracking, but the payload is built from form state
    // Logic:
    // If Approved -> All "Sesuai" / "Ada" / "Lengkap" / "Konsisten"
    // If Rejected -> Those specific fields are changed.
    // But we just send what is in `evaluationForm`.

    const session = localStorage.getItem("datasource_session");
    if (!session || !parsedData || sheetData.length === 0) return;

    const currentItem = sheetData[currentTaskIndex];

    setIsSubmitting(true);

    try {
      // sn_bapp Logic:
      // "BARCODE SN BAPP" is field 'O'. Check the value.
      // If "Ada" (or "Sesuai" depending on exact option value), use system SN.
      // Otherwise use manual input.
      const barcodeSnStatus = evaluationForm["O"];
      // Check options based on Sidebar.tsx errorMap or standard expectation
      // If 'Ada' or 'Sesuai', copy from sheetData/parsedData
      let finalSnBapp = snBapp;
      if (barcodeSnStatus === "Ada" || barcodeSnStatus === "Sesuai") {
        finalSnBapp = currentItem.serial_number;
      }

      const payload: Record<string, string> = {
        id_user: id,
        npsn: currentItem.npsn, // Use scrape data preferably
        sn_penyedia: currentItem.serial_number,
        cek_sn_penyedia: "0",
        id_update: currentItem.action_id, // action_id is id_update
        no_bapp: currentItem.bapp, // bapp from scrape is no_bapp
        ket_tgl_bapp: evaluationForm["F"],
        tgl_bapp: verificationDate,
        sn_bapp: finalSnBapp,
        geo_tag: evaluationForm["G"],
        f_papan_identitas: evaluationForm["H"],
        f_box_pic: evaluationForm["I"],
        f_unit: evaluationForm["J"],
        spesifikasi_dxdiag: evaluationForm["K"],
        bc_bapp_sn: evaluationForm["O"],
        bapp_hal1: evaluationForm["Q"],
        bapp_hal2: evaluationForm["R"],
        nm_ttd_bapp: evaluationForm["S"],
        stempel: evaluationForm["T"],
      };

      const res = await fetch("/api/datasource/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          cookie: session,
        }),
      });

      const json = await res.json();
      if (json.success) {
        console.log("Submitted successfully");

        let finalNote = "";

        // If Rejected, fetch reason from view_form
        try {
          const viewRes = await fetch("/api/datasource/view-form", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: currentItem.action_id,
              cookie: session,
            }),
          });
          const viewJson = await viewRes.json();
          if (viewJson.success && viewJson.html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(viewJson.html, "text/html");

            // Strategy 1: Look for textarea with name="description" (Most likely location based on provided HTML)
            const descInput = doc.querySelector(
              'textarea[name="description"]'
            ) as HTMLTextAreaElement;
            if (descInput) {
              finalNote = descInput.value || descInput.textContent || "";
            }

            // Strategy 2: Fallback to "Keterangan" label search
            if (!finalNote) {
              const allElements = Array.from(doc.querySelectorAll("*"));
              const labelEl = allElements.find(
                (el) =>
                  el.children.length === 0 &&
                  el.textContent &&
                  (el.textContent.trim() === "Keterangan" ||
                    el.textContent.trim() === "Alasan Penolakan")
              );

              if (labelEl) {
                // Try parent's next sibling (div col-2 -> div col-10)
                if (labelEl.parentElement) {
                  const parentNext = labelEl.parentElement.nextElementSibling;
                  if (parentNext) {
                    const input = parentNext.querySelector("input, textarea");
                    if (input)
                      finalNote =
                        (input as HTMLInputElement).value ||
                        input.textContent ||
                        "";
                    else finalNote = parentNext.textContent?.trim() || "";
                  }
                }
              }
            }

            // Strategy 3: Alert danger (last resort)
            if (!finalNote) {
              const alert = doc.querySelector(".alert.alert-danger");
              if (alert) finalNote = alert.textContent?.trim() || "";
            }

            console.log("Parsed Rejection Note:", finalNote);
          }
        } catch (err) {
          console.error("Error fetching view form", err);
        }

        // Call save-approval (DAC)
        // status: 2 = Terima, 3 = Tolak
        const dacSession = localStorage.getItem("dac_session");
        if (dacSession && parsedData.extractedId) {
          try {
            await fetch("/api/save-approval", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: finalNote.length > 0 ? 3 : 2,
                id: parsedData.extractedId,
                npsn: parsedData.school.npsn,
                resi: parsedData.resi,
                note: finalNote,
                session_id: dacSession,
              }),
            });
            console.log("Saved to DAC");
          } catch (dacErr) {
            console.error("Failed to save to DAC", dacErr);
            alert(
              "Gagal menyimpan status ke DAC (Approval Data Source sukses)"
            );
          }
        }

        handleSkip(false);
      } else {
        console.error("Submit failed", json.message);
        alert(`Gagal submit: ${json.message}`);
      }
    } catch (e) {
      console.error("Submit error", e);
      alert("Terjadi kesalahan saat submit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Effect untuk mengecek Double Data (NPSN Ganda)
  useEffect(() => {
    const checkDoubleData = async () => {
      // Pastikan parsedData sudah ada dan memiliki NPSN
      if (!parsedData?.school?.npsn) return;

      const currentSessionId = localStorage.getItem("dac_session");
      if (!currentSessionId) return;

      try {
        const res = await fetch("/api/check-double-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            term: parsedData.school.npsn, // Mengirim NPSN sebagai term
            session_id: currentSessionId,
          }),
        });

        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
          // Jika data yang dikembalikan lebih dari 1, tampilkan alert
          if (json.data.length > 1) {
            const snList = json.data
              .map((d: any) => d.serial_number)
              .join(", ");

            alert(
              `⚠️ PERINGATAN: Terdeteksi ${json.data.length} data untuk NPSN: ${parsedData.school.npsn}.\n\n` +
                `Daftar SN yang terdaftar:\n${snList}\n\n` +
                `Harap teliti kembali sebelum melakukan approval.`
            );
          }
        }
      } catch (err) {
        console.error("Gagal mengecek double data:", err);
      }
    };

    checkDoubleData();
  }, [parsedData?.school?.npsn]); // Hanya berjalan ketika NPSN pada parsedData berubah

  // Effect untuk Keyboard dan Mouse Macro di Image Viewer
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (currentImageIndex === null || !parsedData) return;

      // ... logika keyboard yang sudah ada (Esc, Panah, Q, E) ...
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key.toLowerCase() === "q") rotateImage("left");
      if (e.key.toLowerCase() === "e") rotateImage("right");
    };

    // LOGIKA MOUSE MACRO (Tombol Samping)
    const handleMouse = (e: MouseEvent) => {
      if (currentImageIndex === null || !parsedData) return;

      // Tombol 3 biasanya 'Back' (Macro Down), Tombol 4 biasanya 'Forward' (Macro Up)
      // Beberapa mouse mendeteksi button 3 dan 4 sebagai tombol navigasi
      if (e.button === 3) {
        // Mouse Back / Down
        e.preventDefault(); // Mencegah browser kembali ke halaman sebelumnya
        prevImage();
      } else if (e.button === 4) {
        // Mouse Forward / Up
        e.preventDefault(); // Mencegah browser maju ke halaman berikutnya
        nextImage();
      }
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleMouse); // Tambahkan listener mouse

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleMouse);
    };
  }, [currentImageIndex, parsedData]);
  // Fungsi untuk ke gambar berikutnya
  const nextImage = () => {
    if (parsedData) {
      setCurrentImageIndex((p) => (p! + 1) % parsedData.images.length);
      setImageRotation(0); // Reset rotasi saat pindah gambar
    }
  };

  // Fungsi untuk ke gambar sebelumnya
  const prevImage = () => {
    if (parsedData) {
      setCurrentImageIndex(
        (p) => (p! - 1 + parsedData.images.length) % parsedData.images.length
      );
      setImageRotation(0); // Reset rotasi saat pindah gambar
    }
  };
  const handleDacLoginSuccess = (data: {
    cookie: string;
    username: string;
  }) => {
    localStorage.setItem("dac_session", data.cookie);
    localStorage.setItem("username", data.username);
    setDacAuthenticated(true);
  };

  const handleDataSourceLoginSuccess = (data: {
    cookie: string;
    username: string;
  }) => {
    localStorage.setItem("datasource_session", data.cookie);
    setDataSourceAuthenticated(true);
  };

  const handleTerima = async () => {
    await submitToDataSource(true);
  };
  const handleTolak = async () => {
    // const note = customReason || 'Ditolak';
    await submitToDataSource(false);
  };
  const handleSkip = (skipped: boolean) =>
    setCurrentTaskIndex((prev) => prev + 1);

  const rotateImage = (dir: "left" | "right") =>
    setImageRotation((p) => (dir === "right" ? p + 45 : p - 45));

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center dark:text-white">
        Loading...
      </div>
    );

  if (!dacAuthenticated) {
    return (
      <Login
        title="Login DAC"
        loginType="dac"
        onLoginSuccess={handleDacLoginSuccess}
      />
    );
  }

  if (!dataSourceAuthenticated) {
    return (
      <Login
        title="Login Data Source"
        loginType="datasource"
        onLoginSuccess={handleDataSourceLoginSuccess}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-black overflow-hidden relative">
      {/* Sidebar */}
      <div className="flex-shrink-0 h-full">
        <Sidebar
          pendingCount={sheetData.length - currentTaskIndex}
          handleTerima={handleTerima}
          handleTolak={handleTolak}
          handleSkip={handleSkip}
          isSubmitting={isSubmitting}
          evaluationForm={evaluationForm}
          setEvaluationForm={setEvaluationForm}
          customReason={customReason}
          setCustomReason={setCustomReason}
          sidebarOptions={sidebarOptions}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 h-full overflow-hidden relative p-4 md:p-6 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="h-full overflow-y-auto p-4 md:p-6">
          {parsedData && !detailLoading ? (
            <div className="max-w-5xl mx-auto flex flex-col gap-6 pb-20">
              {/* Header Info Parsed */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 border-b dark:border-zinc-700 pb-2">
                  Informasi Sekolah
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                  <InfoItem label="NPSN" value={parsedData.school.npsn} />
                  <InfoItem
                    label="Nama Sekolah"
                    value={parsedData.school.nama_sekolah}
                  />
                  <InfoItem
                    label="Kecamatan"
                    value={parsedData.school.kecamatan}
                  />
                  <InfoItem
                    label="Kabupaten/Kota"
                    value={parsedData.school.kabupaten}
                  />
                  <InfoItem
                    label="Provinsi"
                    value={parsedData.school.provinsi}
                  />
                  <InfoItem
                    label="Alamat"
                    value={parsedData.school.alamat}
                    full
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 border-b dark:border-zinc-700 pb-2">
                  Data Barang
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  <InfoItem
                    label="Nama Barang"
                    value={parsedData.item.nama_barang}
                  />
                  <InfoItem
                    label="Serial Number"
                    value={parsedData.item.serial_number}
                  />
                </div>
              </div>

              {/* Image Gallery */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 border-b dark:border-zinc-700 pb-2">
                  Dokumentasi Pengiriman
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {parsedData.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative cursor-pointer"
                      onClick={() => {
                        setCurrentImageIndex(idx);
                        setImageRotation(0);
                      }}
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900">
                        <img
                          src={img.src}
                          alt={img.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      </div>
                      <p className="mt-2 text-xs font-medium text-center text-zinc-600 dark:text-zinc-400 truncate">
                        {img.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center flex-col gap-4 text-zinc-500">
              {detailLoading
                ? "Loading task data..."
                : sheetData.length === 0
                ? "Fetching task list..."
                : "All tasks completed!"}
            </div>
          )}
        </div>
      </div>

      {/* Layout for Image Viewer Modal */}
      {currentImageIndex !== null && parsedData && (
        <div>
          <StickyInfoBox
            schoolData={parsedData.school}
            itemData={parsedData.item}
            date={verificationDate}
            setDate={setVerificationDate}
            snBapp={snBapp}
            setSnBapp={setSnBapp}
          />

          <div
            className="absolute left-96 top-0 right-0 bottom-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm"
            onClick={() => setCurrentImageIndex(null)}
          >
            {/* Sticky Info */}

            {/* Toolbar */}
            <div
              className="absolute top-4 right-4 z-[60] flex gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => rotateImage("left")}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-bold transition-colors"
              >
                ↺
              </button>
              <button
                onClick={() => rotateImage("right")}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-bold transition-colors"
              >
                ↻
              </button>
              <button
                onClick={() => setCurrentImageIndex(null)}
                className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Main Image Area */}
            <div
              className="flex-1 flex items-center justify-center p-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <TransformWrapper
                key={currentImageIndex + "-" + imageRotation}
                initialScale={1}
                centerOnInit
              >
                <TransformComponent
                  wrapperClass="!w-full !h-full"
                  contentClass="!w-full !h-full flex items-center justify-center"
                >
                  <img
                    src={parsedData.images[currentImageIndex].src}
                    alt="Preview"
                    style={{
                      transform: `rotate(${imageRotation}deg)`,
                      maxWidth: "90vw",
                      maxHeight: "85vh",
                      objectFit: "contain",
                    }}
                    className="rounded shadow-2xl transition-transform duration-200"
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(
                  (currentImageIndex - 1 + parsedData.images.length) %
                    parsedData.images.length
                );
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-6xl transition-colors p-4"
            >
              ‹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(
                  (currentImageIndex + 1) % parsedData.images.length
                );
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-6xl transition-colors p-4"
            >
              ›
            </button>

            {/* Caption */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white font-medium backdrop-blur-md">
              {parsedData.images[currentImageIndex].title} (
              {currentImageIndex + 1} / {parsedData.images.length})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={`flex flex-col ${full ? "col-span-full" : ""}`}>
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded border border-zinc-200 dark:border-zinc-700/50 block min-h-[38px]">
        {value || "-"}
      </span>
    </div>
  );
}
