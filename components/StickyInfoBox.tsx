import { useRef, useState, useMemo, useEffect } from "react";
import { useDraggable } from "./hooks/useDraggable";

interface StickyInfoBoxProps {
  schoolData: Record<string, string>;
  itemData: Record<string, string>;
}

export default function StickyInfoBox({
  schoolData,
  itemData,
}: StickyInfoBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null!);
  const { position, handleMouseDown } = useDraggable<HTMLDivElement>(
    boxRef,
    "sticky-info-box"
  );

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
        {/* <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
        </div> */}
      </div>

      {/* Content */}
      <div
        className="p-3 text-sm space-y-3 bg-zinc-900 text-white overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* School Info */}
        <div className="space-y-1">
          <div
            className="font-bold text-blue-400 truncate"
            title={schoolData.nama_sekolah}
          >
            {schoolData.nama_sekolah || "-"}
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              NPSN
            </div>
            <div className="text-lg font-mono text-yellow-500">
              {schoolData.npsn || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Kecamatan
            </div>
            <div className="text-xs text-white truncate">
              {schoolData.kecamatan || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Alamat
            </div>
            <div className="text-xs text-white truncate">
              {schoolData.alamat || "-"}
            </div>
          </div>
        </div>

        <hr className="border-zinc-700" />

        {/* Item Info */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Barang
          </div>
          <div
            className="text-xs text-white truncate"
            title={itemData.nama_barang}
          >
            {itemData.nama_barang || "-"}
          </div>
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Serial Number
          </div>
          <div className="text-lg font-mono text-yellow-500">
            {itemData.serial_number || "-"}
          </div>
        </div>

      </div>
    </div >
  );
}
