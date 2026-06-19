"use client"
import { createPortal } from "react-dom"

export function Modal({ aberto, onFechar, children }: {
  aberto: boolean
  onFechar: () => void
  children: React.ReactNode
}) {
  if (!aberto || typeof document === "undefined") return null
  return createPortal(
    <div onClick={onFechar} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
      backdropFilter: "blur(4px)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  )
}
