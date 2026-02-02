"use client";
import { useEffect, useState } from "react";
import Spinner from "./Spinner";
import ProcessStatusLight from "./ProcessStatusLight";

export interface EvaluationField {
  id: string;
  label: string;
  name: string; // Added to map to HTML name
  options: string[];
}

// Static Error Map (Keep as is for now, or move to dynamic if error messages change)
export const errorMap: Record<string, Record<string, string>> = {
  G: {
    "Tidak sesuai": "(5A) Geo Tagging tidak sesuai",
    "Tidak ada": "(5B) Geo Tagging tidak ada",
    "Tidak terlihat jelas": "(5C) Geo Tagging tidak terlihat jelas",
  },
  H: {
    "Tidak sesuai": "(4A) Foto sekolah tidak sesuai",
    "Tidak ada": "(4B) Foto sekolah tidak ada",
    "Tidak terlihat jelas": "(4E) Foto sekolah tidak terlihat jelas",
  },
  I: {
    "Tidak sesuai": "(4C) Foto Box dan PIC tidak sesuai",
    "Tidak ada": "(4D) Foto Box dan PIC tidak ada",
  },
  J: {
    "Tidak sesuai": "(2B) Foto kelengkapan Laptop tidak sesuai",
    "Tidak ada": "(2A) Foto kelengkapan Laptop tidak ada",
  },
  K: {
    "Tidak sesuai": "(6A) DxDiag tidak sesuai",
    "Tidak ada": "(6B) DxDiag tidak ada",
    "Tidak terlihat jelas": "(6C) DxDiag tidak terlihat jelas",
  },
  O: {
    "Tidak sesuai":
      "(1AI) Barcode SN pada BAPP tidak sesuai dengan data web DAC",
    "Tidak ada": "(1AF) Barcode SN pada BAPP tidak ada",
    "Tidak terlihat jelas": "(1AG) Barcode SN pada BAPP tidak terlihat jelas",
  },
  Q: {
    "Ceklis tidak lengkap": "(1D) Ceklis BAPP tidak lengkap pada halaman 1",
    "Tidak Sesuai/Rusak/Tidak Ada":
      "(1Q) Ceklis BAPP tidak sesuai/rusak/tidak ada pada halaman 1",
    "Tidak terlihat jelas": "(1L) BAPP Halaman 1 tidak terlihat jelas",
    Diedit: "(1S) BAPP Hal 1 tidak boleh diedit digital",
    "Tidak ada": "(1W) BAPP Hal 1 tidak ada",
    "Data tidak lengkap": "(1N) Data BAPP halaman 1 tidak lengkap",
    "Double ceklis": "(1I) Double ceklis pada halaman 1 BAPP",
    "Data BAPP sekolah tidak sesuai": "(1K) Data BAPP sekolah tidak sesuai",
    "BAPP terpotong": "(1AL) BAPP Halaman 1 terpotong",
    "Pihak pertama bukan dari tenaga pendidik":
      "(1AN) Pihak pertama hanya boleh dari kepala sekolah/wakil kepala sekolah/guru/pengajar/operator sekolah",
  },
  R: {
    "Ceklis tidak lengkap": "(1E) Ceklis BAPP tidak lengkap pada halaman 2",
    "Ceklis Belum Dapat Diterima": "(1Y) Ceklis Belum Dapat Diterima",
    "Tidak terlihat jelas": "(1M) BAPP Halaman 2 tidak terlihat jelas",
    Diedit: "(1T) BAPP Hal 2 tidak boleh diedit digital",
    "Tidak ada": "(1X) BAPP Hal 2 tidak ada",
    "Tanggal tidak ada": "(1F) Tanggal pada BAPP hal 2 tidak ada",
    "Tanggal tidak konsisten": "(1Z) Tanggal pada BAPP hal 2 tidak konsisten",
    "Tidak ada paraf": "(1B) Simpulan BAPP pada hal 2 belum diparaf",
    "Double ceklis": "(1AK) Double ceklis pada halaman 2 BAPP",
    "Ceklis tidak sesuai/rusak/tidak ada":
      "(1AJ) Ceklis BAPP hal 2, terdapat ceklis TIDAK SESUAI/TIDAK ADA",
    "BAPP terpotong": "(1AM) BAPP Halaman 2 terpotong",
  },
  S: {
    "Tidak konsisten":
      "(1H) Data penanda tangan pada halaman 1 dan halaman 2 BAPP tidak konsisten",
    "TTD tidak ada":
      "(1G) Tidak ada tanda tangan dari pihak sekolah atau pihak kedua",
    "Tidak ada nama terang pada bagian tanda tangan":
      "(1AH) Tidak ada nama terang pada bagian tanda tangan",
  },
  T: {
    "Tidak sesuai":
      "(1O) Stempel pada BAPP halaman 2 tidak sesuai dengan sekolahnya",
    "Tidak ada": "(1P) Stempel tidak ada",
    "Tidak terlihat jelas": "(1AD) Stempel tidak terlihat",
  },
};

// Mapping Index Image ke ID Field Form
const IMAGE_FIELD_MAPPING: Record<number, string[]> = {
  0: ["G", "H", "I"],    // Gambar 1 (Plang Sekolah/Serah Terima)
  1: ["J"],              // Gambar 2 (Kelengkapan)
  2: ["K"],              // Gambar 3 (DxDiag)
  3: ["O", "Q"],         // Gambar 4 (BAPP Hal 1)
  4: ["F", "R", "S", "T"] // Gambar 5 (BAPP Hal 2)
  // Index 5+ akan default ke semua opsi
};

interface RadioOptionProps {
  fieldId: string;
  option: string;
  checked: boolean;
  onChange: (id: string, value: string) => void;
  disabled: boolean;
  isDanger?: boolean;
}

const RadioOption = ({
  fieldId,
  option,
  checked,
  onChange,
  disabled,
  isDanger,
}: RadioOptionProps) => (
  <button
    type="button"
    onClick={() => onChange(fieldId, option)}
    disabled={disabled}
    className={`px-3 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 mb-1 mr-1
      ${
        checked
          ? isDanger
            ? "bg-red-600 border-red-600 text-white font-semibold"
            : "bg-blue-500 border-blue-500 text-white font-semibold"
          : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500"
      }`}
  >
    {option}
  </button>
);

interface SidebarProps {
  pendingCount: number | null;
  handleTerima: () => void;
  handleTolak: () => void;
  handleSkip: (skipped: boolean) => void;
  isSubmitting: boolean;
  evaluationForm: Record<string, string>;
  setEvaluationForm: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  customReason: string;
  setCustomReason: (val: string) => void;
  sidebarOptions: EvaluationField[];
  position: "left" | "right";
  setPosition: (pos: "left" | "right") => void;
  enableManualNote: boolean;
  setEnableManualNote: (val: boolean) => void;
  dacUsername?: string;
  dataSourceUsername?: string;
  currentItemSn?: string;
  sheetData?: any[];
  // Status Props
  processingStatus?: "idle" | "processing" | "success" | "error";
  failedStage?: "none" | "submit" | "save-approval";
  errorMessage?: string;
  onRetry?: () => void;
}

export const defaultEvaluationValues: Record<string, string> = {
  G: "Sesuai",
  H: "Sesuai",
  I: "Sesuai",
  J: "Sesuai",
  K: "Sesuai",
  O: "Ada",
  Q: "Lengkap",
  R: "Lengkap",
  S: "Konsisten",
  T: "Sesuai",
  F: "Sesuai",
};

export default function Sidebar({
  pendingCount,
  handleTerima,
  handleTolak,
  handleSkip,
  isSubmitting,
  evaluationForm,
  setEvaluationForm,
  customReason,
  setCustomReason,
  sidebarOptions,
  currentImageIndex,
  snBapp,
  setSnBapp,
  position,
  setPosition,
  enableManualNote,
  setEnableManualNote,
  dacUsername,
  dataSourceUsername,
  currentItemSn,
  sheetData,
  // Status Props
  processingStatus = "idle",
  failedStage = "none",
  errorMessage = "",
  onRetry,
}: SidebarProps & {
  currentImageIndex: number | null;
  snBapp?: string;
  setSnBapp?: (val: string) => void;
}) {
  const [hidePendingCount, setHidePendingCount] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const handleSaveData = () => {
    if (sheetData && sheetData.length > 0) {
      localStorage.setItem("cached_scraped_data", JSON.stringify(sheetData));
      localStorage.setItem("cached_data_timestamp", new Date().toISOString());
      alert(`Berhasil menyimpan ${sheetData.length} data ke local storage.`);
    } else {
      alert("Tidak ada data untuk disimpan.");
    }
  };

  const [viewMode, setViewMode] = useState<"button" | "dropdown">("button");
  const [contextMode, setContextMode] = useState<"default" | "context">("default"); // Default or Context-Aware

  useEffect(() => {
    const savedMode = localStorage.getItem("sidebarViewMode");
    if (savedMode === "button" || savedMode === "dropdown") {
      setViewMode(savedMode);
    }
  }, []);

  const handleViewModeChange = (mode: "button" | "dropdown") => {
    setViewMode(mode);
    localStorage.setItem("sidebarViewMode", mode);
  };

  // Auto-update reason when form changes
  useEffect(() => {
    const reasons: string[] = [];
    Object.entries(evaluationForm).forEach(([id, val]) => {
      if (errorMap[id] && errorMap[id][val]) {
        reasons.push(errorMap[id][val]);
      }
    });
    setCustomReason(reasons.join("\n"));
  }, [evaluationForm, setCustomReason]);

  const handleFormChange = (id: string, value: string) => {
    // 1. Update state form (menggunakan functional update agar bisa memanipulasi field lain secara bersamaan)
    setEvaluationForm((prev) => {
      const newForm = { ...prev, [id]: value };

      // LOGIKA OTOMATISASI: Jika "BAPP HAL 1" (Q) diubah
      if (id === "Q") {
        if (value === "Tidak ada" || value === "Tidak terlihat jelas") {
          // Otomatis ubah "BARCODE SN BAPP" (O) mengikuti nilai Q
          newForm["O"] = value;

          // Karena status SN menjadi "Tidak ada/jelas", set input SN menjadi "-"
          if (setSnBapp) setSnBapp("-");
        }
      }

      // --- TAMBAHKAN LOGIKA BARU UNTUK BAPP HAL 2 (R) DI SINI ---
      if (id === "R" && value === "Tidak ada") {
        // Otomatis ubah Stempel (T) dan Tgl BAPP (F) menjadi "Tidak ada"
        newForm["T"] = "Tidak ada";
        newForm["F"] = "Tidak ada";

        // Khusus TTD BAPP (S) namanya adalah "TTD tidak ada" sesuai opsi di form
        newForm["S"] = "TTD tidak ada";
      }

      return newForm;
    });

    // 2. LOGIKA EKSISTING: Sinkronisasi Input SN jika user mengklik langsung field "O"
    if (id === "O" && setSnBapp) {
      if (value === "Ada" || value === "Tidak sesuai") {
        // Kembalikan ke Serial Number asli dari props jika "Ada" atau "Sesuai"
        setSnBapp(currentItemSn || "");
      } else {
        // Set menjadi "-" untuk kondisi lainnya (Tidak ada, Tidak sesuai, dsb)
        setSnBapp("-");
      }
    }
  };

  // calculate isFormDefault based on first options
  const isFormDefault = sidebarOptions.every((field) => {
    const defaultVal = field.options[0];
    return evaluationForm[field.id] === defaultVal;
  });

  const buttonsDisabled =
    isSubmitting || pendingCount === null || pendingCount === 0;

  const mainButtonLabel = isFormDefault ? "TERIMA" : "TOLAK";
  const mainButtonColor = isFormDefault
    ? "bg-green-600 hover:bg-green-500"
    : "bg-red-600 hover:bg-red-500";
  const mainButtonAction = isFormDefault ? handleTerima : handleTolak;



  // Filter Logic
  const displayedOptions = sidebarOptions.filter((field) => {
    // If not in full screen mode (no image index) or context is default, show everything
    if (currentImageIndex === null || contextMode === "default") return true;

    // Check mapping
    const allowedFields = IMAGE_FIELD_MAPPING[currentImageIndex];
    if (allowedFields) {
      return allowedFields.includes(field.id);
    }

    // Default: show everything if index not mapped (e.g. index 5+)
    return true;
  });


  return (
    <aside className="w-96 bg-gray-800 text-white flex-shrink-0 flex flex-col p-4 h-full overflow-hidden border-r border-gray-700 relative">
      {/* Process Status Light (Moved from Page) */}
      <div className="mb-4">
        <ProcessStatusLight
          status={processingStatus}
          failedStage={failedStage}
          errorMessage={errorMessage}
          onRetry={onRetry || (() => { })}
        />
      </div>

      {/* Context Mode Switch - Only Visible in Full Screen Image Mode */}
      {currentImageIndex !== null && (
        <div className="flex bg-gray-700/50 rounded-lg p-1 mb-4 border border-gray-600">
           <button
            onClick={() => setContextMode("default")}
            className={`flex-1 py-1.5 text-xs rounded-md font-bold transition-all ${
              contextMode === "default"
                ? "bg-gray-600 text-white shadow-sm border border-gray-500"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setContextMode("context")}
            className={`flex-1 py-1.5 text-xs rounded-md font-bold transition-all ${
              contextMode === "context"
                ? "bg-blue-600 text-white shadow-sm border border-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Sesuai Gambar
          </button>
        </div>
      )}

      {/* SN BAPP Input - Special Condition: Image Index 3 & Filtered Mode */}
      {snBapp !== undefined && setSnBapp && (
        <div
          className={`mb-4 bg-gray-700 p-2 rounded border border-gray-600 ${
            // Tampilkan jika value BUKAN "Ada" dan BUKAN "Sesuai"
            evaluationForm["O"] !== "Ada" && evaluationForm["O"] !== "Sesuai"
              ? "block"
              : "hidden"
            }`}
        >
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1">
            Input SN BAPP
          </label>
          <input
            type="text"
            value={snBapp}
            onChange={(e) => setSnBapp(e.target.value)}
            placeholder="Input SN if mismatch"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500 text-sm font-mono placeholder-gray-500"
            onMouseEnter={(e) => e.currentTarget.focus()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Form Fields */}
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {sidebarOptions.length === 0 ? (
          <div className="text-gray-400 text-sm text-center mt-10">
            Loading form options...
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {displayedOptions.map((field) => (
              <div key={field.id} className="text-left text-xs">
                <label className="font-semibold text-gray-300 block">
                  {field.label}
                </label>
                <div className="flex flex-wrap gap-1">
                  {viewMode === "button" ? (
                    field.options.map((opt) => (
                      <RadioOption
                        key={opt}
                        fieldId={field.id}
                        option={opt}
                        checked={evaluationForm[field.id] === opt}
                        onChange={handleFormChange}
                        disabled={buttonsDisabled}
                        isDanger={opt !== field.options[0]}
                      />
                    ))
                  ) : (
                    <select
                      value={evaluationForm[field.id] || field.options[0]}
                      onChange={(e) =>
                        handleFormChange(field.id, e.target.value)
                      }
                      disabled={buttonsDisabled}
                      className={`w-full rounded px-2 py-1 text-xs text-white focus:outline-none mb-1 border ${
                        (evaluationForm[field.id] || field.options[0]) !==
                        field.options[0]
                          ? "bg-red-500 border-red-200"
                          : "bg-gray-700 border-gray-600 focus:border-blue-500"
                      }`}
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-700 pt-3 mt-2 flex-shrink-0">
        {/* Compact Info Row */}
        <div className="flex items-center justify-between mb-3 bg-gray-900/50 p-2 rounded border border-gray-700">
          {/* Pending Count (Clickable) */}
          {/* Pending Count (with Eye Toggle) */}
          <div className="flex items-center gap-2 select-none">
            <span className="text-xs text-gray-400">Pending:</span>
            <span className="text-sm font-bold text-white min-w-[20px]">
              {hidePendingCount
                ? "***"
                : pendingCount !== null
                  ? pendingCount
                  : "..."}
            </span>
            <button
              onClick={() => setHidePendingCount(!hidePendingCount)}
              className="p-1 text-gray-400 hover:text-white transition-colors hover:cursor-pointer focus:outline-none"
              title={hidePendingCount ? "Show Count" : "Hide Count"}
            >
              {hidePendingCount ? (
                // Eye Off Icon (Hidden state -> click to show)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                // Eye Icon (Visible state -> click to hide)
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Edit Catatan Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                Edit Note:
              </span>
              <button
                onClick={() => setEnableManualNote(!enableManualNote)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${enableManualNote ? "bg-blue-600" : "bg-gray-600"
                  }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${enableManualNote ? "translate-x-5" : "translate-x-1"
                    }`}
                />
              </button>
            </div>

            {/* Options Menu Button (Moved Here) */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1 hover:bg-gray-700 rounded-full transition-colors focus:outline-none text-gray-400 hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>

              {/* Options Dropdown (Opens Upwards) */}
              {isMenuOpen && (
                <>
                  {/* Overlay to close menu */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  ></div>
                  <div className="absolute right-0 bottom-full mb-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 p-4">
                    {/* User Info */}
                    <div className="mb-4 text-xs space-y-2 border-b border-gray-700 pb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">DAC:</span>
                        <span className="font-mono text-gray-200">
                          {dacUsername || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">SRC:</span>
                        <span className="font-mono text-gray-200">
                          {dataSourceUsername || "-"}
                        </span>
                      </div>
                    </div>

                    {/* View Mode Toggle moved here */}
                    <div className="mb-4">
                      <label className="text-xs font-bold text-gray-400 block mb-2">
                        View Input Mode
                      </label>
                      <div className="flex bg-gray-900 p-1 rounded border border-gray-600">
                        <button
                          onClick={() => handleViewModeChange("button")}
                          className={`flex-1 py-1 text-xs rounded transition-all ${
                            viewMode === "button"
                              ? "bg-blue-600 text-white"
                              : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          Button
                        </button>
                        <button
                          onClick={() => handleViewModeChange("dropdown")}
                          className={`flex-1 py-1 text-xs rounded transition-all ${
                            viewMode === "dropdown"
                              ? "bg-blue-600 text-white"
                              : "text-gray-400 hover:text-gray-200"
                          }`}
                        >
                          Dropdown
                        </button>
                      </div>
                    </div>

                    {/* Layout Toggle */}
                    <div className="mb-4">
                      <label className="text-xs font-bold text-gray-400 block mb-2">
                        Layout Position
                      </label>
                      <div className="flex bg-gray-900 p-1 rounded border border-gray-600">
                        <button
                          onClick={() => setPosition("left")}
                          className={`flex-1 py-1 text-xs rounded transition-all ${position === "left"
                            ? "bg-blue-600 text-white"
                            : "text-gray-400 hover:text-gray-200"
                            }`}
                        >
                          Left
                        </button>
                        <button
                          onClick={() => setPosition("right")}
                          className={`flex-1 py-1 text-xs rounded transition-all ${position === "right"
                            ? "bg-blue-600 text-white"
                            : "text-gray-400 hover:text-gray-200"
                            }`}
                        >
                          Right
                        </button>
                      </div>
                    </div>
                    {/* Tombol Simpan Data Baru */}
                    <button
                      onClick={handleSaveData}
                      className="w-full mb-2 p-2 bg-blue-700/20 hover:bg-blue-900/40 text-blue-300 hover:text-blue-200 text-xs rounded border border-blue-800/50 hover:border-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                        <polyline points="7 3 7 8 15 8"></polyline>
                      </svg>
                      SAVE FILTERED DATA
                    </button>

                    {/* TOMBOL BARU: RESET SAVED DATA */}
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Apakah Anda yakin ingin menghapus data yang tersimpan? Antrean akan diulang dari awal saat halaman direfresh.",
                          )
                        ) {
                          localStorage.removeItem("cached_scraped_data");
                          localStorage.removeItem("cached_data_timestamp");
                          alert("Data tersimpan berhasil dihapus.");
                          window.location.reload(); // Refresh untuk mengambil data segar dari API
                        }
                      }}
                      className="w-full mb-2 p-2 bg-amber-700/20 hover:bg-amber-900/40 text-amber-300 hover:text-amber-200 text-xs rounded border border-amber-800/50 hover:border-amber-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                      RESET SAVED DATA
                    </button>
                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to logout? This will clear all local session data.",
                          )
                        ) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                      className="w-full p-2 bg-red-700/20 hover:bg-red-900/40 text-red-300 hover:text-red-200 text-xs rounded border border-red-800/50 hover:border-red-700 transition-colors"
                    >
                      LOGOUT & CLEAR DATA
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSkip(true)}
            disabled={buttonsDisabled}
            className={`flex-1 p-3 bg-gray-500 rounded-md text-white font-bold hover:bg-gray-400 disabled:opacity-50 transition-colors ${
              isSubmitting ? "animate-pulse" : ""
            }`}
          >
            {isSubmitting ? <Spinner /> : "SKIP"}
          </button>
          <button
            onClick={mainButtonAction}
            disabled={buttonsDisabled}
            className={`flex-1 p-3 rounded-md text-white font-bold disabled:opacity-50 transition-colors ${mainButtonColor} ${
              isSubmitting ? "animate-pulse" : ""
            }`}
          >
            {isSubmitting ? <Spinner /> : mainButtonLabel}
          </button>
        </div>
      </div>
    </aside>
  );
}
