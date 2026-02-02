"use client";

import { useEffect, useState, useRef, act } from "react";
import Login from "@/components/Login";
import Sidebar, {
  defaultEvaluationValues,
} from "@/components/Sidebar";
import { parseHtmlData, ExtractedData, EvaluationField } from "@/components/HtmlParser";
import StickyInfoBox from "@/components/StickyInfoBox";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const parseDateToInputFormat = (dateStr: string): string | null => {
  if (!dateStr || dateStr === "-" || dateStr === "") return null;

  // Coba format langsung (e.g. YYYY-MM-DD or standard English)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  // Mapping bulan Indonesia/Short ke English
  const monthMap: Record<string, string> = {
    Januari: "January",
    Jan: "Jan",
    Februari: "February",
    Feb: "Feb",
    Maret: "March",
    Mar: "Mar",
    April: "April",
    Apr: "Apr",
    Mei: "May",
    Juni: "June",
    Jun: "Jun",
    Juli: "July",
    Jul: "Jul",
    Agustus: "August",
    Agu: "Aug",
    September: "September",
    Sep: "Sep",
    Oktober: "October",
    Okt: "Oct",
    November: "November",
    Nov: "Nov",
    Desember: "December",
    Des: "Dec",
  };

  let cleanStr = dateStr;

  // Replace nama bulan
  Object.keys(monthMap).forEach((key) => {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    cleanStr = cleanStr.replace(regex, monthMap[key]);
  });

  date = new Date(cleanStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return null;
};

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
  const [prefetchedData, setPrefetchedData] = useState<ExtractedData | null>(null); // New Prefetch State
  const [isTransientDisabled, setIsTransientDisabled] = useState(false); // New Debounce State

  const [currentExtractedId, setCurrentExtractedId] = useState<string | null>(
    null,
  );
  const [rawDataHtml, setRawDataHtml] = useState<string>("");

  // Form State
  const [evaluationForm, setEvaluationForm] = useState(defaultEvaluationValues);
  const [sidebarOptions, setSidebarOptions] = useState<EvaluationField[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snBapp, setSnBapp] = useState("");

  // Sidebar Layout State
  const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">(
    "left",
  );
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [manualNote, setManualNote] = useState("");
  const [enableManualNote, setEnableManualNote] = useState(false); // Default OFF
  const [pendingApprovalData, setPendingApprovalData] = useState<any>(null);

  useEffect(() => {
    const storedPos = localStorage.getItem("sidebar_layout");
    if (storedPos === "left" || storedPos === "right") {
      setSidebarPosition(storedPos);
    }
  }, []);

  const handleSetSidebarPosition = (pos: "left" | "right") => {
    setSidebarPosition(pos);
    localStorage.setItem("sidebar_layout", pos);
  };
  const [id, setId] = useState("");

  // Image Viewer State
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(
    null,
  );
  const [imageRotation, setImageRotation] = useState(0);

  // Verification Date
  const [verificationDate, setVerificationDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    // Check localStorage for BACKWARD COMPATIBILITY
    const oldSession = localStorage.getItem("ci_session");
    if (oldSession && !localStorage.getItem("dac_session")) {
      localStorage.setItem("dac_session", oldSession);
      localStorage.removeItem("ci_session");
    }

    // Auto-refresh using stored credentials
    const refreshSession = async (type: "dac" | "datasource") => {
      const stored = localStorage.getItem(`login_cache_${type}`);
      if (stored) {
        try {
          const { username, password } = JSON.parse(stored);
          if (username && password) {
            console.log(`Auto-refreshing ${type} session...`);
            const res = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username, password, type }),
            });
            const data = await res.json();
            if (data.success && data.cookie) {
              // Extract cookie
              let sessionValue = "";
              const match = data.cookie.match(/ci_session=([^;]+)/);
              if (match && match[1]) {
                sessionValue = match[1];
              } else {
                sessionValue = data.cookie;
              }

              localStorage.setItem(`${type}_session`, sessionValue);
              if (type === "dac") setDacAuthenticated(true);
              if (type === "datasource") setDataSourceAuthenticated(true);
              console.log(`${type} session refreshed.`);
            }
          }
        } catch (e) {
          console.error(`Failed to auto-refresh ${type} session`, e);
        }
      } else {
        // Fallback: check if session token exists (manually set or from older login)
        // If token exists, we consider them authenticated for now, but ideally we want to refresh.
        // If no credentials strictly required, we just check existence.
        if (localStorage.getItem(`${type}_session`)) {
          if (type === "dac") setDacAuthenticated(true);
          if (type === "datasource") setDataSourceAuthenticated(true);
        }
      }
    };

    // Execute concurrently
    Promise.all([refreshSession("dac"), refreshSession("datasource")]).finally(
      () => {
        setIsLoading(false);
      },
    );
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
        setEnableManualNote(false);
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

  // Parse HTML Effect REMOVED - Direct handling now
  // useEffect(() => {
  //   if (rawDataHtml && currentExtractedId) {
  //     parseHtml(rawDataHtml, currentExtractedId);
  //   }
  // }, [rawDataHtml, currentExtractedId]);

  // Prefetch Effect
  useEffect(() => {
    const prefetchNext = async () => {
      if (sheetData.length > 0 && currentTaskIndex + 1 < sheetData.length) {
        const nextItem = sheetData[currentTaskIndex + 1];
        // Avoid re-fetching if we already have it
        if (prefetchedData && prefetchedData.item.serial_number === nextItem.serial_number) return;

        console.log("Prefetching next item:", nextItem.serial_number);
        try {
          const session = localStorage.getItem("dac_session") || "";
          const result = await fetchItemFromApi(nextItem, session);
          if (result) {
            setPrefetchedData(result);

            // Explicit Image Preloading
            if (result.images && result.images.length > 0) {
              console.log(`Preloading ${result.images.length} images...`);
              result.images.forEach((img) => {
                const i = new Image();
                i.src = img.src;
              });
            }
          }
        } catch (e) {
          console.warn("Prefetch failed", e);
        }
      }
    };

    // Delay prefetch slightly to prioritize current render
    const timer = setTimeout(prefetchNext, 200);
    return () => clearTimeout(timer);
  }, [currentTaskIndex, sheetData, prefetchedData]);

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
        const filtered = json.data.filter((item: any) => item.type === "DAC" && item.status === "PROSES");

        if (
          typeof window !== "undefined" &&
          window.location.search.includes("reverse=true")
        ) {
          filtered.reverse();
        }
        setSheetData(filtered);
        setCurrentTaskIndex(0);
      } else {
        console.error("Failed to fetch scraped data:", json.message);
      }
    } catch (e) {
      console.error("Error fetching scraped data:", e);
    }
  };

  const fetchItemFromApi = async (item: any, currentSessionId: string): Promise<ExtractedData | null> => {
    try {
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
        const detailRes = await fetch("/api/get-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: targetId, session_id: currentSessionId }),
        });
        const detailJson = await detailRes.json();

        if (detailJson.html) {
          return parseHtmlData(detailJson.html, targetId);
        }
      } else {
        console.log("No extracted ID found for this item");
      }
    } catch (err) {
      console.error("Fetch Item Error", err);
    }
    return null;
  }

  const handleSelectItem = async (item: any) => {
    // Check SN Merah / Duplicate
    if (item.cek_sn_penyedia === "2") {
      alert(`⚠️ PERINGATAN: Serial Number ${item.serial_number} terindikasi MERAH (GANDA/DUPLIKAT)! Harap cek kembali.`);
    }

    // Debounce UI
    setIsTransientDisabled(true);
    setTimeout(() => setIsTransientDisabled(false), 100); // 100ms safety lock

    setSelectedSn(item.serial_number);
    setDetailLoading(true);
    setRawDataHtml("");
    // Clear previous data immediately to prevent "ghost" images from previous item
    setParsedData(null);

    // Check Prefetch
    if (prefetchedData && prefetchedData.item.serial_number === item.serial_number) {
      console.log("Using Prefetched Data!");
      setParsedData(prefetchedData);
      if (prefetchedData.sentDate) {
        setVerificationDate(prefetchedData.sentDate);
      }
      setDetailLoading(false);
      setSnBapp(item.serial_number || "");
      setCurrentImageIndex(0); // Reset to first image
      setImageRotation(0); // Reset rotation
      setPrefetchedData(null); // Consume it
      return;
    }

    setParsedData(null);
    setCurrentExtractedId(null);
    setSnBapp(item.serial_number || "");

    let currentSessionId = localStorage.getItem("dac_session") || "";

    try {
      const data = await fetchItemFromApi(item, currentSessionId);
      if (data) {
        setCurrentExtractedId(data.extractedId);
        setParsedData(data);
        if (data.sentDate) {
          setVerificationDate(data.sentDate);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  // parseHtml removed - using import
  const handleRefetch = async () => {
    if (sheetData.length > 0 && sheetData[currentTaskIndex]) {
      const item = sheetData[currentTaskIndex];
      setDetailLoading(true);
      try {
        const session = localStorage.getItem("dac_session") || "";
        const data = await fetchItemFromApi(item, session);
        if (data) {
          setParsedData(data);
        }
      } finally {
        setDetailLoading(false);
      }
    }
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

    // CAPTURE STATE SNAPSHOTS
    const capturedForm = { ...evaluationForm }; // Copy object
    const capturedSnBapp = snBapp;
    const capturedDate = verificationDate;
    const capturedId = id;
    const capturedItem = { ...currentItem };
    const capturedParsedData = { ...parsedData }; // Risky if deep object but mostly primitives and arrays. 
    // parsedData has arrays inside (images, history), checking if we need deep clone.
    // We only access properties, so shallow copy of parsedData is fine as long as we don't mutate.

    // OPTIMISTIC UPDATE CHECK
    // Only optimistic if we don't need manual intervention (Modal)
    const isOptimistic = !enableManualNote;

    if (!isOptimistic) {
      setIsSubmitting(true);
    }

    if (isOptimistic) {
      // Optimistically move to next item
      handleSkip(false);
    }

    try {
      // sn_bapp Logic:
      // "BARCODE SN BAPP" is field 'O'. Check the value.
      // If "Ada" (or "Sesuai" depending on exact option value), use system SN.
      // Otherwise use manual input.
      const barcodeSnStatus = capturedForm["O"];
      let finalSnBapp = capturedSnBapp;
      // if (barcodeSnStatus === "Ada" || barcodeSnStatus === "Sesuai") {
      //   finalSnBapp = capturedItem.serial_number;
      // }

      const payload: Record<string, string> = {
        id_user: capturedId,
        npsn: capturedItem.npsn, // Use scrape data preferably
        sn_penyedia: capturedItem.serial_number,
        cek_sn_penyedia: capturedItem.cek_sn_penyedia,
        id_update: capturedItem.action_id, // action_id is id_update
        no_bapp: capturedItem.bapp, // bapp from scrape is no_bapp
        ket_tgl_bapp: capturedForm["F"],
        tgl_bapp: capturedDate,
        sn_bapp: finalSnBapp,
        geo_tag: capturedForm["G"],
        f_papan_identitas: capturedForm["H"],
        f_box_pic: capturedForm["I"],
        f_unit: capturedForm["J"],
        spesifikasi_dxdiag: capturedForm["K"],
        bc_bapp_sn: capturedForm["O"],
        bapp_hal1: capturedForm["Q"],
        bapp_hal2: capturedForm["R"],
        nm_ttd_bapp: capturedForm["S"],
        stempel: capturedForm["T"],
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
              id: capturedItem.action_id,
              cookie: session,
            }),
          });
          const viewJson = await viewRes.json();
          if (viewJson.success && viewJson.html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(viewJson.html, "text/html");

            // Strategy 1: Look for textarea with name="description" (Most likely location based on provided HTML)
            const descInput = doc.querySelector(
              'textarea[name="description"]',
            ) as HTMLTextAreaElement;
            if (descInput) {
              finalNote = descInput.value || descInput.textContent || "";
            }

            // Strategy 2
            const alerts = Array.from(
              doc.querySelectorAll(".alert.alert-danger"),
            );
            const isPihakPertamaError = alerts.some((alert) =>
              /Pihak pertama/i.test(alert.textContent || ""),
            );

            if (isPihakPertamaError) {
              const pihakPertamaNote =
                "(1AN) Pihak pertama hanya boleh dari kepala sekolah/wakil kepala sekolah/guru/pengajar/operator sekolah";

              // Gabungkan jika finalNote sudah ada isinya, jika tidak langsung set
              if (finalNote.length > 0) {
                // Menambahkan spasi atau baris baru sebagai pemisah
                finalNote = `${finalNote} ${pihakPertamaNote}`;
              } else {
                finalNote = pihakPertamaNote;
              }
            }

            console.log(
              "Parsed Rejection Note:",
              finalNote,
              "and status",
              finalNote.length > 0 ? "Rejected" : "Approved",
            );
          }
        } catch (err) {
          console.error("Error fetching view form", err);
        }

        // Call save-approval (DAC)
        // status: 2 = Terima, 3 = Tolak

        // RE-LOGIN DAC LOGIC (Auto-Refresh Session)
        let currentDacSession = localStorage.getItem("dac_session");
        const storedDac = localStorage.getItem("login_cache_dac");

        if (storedDac) {
          try {
            const { username: dacUser, password: dacPass } =
              JSON.parse(storedDac);
            if (dacUser && dacPass) {
              // Silently refresh session
              const loginRes = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  username: dacUser,
                  password: dacPass,
                  type: "dac",
                }),
              });
              const loginJson = await loginRes.json();
              if (loginJson.success && loginJson.cookie) {
                // Extract cookie value if needed, similar to Login.tsx
                let newSession = loginJson.cookie;
                const match = newSession.match(/ci_session=([^;]+)/);
                if (match && match[1]) {
                  newSession = match[1];
                } else {
                  newSession = loginJson.cookie; // Fallback
                }

                localStorage.setItem("dac_session", newSession);
                currentDacSession = newSession;
                console.log("DAC Session Refreshed automatically before save");
              }
            }
          } catch (ignore) {
            console.warn(
              "Failed to auto-refresh DAC session before save, trying with existing one",
            );
          }
        }

        if (currentDacSession && capturedParsedData.extractedId) {
          // Di dalam submitToDataSource setelah finalNote didapatkan:
          console.log("Parsed Rejection Note:", finalNote);

          const approvalPayload = {
            status: finalNote.length > 0 ? 3 : 2,
            id: capturedParsedData.extractedId,
            npsn: capturedParsedData.school.npsn,
            resi: capturedParsedData.resi,
            note: finalNote,
            session_id: currentDacSession,
          };

          if (enableManualNote) {
            // INTERUPSI: Simpan data dan tampilkan Modal
            setPendingApprovalData(approvalPayload);
            setManualNote(finalNote); // Isi textarea modal dengan alasan otomatis
            setIsSubmitting(false); // Enable buttons for Modal interaction
            setShowNoteModal(true);
          } else {
            // FLOW LAMA: Langsung jalankan
            await executeSaveApproval(approvalPayload);
            setIsSubmitting(false);
          }
        }
      } else {
        console.error("Submit failed", json.message);
        alert(`Gagal submit: ${json.message}`);
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error("Submit error", e);
      alert("Terjadi kesalahan saat submit.");
      setIsSubmitting(false);
    }
  };
  const executeSaveApproval = async (payload: any) => {
    try {
      const res = await fetch("/api/save-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log("Saved to DAC");
      return await res.json();
    } catch (dacErr) {
      console.error("Failed to save to DAC", dacErr);
      alert("Gagal menyimpan ke DAC");
    }
  };

  const handleConfirmManualNote = async () => {
    if (!pendingApprovalData) return;

    const updatedPayload = {
      ...pendingApprovalData,
      note: manualNote, // Gunakan catatan yang sudah diedit user
    };

    await executeSaveApproval(updatedPayload);
    setShowNoteModal(false);
    setPendingApprovalData(null);
    handleSkip(false); // Pindah ke task berikutnya setelah sukses
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
              `Harap teliti kembali sebelum melakukan approval.`,
            );
          }
        }
      } catch (err) {
        console.error("Gagal mengecek double data:", err);
      }
    };

    checkDoubleData();
  }, [parsedData?.school?.npsn]); // Hanya berjalan ketika NPSN pada parsedData berubah

  // Auto-populate Date from Shipping History
  useEffect(() => {
    if (parsedData?.shipping?.firstLogDate) {
      const detectedDate = parseDateToInputFormat(parsedData.shipping.firstLogDate);
      if (detectedDate) {
        setVerificationDate(detectedDate);
        console.log("Auto-populated verification date:", detectedDate);
      }
    }
  }, [parsedData]);

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
        (p) => (p! - 1 + parsedData.images.length) % parsedData.images.length,
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
  const handleSkip = (skipped: boolean) => {
    // Gapless disable: Disable immediately when skipping to next item
    setIsTransientDisabled(true);
    setCurrentTaskIndex((prev) => prev + 1);
  };

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
        title="Login ASSHAL.TECH"
        loginType="datasource"
        onLoginSuccess={handleDataSourceLoginSuccess}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-black overflow-hidden relative">
      {/* Main Content */}
      <div
        className={`flex-1 h-full overflow-hidden relative bg-zinc-50/50 dark:bg-zinc-900/50 ${sidebarPosition === "left" ? "order-2" : "order-1"
          }`}
      >
        <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
          {parsedData && !detailLoading ? (
            <div className="max-w-5xl mx-auto flex flex-col gap-6">
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
                  <div className="col-span-full border-t border-dashed border-zinc-300 dark:border-zinc-700 mt-2 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                      <InfoItem
                        label="Update Pengiriman"
                        value={parsedData.shipping?.firstLogDate || "-"}
                      />
                      <InfoItem
                        label="Status Pengiriman"
                        value={parsedData.shipping?.firstStatus || "-"}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {/* Log Approval Section */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 border-b dark:border-zinc-700 pb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Riwayat Approval
                </h2>

                {parsedData.history.length > 0 ? (
                  <div className="space-y-3">
                    {parsedData.history.map((log, idx) => (
                      <div
                        key={idx}
                        className={`border dark:border-zinc-700 rounded-lg p-4 dark:bg-zinc-900/30 ${log.status.toLowerCase().includes("setuju") ||
                          log.status.toLowerCase().includes("terima")
                          ? "bg-green-100"
                          : "bg-red-100"
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-zinc-500 font-mono">
                            {log.date}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.status.toLowerCase().includes("setuju") ||
                              log.status.toLowerCase().includes("terima")
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}
                          >
                            {log.status}
                          </span>
                        </div>
                        {log.user && (
                          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            Oleh: {log.user}
                          </div>
                        )}
                        <div className="text-sm text-zinc-600 dark:text-zinc-400 italic">
                          <span className="font-medium not-italic">
                            Catatan:
                          </span>{" "}
                          {log.note}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-400 text-sm italic">
                    Belum ada riwayat approval untuk item ini.
                  </div>
                )}
              </div>
              {/* Image Gallery */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-5">
                <div className="flex justify-between items-center mb-4 border-b dark:border-zinc-700 pb-2">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    Dokumentasi Pengiriman
                  </h2>
                  <button
                    onClick={handleRefetch}
                    disabled={detailLoading}
                    className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded text-zinc-600 dark:text-zinc-300 transition-colors flex items-center gap-1"
                    title="Refetch current item"
                  >
                    <span className={detailLoading ? "animate-spin" : ""}>⟳</span> Refetch
                  </button>
                </div>
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

      {/* Sidebar */}
      <div
        className={`flex-shrink-0 h-full ${sidebarPosition === "left"
          ? "order-1 border-r border-zinc-700"
          : "order-2 border-l border-zinc-700"
          }`}
      >
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
          currentImageIndex={currentImageIndex}
          date={verificationDate}
          setDate={setVerificationDate}
          snBapp={snBapp}
          setSnBapp={setSnBapp}
          position={sidebarPosition}
          setPosition={handleSetSidebarPosition}
          enableManualNote={enableManualNote}
          setEnableManualNote={setEnableManualNote}
          transientDisabled={isTransientDisabled}
          originalSn={sheetData[currentTaskIndex]?.serial_number}
        />
      </div>

      {/* Layout for Image Viewer Modal */}
      {
        currentImageIndex !== null && parsedData && (
          <div>
            <StickyInfoBox
              schoolData={parsedData.school}
              itemData={parsedData.item}
              history={parsedData.history}
            />

            <div
              className={`absolute top-0 bottom-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm transition-all duration-300 ${sidebarPosition === "left" ? "left-96 right-0" : "left-0 right-96"
                }`}
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
                    parsedData.images.length,
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
                    (currentImageIndex + 1) % parsedData.images.length,
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
        )
      }
      {
        showNoteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-white font-bold">
                  Edit Catatan Approval DAC
                </h3>
                <span
                  className={`px-2 py-1 rounded text-[10px] font-bold ${pendingApprovalData?.status === 2
                    ? "bg-green-900 text-green-400"
                    : "bg-red-900 text-red-400"
                    }`}
                >
                  {pendingApprovalData?.status === 2 ? "APPROVE" : "REJECT"}
                </span>
              </div>
              <div className="p-4">
                <label className="text-xs text-zinc-500 mb-2 block uppercase font-bold tracking-tighter">
                  Catatan (Preview dari Source):
                </label>
                <textarea
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full h-48 bg-black border border-zinc-700 rounded p-3 text-sm text-zinc-200 focus:border-blue-500 outline-none font-mono"
                  placeholder="Tambahkan catatan tambahan di sini..."
                />
              </div>
              <div className="p-4 bg-zinc-800/50 flex gap-2">
                <button
                  onClick={() => {
                    executeSaveApproval(pendingApprovalData);
                    setShowNoteModal(false);
                    handleSkip(false);
                  }}
                  className="flex-1 py-2 text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Lewati Edit
                </button>
                <button
                  onClick={handleConfirmManualNote}
                  className="flex-2 px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-sm transition-colors"
                >
                  SIMPAN KE DAC
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
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
