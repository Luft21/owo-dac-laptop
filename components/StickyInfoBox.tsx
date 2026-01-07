'use client';

import { useRef, useState, useMemo, useEffect } from "react";
import { useDraggable } from './hooks/useDraggable';

export default function StickyInfoBox({
    schoolData,
    itemData,
    date,
    setDate,
}: {
    schoolData: Record<string, string>;
    itemData: Record<string, string>;
    date: string;
    setDate: (date: string) => void;
}) {
    // State lifted to parent
    const boxRef = useRef<HTMLDivElement>(null!);
    const { position, handleMouseDown } = useDraggable<HTMLDivElement>(
        boxRef,
        "sticky-info-box",
    );

    return (
        <div
            ref={boxRef}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                touchAction: 'none',
                zIndex: 1000,
                width: '320px',
                borderRadius: '8px',
                fontFamily: 'sans-serif',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)', // Darker shadow
                backgroundColor: '#18181b', // zinc-900
                border: '2px solid #3f3f46', // zinc-700
            }}
            className="text-zinc-100"
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
                }}
            >
                <div>
                    <div style={{ fontWeight: "bold", fontSize: "15px", color: "#60a5fa" }}> {/* blue-400 */}
                        {schoolData.nama_sekolah || 'Nama Sekolah'}
                    </div>
                    <div style={{ fontSize: "12px", color: "#a1a1aa" }}> {/* zinc-400 */}
                        NPSN: {schoolData.npsn || '-'}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: "12px 18px" }} onClick={(e) => e.stopPropagation()}>

                {/* Date Input */}
                <div className="mb-4">
                    <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Tanggal Verifikasi</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                    />
                </div>

                <div style={{ fontWeight: "bold", fontSize: "13px", color: "#a1a1aa" }}> {/* zinc-400 */}
                    Serial Number
                </div>
                <div style={{ fontSize: "16px", fontWeight: 600, color: "#ffffff" }}>
                    {itemData.serial_number || '-'}
                </div>

                <div style={{ marginTop: "4px", fontSize: "13px", color: "#d4d4d8" }}> {/* zinc-300 */}
                    {itemData.nama_barang || '-'}
                </div>


                {/* Alamat Section */}
                <div
                    style={{
                        marginTop: "12px",
                        border: "1px solid #3f3f46", // zinc-700
                        borderRadius: "4px",
                        padding: "8px",
                    }}
                >
                    <div style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#e4e4e7" }}> {/* zinc-200 */}
                        Alamat
                    </div>
                    <div style={{ fontSize: "12px", color: "#d4d4d8", lineHeight: "1.4" }}> {/* zinc-300 */}
                        {schoolData.alamat}, {schoolData.kecamatan}, {schoolData.kabupaten}, {schoolData.provinsi}
                    </div>
                </div>

            </div>
        </div>
    );
}
