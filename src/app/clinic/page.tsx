"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClinicRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/clinic/dashboard"); }, []);
  return null;
}
