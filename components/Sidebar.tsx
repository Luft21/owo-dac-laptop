"use client";
import { useEffect } from "react";
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
}

const RadioOption = ({
  fieldId,
  option,
  checked,
  onChange,
  disabled,
}: RadioOptionProps) => (
  <button
    type="button"
    onClick={() => onChange(fieldId, option)}
    disabled={disabled}
    className={`px-3 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 mb-1 mr-1
      ${
        checked
          ? "bg-blue-500 border-blue-500 text-white font-semibold"
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
}: SidebarProps) {
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
    setEvaluationForm((prev) => ({ ...prev, [id]: value }));
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

  return (
    <aside className="w-96 bg-gray-800 text-white flex-shrink-0 flex flex-col p-4 h-full overflow-hidden border-r border-gray-700">
      <h1 className="text-xl font-bold border-b border-gray-700 pb-4 flex-shrink-0">
        FORM EVALUASI
      </h1>
      <div className="flex-grow mt-4 overflow-y-auto pr-2 custom-scrollbar">
        {sidebarOptions.length === 0 ? (
          <div className="text-gray-400 text-sm text-center mt-10">
            Loading form options...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sidebarOptions.map((field) => (
              <div key={field.id} className="text-left text-sm">
                <label className="font-semibold text-gray-300 mb-2 block">
                  {field.label}
                </label>
                <div className="flex flex-wrap gap-1">
                  {field.options.map((opt) => (
                    <RadioOption
                      key={opt}
                      fieldId={field.id}
                      option={opt}
                      checked={evaluationForm[field.id] === opt}
                      onChange={handleFormChange}
                      disabled={buttonsDisabled}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-700 pt-4 mt-4 flex-shrink-0">
        <p className="text-xs text-gray-400 mb-2 text-center">
          Pending: {pendingCount !== null ? pendingCount : "..."}
        </p>
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
