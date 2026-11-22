"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AITM_DEPARTMENTS, type AITMDepartmentMeta } from "@/lib/constants/departments";

export { AITM_DEPARTMENTS, type AITMDepartmentMeta };

interface DepartmentContextType {
  selectedDeptCode: string | "ALL";
  setSelectedDeptCode: (code: string | "ALL") => void;
  pinnedDepartment: AITMDepartmentMeta | null;
  departments: AITMDepartmentMeta[];
}

const DepartmentContext = createContext<DepartmentContextType>({
  selectedDeptCode: "ALL",
  setSelectedDeptCode: () => {},
  pinnedDepartment: null,
  departments: AITM_DEPARTMENTS,
});

const STORAGE_KEY = "ashoka_pinned_dept";

export function DepartmentProvider({ children }: { children: React.ReactNode }) {
  const [selectedDeptCode, setSelectedDeptCodeState] = useState<string | "ALL">("ALL");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "ALL" || AITM_DEPARTMENTS.some((d) => d.code === stored))) {
        setSelectedDeptCodeState(stored);
      }
    } catch {
      // Ignore localStorage errors (e.g. private browsing mode)
    }
  }, []);

  const setSelectedDeptCode = (code: string | "ALL") => {
    setSelectedDeptCodeState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Ignore localStorage errors
    }
  };

  const pinnedDepartment =
    selectedDeptCode !== "ALL"
      ? AITM_DEPARTMENTS.find((d) => d.code === selectedDeptCode) || null
      : null;

  return (
    <DepartmentContext.Provider
      value={{
        selectedDeptCode,
        setSelectedDeptCode,
        pinnedDepartment,
        departments: AITM_DEPARTMENTS,
      }}
    >
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentContext);
  if (!context) {
    throw new Error("useDepartment must be used within a DepartmentProvider");
  }
  return context;
}
