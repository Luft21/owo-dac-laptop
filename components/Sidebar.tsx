"use client";
import { useEffect, useState } from "react";
import Spinner from "./Spinner";

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

interface RadioOptionProps {
  fieldId: string;
  option: string;
  checked: boolean;
  onChange: (id: string, value: string) => void;
  disabled: boolean;
  isPositive: boolean;
}

const RadioOption = ({
  fieldId,
  option,
  checked,
  onChange,
  disabled,
  isPositive,
}: RadioOptionProps) => (
  <button
    type="button"
    onClick={() => onChange(fieldId, option)}
    disabled={disabled}
    className={`px-3 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 mb-1 mr-1
      ${checked
        ? isPositive
          ? "bg-blue-500 border-blue-500 text-white font-semibold"
          : "bg-red-600 border-red-600 text-white font-semibold"
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
  transientDisabled?: boolean;
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
  date,
  setDate,
  snBapp,
  setSnBapp,
  position,
  setPosition,
  enableManualNote,
  setEnableManualNote,
  transientDisabled,
  originalSn,
}: SidebarProps & {
  currentImageIndex: number | null;
  date?: string;
  setDate?: (date: string) => void;
  snBapp?: string;
  setSnBapp?: (val: string) => void;
  transientDisabled?: boolean;
  originalSn?: string;
}) {
  // Define Mapping here or outside component
  const IMAGE_FIELD_MAPPING: Record<number, string[]> = {
    0: ["G", "H", "I"],
    1: ["J"],
    2: ["K"],
    3: ["O", "Q"],
    4: ["F", "R", "S", "T"],
  };

  const [filterMode, setFilterMode] = useState<"specific" | "all">("specific");

  // Auto-set filter mode when image changes
  useEffect(() => {
    if (currentImageIndex !== null) {
      // Only set specific if mapping exists for this index
      if (IMAGE_FIELD_MAPPING[currentImageIndex]) {
        setFilterMode("specific");
      } else {
        setFilterMode("all"); // Default to all if no mapping (e.g. image > 5)
      }
    } else {
      setFilterMode("all");
    }
  }, [currentImageIndex]);

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
    const updates: Record<string, string> = { [id]: value };

    // Cascade Logic BAPP 1 ('Q') -> Barcode SN ('O')
    if (id === "Q" && (value === "Tidak ada" || value === "Tidak terlihat jelas")) {
      updates["O"] = value;
    }

    // Cascade Logic BAPP 2 ('R') -> TGL ('F'), TTD ('S'), Stempel ('T')
    if (id === "R") {
      if (value === "Tidak ada") {
        updates["F"] = "Tidak ada"; // Assuming option exists
        updates["S"] = "TTD tidak ada";
        updates["T"] = "Tidak ada";
      } else if (value === "Tidak terlihat jelas") {
        updates["F"] = "Tidak terlihat jelas";
        // updates["S"] = ... // Biarkan S (TTD) tetap (User req: "biarkan saja valuenya konsisten")
        updates["T"] = "Tidak terlihat jelas";
      }
    }

    setEvaluationForm((prev) => ({ ...prev, ...updates }));

    // Logic Khusus untuk Sinkronisasi SN (Triggered if 'O' changes either directly or via cascade)
    if (updates["O"] && setSnBapp) {
      const oValue = updates["O"];
      if (oValue === "Tidak ada" || oValue === "Tidak terlihat jelas") {
        setSnBapp("-");
      } else if (oValue === "Ada" || oValue === "Sesuai" || oValue === "Tidak sesuai") {
        setSnBapp(originalSn || "");
      }
    }
  };

  const handleSnChange = (val: string) => {
    if (!setSnBapp) return;
    setSnBapp(val);

    // Logic Otomatis ganti status 'O'
    // Kita set evaluationForm secara langsung untuk menghindari trigger handleFormChange 
    // yang akan mereset input kembali ke originalSn saat status "Tidak sesuai" (looping conflict)
    let newStatus = "";
    if (val.trim() === "") {
      newStatus = "Tidak ada";
    } else if (val === originalSn) {
      newStatus = "Ada"; // Atau "Sesuai"
    } else {
      newStatus = "Tidak sesuai";
    }

    setEvaluationForm((prev) => ({ ...prev, O: newStatus }));
  };

  // calculate isFormDefault based on first options
  const isFormDefault = sidebarOptions.every((field) => {
    const defaultVal = field.options[0];
    return evaluationForm[field.id] === defaultVal;
  });

  const buttonsDisabled =
    isSubmitting ||
    pendingCount === null ||
    pendingCount === 0 ||
    !!transientDisabled;

  const mainButtonLabel = isFormDefault ? "TERIMA" : "TOLAK";
  const mainButtonColor = isFormDefault
    ? "bg-green-600 hover:bg-green-500"
    : "bg-red-600 hover:bg-red-500";
  const mainButtonAction = isFormDefault ? handleTerima : handleTolak;

  // Filter Logic
  const displayedOptions = sidebarOptions.filter((field) => {
    if (currentImageIndex === null || filterMode === "all") return true;

    const allowedFields = IMAGE_FIELD_MAPPING[currentImageIndex];
    if (!allowedFields) return true; // Show all if no mapping found (extra images)

    return allowedFields.includes(field.id);
  });

  const [showPending, setShowPending] = useState(true);

  return (
    <aside className="w-96 bg-gray-800 text-white flex-shrink-0 flex flex-col p-4 h-full overflow-hidden border-r border-gray-700">
      <div className="flex justify-between items-center border-b border-gray-700 pb-4 flex-shrink-0">
        <h1 className="text-xl font-bold">FORM EVALUASI</h1>
        {/* Layout Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-900 p-0.5 rounded-full border border-gray-600">
            <button
              onClick={() => setPosition("left")}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${position === "left"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
                }`}
              title="Left Layout"
            >
              L
            </button>
            <button
              onClick={() => setPosition("right")}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${position === "right"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-300"
                }`}
              title="Right Layout"
            >
              R
            </button>
          </div>
        </div>
      </div>

      {/* Mode Switcher when Image Open */}
      {currentImageIndex !== null && (
        <div className="flex bg-gray-700 rounded p-1 mt-2 mb-2">
          <button
            onClick={() => setFilterMode("specific")}
            className={`flex-1 py-1 text-xs rounded font-bold transition-all ${filterMode === "specific"
              ? "bg-blue-600 text-white shadow"
              : "text-gray-400 hover:text-gray-200"
              }`}
          >
            Filtered
          </button>
          <button
            onClick={() => setFilterMode("all")}
            className={`flex-1 py-1 text-xs rounded font-bold transition-all ${filterMode === "all"
              ? "bg-blue-600 text-white shadow"
              : "text-gray-400 hover:text-gray-200"
              }`}
          >
            Default
          </button>
        </div>
      )}

      {/* Date Input - Special Condition: Image Index 4 & Filtered Mode */}
      {currentImageIndex === 4 &&
        filterMode === "specific" &&
        date !== undefined &&
        setDate && (
          <div className="mb-4 bg-gray-700 p-2 rounded border border-gray-600">
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1">
              Tanggal Verifikasi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              // Wheel handler logic inline or separate helper
              onWheel={(e) => {
                if (!date) return;
                const currentDate = new Date(date);
                const daysToAdd = e.deltaY > 0 ? -1 : 1;
                currentDate.setDate(currentDate.getDate() + daysToAdd);
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(
                  2,
                  "0",
                );
                const day = String(currentDate.getDate()).padStart(2, "0");
                setDate(`${year}-${month}-${day}`);
              }}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
        )}

      {/* SN BAPP Input - Special Condition: Image Index 3 & Filtered Mode */}
      {currentImageIndex === 3 &&
        filterMode === "specific" &&
        snBapp !== undefined &&
        setSnBapp && (
          <div
            className="mb-4 bg-gray-700 p-2 rounded border border-gray-600 block"
          >
            <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider block mb-1">
              Input SN BAPP
            </label>
            <input
              type="text"
              value={snBapp}
              onChange={(e) => handleSnChange(e.target.value)}
              placeholder="Input SN if mismatch"
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500 text-sm font-mono placeholder-gray-500"
            />
          </div>
        )}

      <div className="flex-grow mt-4 overflow-y-auto pr-2 custom-scrollbar">
        {sidebarOptions.length === 0 ? (
          <div className="text-gray-400 text-sm text-center mt-10">
            Loading form options...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {displayedOptions.map((field) => (
              <div key={field.id} className="text-left text-sm">
                <label className="font-semibold text-gray-300 mb-2 block">
                  {field.label}
                </label>
                <div className="flex flex-wrap gap-1">
                  {field.options.map((opt, idx) => (
                    <RadioOption
                      key={opt}
                      fieldId={field.id}
                      option={opt}
                      checked={evaluationForm[field.id] === opt}
                      onChange={handleFormChange}
                      disabled={buttonsDisabled}
                      isPositive={idx === 0}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 pt-4 mt-4 flex-shrink-0">
        <div className="text-center">
          <button
            onClick={() => setShowPending(!showPending)}
            className="text-xl text-blue-500 hover:underline mb-3"
          >
            {showPending ? "Hide" : "Show"}
          </button>
        </div>

        {showPending && (
          <p className="text-xl text-gray-400 mb-2 text-center">
            Pending: {pendingCount !== null ? pendingCount : "..."}
          </p>
        )}
        <div className="flex items-center justify-between mb-4 bg-gray-900/50 p-2 rounded border border-gray-700">
          <span className="text-xs font-bold text-gray-400 uppercase">
            Edit Catatan DAC
          </span>
          <button
            onClick={() => setEnableManualNote(!enableManualNote)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              enableManualNote ? "bg-blue-600" : "bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enableManualNote ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
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
          className="w-full mt-3 p-2 bg-red-700/50 hover:bg-red-900/50 text-zinc-400 hover:text-red-200 text-xs rounded border border-zinc-700 hover:border-red-800 transition-colors"
        >
          LOGOUT & CLEAR STORAGE
        </button>
      </div>
    </aside>
  );
}
