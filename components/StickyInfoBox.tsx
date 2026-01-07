import { useRef, useState, useMemo, useEffect } from "react";
import { useDraggable } from "./hooks/useDraggable";

interface StickyInfoBoxProps {
  schoolData: Record<string, string>;
  itemData: Record<string, string>;
  date: string;
  setDate: (date: string) => void;
  snBapp: string;
  setSnBapp: (val: string) => void;
}

export default function StickyInfoBox({
  schoolData,
  itemData,
  date,
  setDate,
  snBapp,
  setSnBapp,
}: StickyInfoBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null!);
  const { position, handleMouseDown } = useDraggable<HTMLDivElement>(
    boxRef,
    "sticky-info-box"
  );
  const handleDateWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    // Pastikan ada tanggal yang terpilih
    if (!date) return;

    const currentDate = new Date(date);

    const daysToAdd = e.deltaY > 0 ? -1 : 1;

    currentDate.setDate(currentDate.getDate() + daysToAdd);

    // Format kembali ke YYYY-MM-DD untuk input date
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, "0");
    const day = String(currentDate.getDate()).padStart(2, "0");

    const formattedDate = `${year}-${month}-${day}`;
    setDate(formattedDate);
  };

  return (
    <div
      ref={boxRef}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        touchAction: "none",
        zIndex: 1000,
        width: "320px",
        borderRadius: "8px",
        fontFamily: "sans-serif",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)", // Darker shadow
        backgroundColor: "#18181b", // zinc-900
        border: "2px solid #3f3f46", // zinc-700
      }}
      className="text-zinc-100 flex flex-col max-h-[80vh]"
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown} // Support touch start
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 18px",
          cursor: "move",
          borderBottom: "1px solid #3f3f46", // zinc-700
          backgroundColor: "#27272a", // zinc-800
          borderTopLeftRadius: "6px",
          borderTopRightRadius: "6px",
          flexShrink: 0,
        }}
      >
        <span className="font-bold text-white text-sm">
          Data Sekolah & Barang
        </span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div>
      </div>

      {/* Content */}
      <div
        className="p-3 text-sm space-y-3 bg-zinc-900 text-white overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* School Info */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Sekolah
          </div>
          <div
            className="font-bold text-blue-400 truncate"
            title={schoolData.nama_sekolah}
          >
            {schoolData.nama_sekolah || "-"}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
            <div>
              <span className="text-zinc-500">NPSN:</span>{" "}
              {schoolData.npsn || "-"}
            </div>
            <div>
              <span className="text-zinc-500">Kec:</span>{" "}
              {schoolData.kecamatan || "-"}
            </div>
          </div>
          <div className="text-xs text-zinc-400 truncate">
            {schoolData.alamat || "-"}
          </div>
        </div>

        <hr className="border-zinc-700" />

        {/* Item Info */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Barang
          </div>
          <div
            className="font-medium text-white truncate"
            title={itemData.nama_barang}
          >
            {itemData.nama_barang || "-"}
          </div>
          <div className="text-xs text-zinc-300">
            <span className="text-zinc-500">SN:</span>{" "}
            <span className="font-mono text-yellow-500">
              {itemData.serial_number || "-"}
            </span>
          </div>
        </div>

        <hr className="border-zinc-700" />

        {/* Inputs */}
        <div className="space-y-2">
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Tanggal Verifikasi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onWheel={(e) => {
                e.preventDefault();
                handleDateWheel(e);
              }}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500 text-sm"
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Input SN BAPP
            </label>
            <input
              type="text"
              value={snBapp}
              onChange={(e) => setSnBapp(e.target.value)}
              placeholder="Input SN if mismatch"
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500 text-sm font-mono placeholder-zinc-600"
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
