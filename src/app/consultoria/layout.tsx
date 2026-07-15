// Shell/boundary da Plataforma de Consultoria de Treinos e Fisioterapia.
// Produto independente que apenas compartilha a infra Next/Supabase do repo.
// Paleta e identidade PRÓPRIAS (distintas do Fracta) para nunca misturar conceitos.
// Não importa nada de components/fracta nem de lógica clínica.

import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  FIT_BRAND_DESCRIPTION,
  FIT_BRAND_NAME,
  FIT_BRAND_SLOGAN,
} from "@/lib/fit/brand";

export const metadata: Metadata = {
  title: {
    default: `${FIT_BRAND_NAME} — ${FIT_BRAND_SLOGAN}`,
    template: `%s | ${FIT_BRAND_NAME}`,
  },
  description: FIT_BRAND_DESCRIPTION,
};

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
