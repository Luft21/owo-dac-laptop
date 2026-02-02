import React from "react";

type ProcessStatus = "idle" | "processing" | "success" | "error";
type FailedStage = "none" | "submit" | "save-approval";

interface ProcessStatusLightProps {
    status: ProcessStatus;
    failedStage: FailedStage;
    onRetry: () => void;
    errorMessage?: string;
}

export default function ProcessStatusLight({
    status,
    failedStage,
    onRetry,
    errorMessage,
}: ProcessStatusLightProps) {
    // if (status === "idle") return null; // Removed to make it always visible

    return (
        <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 px-4 py-2 rounded-full shadow border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Status:
                </span>
                <div className="relative flex h-3 w-3">
                    {status === "processing" && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    )}
                    <span
                        className={`relative inline-flex rounded-full h-3 w-3 ${status === "success"
                            ? "bg-green-500"
                            : status === "processing"
                                ? "bg-yellow-500"
                                : status === "error"
                                    ? "bg-red-500"
                                    : "bg-zinc-400" // idle color
                            }`}
                    ></span>
                </div>
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {status === "success"
                        ? "Berhasil Disimpan"
                        : status === "processing"
                            ? "Sedang Memproses..."
                            : status === "error"
                                ? "Terjadi Kesalahan"
                                : "Siap"}
                </span>
            </div>

            {status === "error" && (
                <div className="flex items-center gap-2 border-l border-zinc-300 dark:border-zinc-600 pl-3">
                    <span className="text-xs text-red-500 max-w-[150px] truncate" title={errorMessage}>
                        Error: {failedStage === "submit" ? "Submit Data" : "Save Approval"}
                    </span>
                    <button
                        onClick={onRetry}
                        className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-bold"
                    >
                        ↻ Retry
                    </button>
                </div>
            )}
        </div>
    );
}
