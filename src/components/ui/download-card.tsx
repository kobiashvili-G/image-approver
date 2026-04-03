"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, CheckCircle2, Archive } from "lucide-react"

export type DownloadStatus = "idle" | "loading" | "success"

export interface DownloadCardProps {
  /** Number of selected images */
  count: number
  /** Current download status */
  status: DownloadStatus
  /** Callback when the download button is clicked */
  onDownload: () => void
  /** Loading message override */
  loadingMessage?: string
  /** Success message override */
  successMessage?: string
}

const animationVariants = {
  initial: { opacity: 0, y: -10, height: 0 },
  animate: { opacity: 1, y: 0, height: "auto" },
  exit: { opacity: 0, y: 10, height: 0 },
}

export function DownloadCard({
  count,
  status,
  onDownload,
  loadingMessage = "Preparing ZIP archive, please wait…",
  successMessage = "Download complete!",
}: DownloadCardProps) {
  return (
    <div className="space-y-3">
      {/* Status Banner */}
      <div className="relative min-h-[2.5rem]">
        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              className="flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 p-3 text-sm text-amber-300"
              variants={animationVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
              <span>{loadingMessage}</span>
            </motion.div>
          )}
          {status === "success" && (
            <motion.div
              key="success"
              className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 p-3 text-sm text-emerald-400"
              variants={animationVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Download Button */}
      <button
        onClick={onDownload}
        disabled={status !== "idle"}
        className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-900/20 active:scale-[0.98]"
        style={{ background: "linear-gradient(135deg, #dc5b0e, #eb7517)" }}
      >
        <Archive className="w-4 h-4" />
        {status === "idle"
          ? `Download ${count} image${count !== 1 ? "s" : ""} as ZIP`
          : status === "loading"
            ? "Preparing…"
            : "Done"}
      </button>
    </div>
  )
}
