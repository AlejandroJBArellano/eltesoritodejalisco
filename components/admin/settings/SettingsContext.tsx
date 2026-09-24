"use client";

import React, { createContext, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateTenantSettings } from "@/app/admin/settings/actions";
import type { TenantContextType } from "@/lib/tenant";
import type { ColorPreset } from "./types";

interface SettingsContextValue {
  initialTenant: TenantContextType;
  success: boolean;
  setSuccess: (val: boolean) => void;
  error: string | null;
  setError: (val: string | null) => void;
  loading: boolean;
  primaryColor: string;
  setPrimaryColor: (val: string) => void;
  secondaryColor: string;
  setSecondaryColor: (val: string) => void;
  darkBgColor: string;
  setDarkBgColor: (val: string) => void;
  logoPreview: string | null;
  setLogoPreview: (val: string | null) => void;
  loyaltyEnabled: boolean;
  setLoyaltyEnabled: (val: boolean) => void;
  loyaltyRatio: number;
  setLoyaltyRatio: (val: number) => void;
  terminalCommissionRate: string;
  setTerminalCommissionRate: (val: string) => void;
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleRemoveLogo: () => void;
  handleApplyPreset: (preset: ColorPreset) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  initialTenant,
  children,
}: {
  initialTenant: TenantContextType;
  children: React.ReactNode;
}) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Live preview state
  const [primaryColor, setPrimaryColor] = useState(
    initialTenant.primary_color || "#FFB7CE",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    initialTenant.secondary_color || "#FFD1DC",
  );
  const [darkBgColor, setDarkBgColor] = useState(
    initialTenant.dark_bg_color || "#121212",
  );
  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialTenant.logo_url || null,
  );
  const [loyaltyEnabled, setLoyaltyEnabled] = useState<boolean>(
    initialTenant.loyalty_enabled !== false,
  );
  const [loyaltyRatio, setLoyaltyRatio] = useState<number>(
    initialTenant.loyalty_ratio || 10,
  );
  const [terminalCommissionRate, setTerminalCommissionRate] = useState<string>(
    initialTenant.terminal_commission_rate !== null &&
      initialTenant.terminal_commission_rate !== undefined
      ? String(initialTenant.terminal_commission_rate)
      : "0",
  );

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError("El archivo no debe pesar más de 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Por favor sube solo archivos de imagen");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("El archivo no debe pesar más de 2MB");
        return;
      }
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleApplyPreset = (preset: ColorPreset) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setDarkBgColor(preset.darkBg);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await updateTenantSettings(formData);

      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        router?.refresh();
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch {
      setError("Error inesperado al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const value: SettingsContextValue = {
    initialTenant,
    success,
    setSuccess,
    error,
    setError,
    loading,
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
    darkBgColor,
    setDarkBgColor,
    logoPreview,
    setLogoPreview,
    loyaltyEnabled,
    setLoyaltyEnabled,
    loyaltyRatio,
    setLoyaltyRatio,
    terminalCommissionRate,
    setTerminalCommissionRate,
    isDragging,
    setIsDragging,
    fileInputRef,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleRemoveLogo,
    handleApplyPreset,
    handleSubmit,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error(
      "useSettingsContext must be used within a SettingsProvider",
    );
  }
  return context;
}

export function useOptionalSettingsContext() {
  return useContext(SettingsContext);
}
