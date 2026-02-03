"use client";

import { useEffect, useState, useRef, act } from "react";
import Login from "@/components/Login";
import Sidebar, {
  defaultEvaluationValues,
} from "@/components/Sidebar";
import { parseHtmlData, ExtractedData, EvaluationField } from "@/components/HtmlParser";
import StickyInfoBox from "@/components/StickyInfoBox";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import ProcessStatusLight from "@/components/ProcessStatusLight";

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
  const [prefetchedData, setPrefetchedData] = useState<ExtractedData | null>(null);
  const [isTransientDisabled, setIsTransientDisabled] = useState(false);
  const [currentExtractedId, setCurrentExtractedId] = useState<string | null>(null);
  const [rawDataHtml, setRawDataHtml] = useState<string>("");

  // Form State
  const [evaluationForm, setEvaluationForm] = useState(defaultEvaluationValues);
  const [sidebarOptions, setSidebarOptions] = useState<EvaluationField[]>([]);
  const [defaultSidebarOptions, setDefaultSidebarOptions] = useState<EvaluationField[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snBapp, setSnBapp] = useState("");

  // Sidebar Layout State
  const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [manualNote, setManualNote] = useState("");
  const [enableManualNote, setEnableManualNote] = useState(false); // Default OFF
  const [pendingApprovalData, setPendingApprovalData] = useState<any>(null);

  // Auth Usernames
  const [dacUsername, setDacUsername] = useState("");
  const [dataSourceUsername, setDataSourceUsername] = useState("");

  // Status Light & Retry State
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [failedStage, setFailedStage] = useState<"none" | "submit" | "save-approval">("none");
  const [retryPayloads, setRetryPayloads] = useState<{
    submitPayload?: any;
    approvalPayload?: any;
    item?: any;
    currentParsedData?: ExtractedData;
  }>({});
  const [errorMessage, setErrorMessage] = useState("");

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
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [imageRotation, setImageRotation] = useState(0);
  const [showThumbnails, setShowThumbnails] = useState(true);

  // Verification Date
  const [verificationDate, setVerificationDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Datadik State
  const [datadikData, setDatadikData] = useState<{
    kepsek: string | null;
    guruList: any[];
    isLoading: boolean;
  }>({ kepsek: null, guruList: [], isLoading: false });
  const datadikCache = useRef<Map<string, any>>(new Map());

  const formatGuruList = (data: any) => {
    let list = data.guruLain || [];
    if (data.namaKepsek) {
      list = [{ nama: data.namaKepsek, jabatan: "Kepala Sekolah" }, ...list];
    }
    return list;
  };

  const fetchDatadik = async (npsn: string, forceRefetch = false) => {
    if (!npsn || npsn === "-") {
      setDatadikData({ kepsek: null, guruList: [], isLoading: false });
      return;
    }

    if (!forceRefetch && datadikCache.current.has(npsn)) {
      const cached = datadikCache.current.get(npsn);
      setDatadikData({
        kepsek: cached.namaKepsek || "-",
        guruList: formatGuruList(cached),
        isLoading: false,
      });
      return;
    }

    if (forceRefetch) {
      setDatadikData((prev) => ({ ...prev, isLoading: true }));
    } else {
      setDatadikData({ kepsek: null, guruList: [], isLoading: true });
    }

    try {
      const res = await fetch(`/api/fetch-school-data?npsn=${npsn}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data) {
        datadikCache.current.set(npsn, data);
        setDatadikData({
          kepsek: data.namaKepsek || "-",
          guruList: formatGuruList(data),
          isLoading: false,
        });
      }
    } catch (e) {
      console.error("Error fetching datadik:", e);
      setDatadikData({ kepsek: null, guruList: [], isLoading: false });
    }
  };

  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  // Transform reset handled via key={currentImageIndex} on component
  // useEffect removed to avoid conflict/redundancy

  useEffect(() => {
    if (parsedData?.school?.npsn) {
      fetchDatadik(parsedData.school.npsn);
    }
  }, [parsedData?.school?.npsn]);

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
              const match = data.cookie.match(/(?:token|ci_session)=([^;]+)/);
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
        if (localStorage.getItem(`${type}_session`)) {
          if (type === "dac") setDacAuthenticated(true);
          if (type === "datasource") setDataSourceAuthenticated(true);
        }
      }
    };

    Promise.all([refreshSession("dac"), refreshSession("datasource")]).finally(
      () => {
        setIsLoading(false);
        // Load Usernames
        const dacCache = localStorage.getItem("login_cache_dac");
        if (dacCache) {
          try {
            const { username } = JSON.parse(dacCache);
            setDacUsername(username || "");
          } catch (e) { }
        }
        const dsCache = localStorage.getItem("login_cache_datasource");
        if (dsCache) {
          try {
            const { username } = JSON.parse(dsCache);
            setDataSourceUsername(username || "");
          } catch (e) { }
        }
      },
    );
  }, []);

  useEffect(() => {
    if (dacAuthenticated && dataSourceAuthenticated) {
      fetchScrapedData();
    }
  }, [dacAuthenticated, dataSourceAuthenticated]);

  useEffect(() => {
    if (sheetData.length > 0) {
      if (currentTaskIndex < sheetData.length) {
        handleSelectItem(sheetData[currentTaskIndex]);
        setEvaluationForm(defaultEvaluationValues);
        setCustomReason("");
        setEnableManualNote(false);
      } else {
        setSelectedSn(null);
        setParsedData(null);
      }
    }

    if (sheetData.length > 0 && sidebarOptions.length === 0) {
      fetchSidebarOptions();
    }
  }, [sheetData, currentTaskIndex, sidebarOptions.length]);

  useEffect(() => {
    const prefetchNext = async () => {
      if (sheetData.length > 0 && currentTaskIndex + 1 < sheetData.length) {
        const nextItem = sheetData[currentTaskIndex + 1];
        if (prefetchedData && prefetchedData.item.serial_number === nextItem.serial_number) return;

        console.log("Prefetching next item:", nextItem.serial_number);
        try {
          const session = localStorage.getItem("dac_session") || "";
          const result = await fetchItemFromApi(nextItem, session);
          if (result) {
            setPrefetchedData(result);
            if (result.images && result.images.length > 0) {
              result.images.forEach((img) => {
                const i = new Image();
                i.src = img.src;
              });
            }
            // Also prefetch datadik
            if (result.school.npsn && !datadikCache.current.has(result.school.npsn)) {
              fetch(`/api/fetch-school-data?npsn=${result.school.npsn}`, { method: "POST" })
                .then((res) => res.json())
                .then((data) => {
                  if (data) datadikCache.current.set(result.school.npsn, data);
                })
                .catch((e) => console.error("Prefetch Datadik Error", e));
            }
          }
        } catch (e) {
          console.warn("Prefetch failed", e);
        }
      }
    };

    const timer = setTimeout(prefetchNext, 200);
    return () => clearTimeout(timer);
  }, [currentTaskIndex, sheetData, prefetchedData]);

  useEffect(() => {
    console.log("Current ID State Updated:", id);
  }, [id]);

  const fetchScrapedData = async () => {
    const dsSession = localStorage.getItem("datasource_session");

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



  const nextImage = () => {
    if (parsedData && parsedData.images.length > 0) {
      setCurrentImageIndex((prev) =>
        prev === null ? 0 : (prev + 1) % parsedData.images.length,
      );
      setImageRotation(0);
    }
  };

  const prevImage = () => {
    if (parsedData && parsedData.images.length > 0) {
      setCurrentImageIndex((prev) => {
        if (prev === null) return 0;
        return (prev - 1 + parsedData.images.length) % parsedData.images.length;
      });
      setImageRotation(0);
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
          // Pass bapp_id if available in summary
          const bappId = detailJson.data?.summary?.bapp_id;
          return parseHtmlData(detailJson.html, targetId, bappId);
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
    if (item.cek_sn_penyedia === "2") {
      alert(`⚠️ PERINGATAN: Serial Number ${item.serial_number} terindikasi MERAH (GANDA/DUPLIKAT)! Harap cek kembali.`);
    }

    setIsTransientDisabled(true);
    setTimeout(() => setIsTransientDisabled(false), 100);

    setSelectedSn(item.serial_number);
    // REMOVED CLEARING LOGIC FOR SEAMLESS TRANSITION
    // setRawDataHtml(""); 
    // setCurrentImageIndex(null); 

    // Check Prefetch FIRST
    if (prefetchedData && prefetchedData.item.serial_number === item.serial_number) {
      console.log("Using Prefetched Data directly!");
      setParsedData(prefetchedData);
      if (prefetchedData.sentDate) {
        setVerificationDate(prefetchedData.sentDate);
      }
      setSnBapp(item.serial_number || "");
      setCurrentImageIndex(0);
      setImageRotation(0);
      setPrefetchedData(null);
      return;
    }

    // Fallback: Fetch Data
    // NO LOADING STATE - completely seamless (Stale-While-Revalidate)

    setCurrentExtractedId(null);
    setSnBapp(item.serial_number || "");

    let currentSessionId = localStorage.getItem("dac_session");

    try {
      const data = await fetchItemFromApi(item, currentSessionId || "");
      if (data) {
        setCurrentExtractedId(data.extractedId);
        setParsedData(data);
        if (data.sentDate) {
          setVerificationDate(data.sentDate);
        }
        // Reset view to first image only when new data arrives
        setCurrentImageIndex(0);
        setImageRotation(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false); // Just in case it was true somehow
    }
  };

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
    const item = sheetData[0];
    const dsSession = localStorage.getItem("datasource_session");

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

    const rawOptionsMap: Record<string, string[]> = {};

    fieldMapping.forEach((field) => {
      const select = doc.querySelector(`select[name="${field.name}"]`);
      const opts: string[] = [];
      if (select) {
        const options = select.querySelectorAll("option");
        options.forEach((opt) => {
          const val = opt.value;
          if (val && val.trim() !== "") {
            opts.push(val);
          }
        });
      }
      rawOptionsMap[field.id] = opts;
    });

    // 2. Calculate Intersection for Q and R
    const optionsQ = rawOptionsMap["Q"] || [];
    const optionsR = rawOptionsMap["R"] || [];
    const restQ = optionsQ.length > 0 ? optionsQ.slice(1) : [];
    const restR = optionsR.length > 0 ? optionsR.slice(1) : [];
    const commonOptions = restQ.filter(q => restR.includes(q));

    fieldMapping.forEach((field) => {
      // 1. Prepare Filtered/Sorted Options (Existing Logic)
      let finalOpts = rawOptionsMap[field.id] || [];

      // SORTING LOGIC for BAPP HAL 1 (Q) & BAPP HAL 2 (R)
      if ((field.id === "Q" || field.id === "R") && finalOpts.length > 1) {
        const first = finalOpts[0];
        const rest = finalOpts.slice(1);

        const commonInThis = rest.filter(o => commonOptions.includes(o));
        const uniqueInThis = rest.filter(o => !commonOptions.includes(o));

        commonInThis.sort((a, b) => a.localeCompare(b));
        uniqueInThis.sort((a, b) => a.localeCompare(b));

        finalOpts = [first, ...commonInThis, ...uniqueInThis];
      }

      if (finalOpts.length > 0) {
        newOptions.push({ ...field, options: finalOpts });
        newDefaults[field.id] = finalOpts[0];
      } else {
        newOptions.push({
          ...field,
          options: ["Sesuai", "Tidak Sesuai", "Tidak Ada"],
        });
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

      if (e.key.toLowerCase() === "q") rotateImage("left");
      if (e.key.toLowerCase() === "e") rotateImage("right");
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (currentImageIndex === null || !parsedData) return;
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (currentImageIndex === null || !parsedData) return;
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        prevImage();
      }
      if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        nextImage();
      }
    };

    window.addEventListener("keydown", handleKey);
    // Block default early on mousedown
    window.addEventListener("mousedown", handleMouseDown);
    // Execute logic on mouseup
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [currentImageIndex, parsedData]);

  const handleSubmissionProcess = async (
    session: string,
    payload: any,
    item: any,
    currentParsedData: ExtractedData,
    shouldWaitUser: boolean,
    isRetry: boolean = false,
  ) => {
    if (!isRetry) {
      setProcessingStatus("processing");
      setFailedStage("none");
      setErrorMessage("");
      setRetryPayloads({
        submitPayload: payload,
        item: item,
        currentParsedData: currentParsedData,
      });
    } else {
      setProcessingStatus("processing");
      setErrorMessage("");
    }

    // --- OPTIMISTIC UI UPDATE ---
    // If we don't need user intervention (manual note), move to next item IMMEDIATELY
    // This removes the "waiting" feeling. The status light handles the feedback.
    const isOptimistic = !shouldWaitUser && !isRetry;
    if (isOptimistic) {
      handleSkip(false);
    }
    // ----------------------------

    let attempt = 0;
    let submitSuccess = false;

    // Cek apakah kita melewati tahap submit (jika retry spesifik di tahap approval)
    const skipSubmit = isRetry && failedStage === "save-approval";

    if (!skipSubmit) {
      while (true) {
        attempt++;

        if (attempt > 3) {
          console.error("Max retries reached for submit");
          setProcessingStatus("error");
          setFailedStage("submit");
          setErrorMessage("Gagal submit ke datasource setelah 3 percobaan");
          return;
        }

        try {
          const res = await fetch("/api/datasource/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload, cookie: session }),
          });

          const json = await res.json();

          if (json.success) {
            const cachedData = localStorage.getItem("cached_scraped_data");
            if (cachedData) {
              try {
                let parsedCache = JSON.parse(cachedData);
                const indexToRemove = parsedCache.findIndex(
                  (c: any) =>
                    c.npsn === item.npsn && c.no_bapp === item.no_bapp,
                );

                if (indexToRemove !== -1) {
                  parsedCache.splice(indexToRemove, 1);
                  localStorage.setItem(
                    "cached_scraped_data",
                    JSON.stringify(parsedCache),
                  );
                }
              } catch (e) {
                console.error("Gagal update cache lokal setelah submit", e);
              }
            }

            console.log(
              `Submitted ${item.npsn} (${shouldWaitUser ? "Manual Note" : "Background"})`,
            );
            submitSuccess = true;
            break;
          } else {
            console.error(`Submit Failed (Attempt ${attempt}):`, json.message);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue;
          }
        } catch (e) {
          console.error(`Submit Process Error (Attempt ${attempt}):`, e);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
      }
    } else {
      submitSuccess = true;
    }

    if (!submitSuccess) return;

    try {
      let finalNote = "";
      try {
        const viewRes = await fetch("/api/datasource/view-form", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.action_id, cookie: session }),
        });
        const viewJson = await viewRes.json();
        if (viewJson.success && viewJson.html) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(viewJson.html, "text/html");
          const descInput = doc.querySelector(
            'textarea[name="description"]',
          ) as HTMLTextAreaElement;
          if (descInput) {
            finalNote = descInput.value || descInput.textContent || "";
          }

          // Check for alerts Pihak Pertama
          const alerts = Array.from(doc.querySelectorAll(".alert.alert-danger"));
          const isPihakPertamaError = alerts.some((alert) =>
            /Pihak pertama/i.test(alert.textContent || ""),
          );

          if (isPihakPertamaError) {
            const pihakPertamaNote = "(1AN) Pihak pertama hanya boleh dari kepala sekolah/wakil kepala sekolah/guru/pengajar/operator sekolah";
            if (finalNote.length > 0) {
              finalNote = `${finalNote} ${pihakPertamaNote}`;
            } else {
              finalNote = pihakPertamaNote;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching view form", err);
      }

      let currentDacSession = localStorage.getItem("dac_session");
      const storedDac = localStorage.getItem("login_cache_dac");
      if (storedDac) {
        try {
          const { username: dacUser, password: dacPass } =
            JSON.parse(storedDac);
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
          if (loginJson.success) {
            let pureToken = loginJson.data?.token;
            if (!pureToken && loginJson.cookie) {
              const match = loginJson.cookie.match(/(?:token|ci_session)=([^;]+)/);
              pureToken = match ? match[1] : loginJson.cookie;
            }
            if (pureToken) {
              localStorage.setItem("dac_session", pureToken);
              currentDacSession = pureToken;
            }
          }
        } catch (ignore) { }
      }

      if (currentDacSession && currentParsedData.extractedId) {
        const approvalPayload = {
          status: finalNote.length > 0 ? 3 : 2, // 3 = Tolak, 2 = Terima
          id: currentParsedData.extractedId,
          npsn: currentParsedData.school.npsn,
          resi: currentParsedData.resi,
          note: finalNote,
          session_id: currentDacSession,
          bapp_id: currentParsedData.bapp_id || "",
          // bapp_date: formatToDacISO(verificationDate) // Not used in DAC save-approval logic usually unless updated route, but passing note/status/id is simpler
        };

        setRetryPayloads((prev) => ({ ...prev, approvalPayload }));

        if (shouldWaitUser) {
          setPendingApprovalData(approvalPayload);
          setManualNote(finalNote);
          setShowNoteModal(true);
          setProcessingStatus("idle");
        } else {
          let saveAttempt = 0;
          while (true) {
            saveAttempt++;
            if (saveAttempt > 3)
              throw new Error("Max retries for Save Approval");

            const saveRes = await fetch("/api/save-approval", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(approvalPayload),
            });

            if (saveRes.ok) break;
            await new Promise((r) => setTimeout(r, 1000));
          }

          setProcessingStatus("success");
          setTimeout(() => setProcessingStatus("idle"), 3000);

          if (!isOptimistic) {
            handleSkip(false); // Only skip if not already skipped optimistically
          }
        }
      }
    } catch (err) {
      console.error("Error in post-submit logic:", err);
      setProcessingStatus("error");
      setFailedStage("save-approval");
      setErrorMessage("Gagal memproses approval setelah submit");
    }
  };

  const handleTerima = async () => {
    // await submitToDataSource(true);
    await prepareAndSubmit(true);
  };
  const handleTolak = async () => {
    // await submitToDataSource(false);
    await prepareAndSubmit(false);
  };

  const prepareAndSubmit = async (isApproved: boolean) => {
    const session = localStorage.getItem("datasource_session");
    if (!session || !parsedData || sheetData.length === 0) return;

    const currentItem = sheetData[currentTaskIndex];
    if (isSubmitting) return;

    // CAPTURE STATE SNAPSHOTS
    const capturedForm = { ...evaluationForm };
    const capturedSnBapp = snBapp;
    const capturedDate = verificationDate;
    const capturedId = id;
    const capturedItem = { ...currentItem };
    const capturedParsedData = { ...parsedData };

    const barcodeSnStatus = capturedForm["O"];
    let finalSnBapp = capturedSnBapp;
    // logic in component handles setSnBapp

    const payload: Record<string, string> = {
      id_user: capturedId,
      npsn: capturedItem.npsn,
      sn_penyedia: capturedItem.serial_number,
      cek_sn_penyedia: capturedItem.cek_sn_penyedia,
      id_update: capturedItem.action_id,
      no_bapp: capturedItem.bapp,
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

    // Determine strict wait
    const shouldWaitUser = enableManualNote;

    await handleSubmissionProcess(session, payload, capturedItem, capturedParsedData, shouldWaitUser);
  }

  const handleRetry = async () => {
    if (processingStatus !== "error") return;
    const session = localStorage.getItem("datasource_session");
    if (!session || !retryPayloads.item) return;

    await handleSubmissionProcess(
      session,
      retryPayloads.submitPayload,
      retryPayloads.item,
      retryPayloads.currentParsedData!,
      false, // retry usually implies we just want to push it through
      true
    );
  };

  const handleSkip = (skipped: boolean) => {
    setIsTransientDisabled(true);
    setCurrentTaskIndex((prev) => prev + 1);
  };

  const rotateImage = (dir: "left" | "right") =>
    setImageRotation((p) => (dir === "right" ? p + 90 : p - 90));


  const executeSaveApproval = async (payload: any) => {
    // Helper for manual modal
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
      note: manualNote,
    };

    await executeSaveApproval(updatedPayload);
    setShowNoteModal(false);
    setPendingApprovalData(null);
    handleSkip(false);
  };


  useEffect(() => {
    const checkDoubleData = async () => {
      if (!parsedData?.school?.npsn) return;
      const currentSessionId = localStorage.getItem("dac_session");
      if (!currentSessionId) return;

      try {
        const res = await fetch("/api/check-double-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            term: parsedData.school.npsn,
            session_id: currentSessionId,
          }),
        });

        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
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
  }, [parsedData?.school?.npsn]);

  useEffect(() => {
    if (parsedData?.shipping?.firstLogDate) {
      const detectedDate = parseDateToInputFormat(parsedData.shipping.firstLogDate);
      if (detectedDate) {
        setVerificationDate(detectedDate);
        console.log("Auto-populated verification date:", detectedDate);
      }
    }
  }, [parsedData]);

  // Render Functions
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
        onLoginSuccess={(d) => {
          localStorage.setItem("dac_session", d.cookie);
          localStorage.setItem("username", d.username);
          setDacAuthenticated(true);
        }}
      />
    );
  }

  if (!dataSourceAuthenticated) {
    return (
      <Login
        title="Login ASSHAL.TECH"
        loginType="datasource"
        onLoginSuccess={(d) => {
          localStorage.setItem("datasource_session", d.cookie);
          setDataSourceAuthenticated(true);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-black overflow-hidden relative">
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
          isSubmitting={processingStatus === 'processing'}
          evaluationForm={evaluationForm}
          setEvaluationForm={setEvaluationForm}
          customReason={customReason}
          setCustomReason={setCustomReason}
          sidebarOptions={sidebarOptions}
          currentImageIndex={currentImageIndex}
          snBapp={snBapp}
          setSnBapp={setSnBapp}
          position={sidebarPosition}
          setPosition={handleSetSidebarPosition}
          enableManualNote={enableManualNote}
          setEnableManualNote={setEnableManualNote}
          dacUsername={dacUsername}
          dataSourceUsername={dataSourceUsername}
          currentItemSn={sheetData[currentTaskIndex]?.serial_number}
          sheetData={sheetData}
          processingStatus={processingStatus}
          failedStage={failedStage}
          errorMessage={errorMessage}
          onRetry={handleRetry}
        />
      </div>

      {/* Modal Note Manual */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl p-6 w-full max-w-lg border border-zinc-200 dark:border-zinc-700 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white flex items-center gap-2">
              <span className="text-amber-500">✎</span> Edit Catatan Approval
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Silakan sesuaikan catatan sebelum menyimpan data ke DAC.
            </p>
            <textarea
              value={manualNote}
              onChange={(e) => setManualNote(e.target.value)}
              className="w-full h-32 p-3 border rounded-md dark:bg-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm font-mono mb-4 resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setPendingApprovalData(null);
                  setProcessingStatus("idle");
                }}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
                disabled={processingStatus === 'processing'}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmManualNote}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20"
                disabled={processingStatus === 'processing'}
              >
                {processingStatus === 'processing' ? 'Menyimpan...' : 'Simpan Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentImageIndex !== null && parsedData && (
        <div>
          <StickyInfoBox
            schoolData={parsedData.school}
            itemData={parsedData.item}
            history={parsedData.history}
            date={verificationDate}
            setDate={setVerificationDate}
            kepsek={datadikData.kepsek}
            guruList={datadikData.guruList}
            isLoadingGuru={datadikData.isLoading}
            onRefetchDatadik={() => parsedData.school.npsn && fetchDatadik(parsedData.school.npsn, true)}
          />

          <div
            className={`absolute top-0 bottom-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm transition-all duration-300 ${sidebarPosition === "left" ? "left-96 right-0" : "left-0 right-96"
              }`}
            onClick={() => setCurrentImageIndex(null)}
          >
            <div
              className="absolute top-4 right-4 z-[60] flex gap-2 items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-black/50 text-white px-3 py-1.5 rounded-full font-bold text-sm select-none backdrop-blur-md border border-white/10 shadow-sm mr-2">
                {currentImageIndex! + 1} / {parsedData.images.length}
              </div>
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

            <div
              className="flex-1 flex items-center justify-center p-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <TransformWrapper
                key={currentImageIndex} // Force remount on image change to reset zoom
                ref={transformRef}
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit
              >
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <img
                    src={parsedData.images[currentImageIndex].src}
                    alt={parsedData.images[currentImageIndex].title}
                    className="max-h-full max-w-full object-contain transition-transform duration-200"
                    style={{
                      transform: `rotate(${imageRotation}deg)`,
                    }}
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>

            <div
              className="flex flex-col z-[60]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pb-2">
                <button
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  className="bg-black/50 hover:bg-black/70 text-zinc-300 hover:text-white px-6 py-1 rounded-t-lg backdrop-blur text-xs font-semibold transition-all border-t border-x border-zinc-700/50"
                >
                  {showThumbnails ? "▼ Sembunyikan" : "▲ Tampilkan Gallery"}
                </button>
              </div>

              {showThumbnails && (
                <div
                  className="h-20 bg-black/50 overflow-x-auto whitespace-nowrap p-2 flex gap-2 justify-center animate-in slide-in-from-bottom-2 duration-200"
                >
                  {parsedData.images.map((img, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentImageIndex(idx);
                        setImageRotation(0);
                      }}
                      className={`inline-block h-full aspect-square cursor-pointer rounded overflow-hidden border-2 transition-all ${currentImageIndex === idx
                        ? "border-yellow-500 scale-105"
                        : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                    >
                      <img
                        src={img.src}
                        alt={img.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
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
    <div className={`p-3 bg-zinc-50 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700 ${full ? "col-span-full" : ""}`}>
      <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate" title={value}>
        {value || "-"}
      </div>
    </div>
  );
}
