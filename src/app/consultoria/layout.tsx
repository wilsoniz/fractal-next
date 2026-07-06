// Shell/boundary da Plataforma de Consultoria de Treinos e Fisioterapia.
// Produto independente que apenas compartilha a infra Next/Supabase do repo.
// Paleta e identidade PRÓPRIAS (distintas do Fracta) para nunca misturar conceitos.
// Não importa nada de components/fracta nem de lógica clínica.

import type { ReactNode } from "react";

export default function ConsultoriaLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1120",
        color: "#e6edf6",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </div>
  );
}
