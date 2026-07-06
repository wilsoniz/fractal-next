"use client";

// Contexto da área do paciente — expõe a ficha vinculada (fit_patients) às telas.

import { createContext, useContext, type ReactNode } from "react";
import type { FitPatient } from "@/lib/fit/types";

const PatientCtx = createContext<FitPatient | null>(null);

export function PatientProvider({ patient, children }: { patient: FitPatient; children: ReactNode }) {
  return <PatientCtx.Provider value={patient}>{children}</PatientCtx.Provider>;
}

export function usePatient(): FitPatient {
  const p = useContext(PatientCtx);
  if (!p) throw new Error("usePatient deve ser usado dentro de PatientProvider");
  return p;
}
