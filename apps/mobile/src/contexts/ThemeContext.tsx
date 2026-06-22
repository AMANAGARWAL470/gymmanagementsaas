import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { TenantBranding } from "@gymsaas/types";

// Dynamic Theme definition structure
export interface ActiveTheme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  fontFamily: string;
  locale: string;
  measurementSystem: "METRIC" | "IMPERIAL";
}

interface ThemeContextType {
  theme: ActiveTheme;
  branding: TenantBranding | null;
  loading: boolean;
  resolveTenantTheme: (tenantSlugOrDomain: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "placeholder_anon_key";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DEFAULT_THEME: ActiveTheme = {
  primary: "#f59e0b",
  secondary: "#0f172a",
  background: "#020617",
  surface: "#0f172a",
  text: "#ffffff",
  fontFamily: "System",
  locale: "en",
  measurementSystem: "METRIC",
};

export const ThemeProvider: React.FC<{ children: React.ReactNode; isDarkMode?: boolean }> = ({ 
  children, 
  isDarkMode = true 
}) => {
  const [theme, setTheme] = useState<ActiveTheme>(DEFAULT_THEME);
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [loading, setLoading] = useState(true);

  // Apply visual theme values dynamically
  const applyThemeConfig = (config: TenantBranding) => {
    setBranding(config);
    setTheme({
      primary: isDarkMode ? config.primaryColorDark : config.primaryColorLight,
      secondary: isDarkMode ? config.secondaryColorDark : config.secondaryColorLight,
      background: isDarkMode ? "#020617" : "#f8fafc",
      surface: isDarkMode ? "#0f172a" : "#ffffff",
      text: isDarkMode ? "#ffffff" : "#0f172a",
      fontFamily: config.fontFamily || "System",
      locale: config.locale,
      measurementSystem: config.measurementSystem,
    });
  };

  // 1. Resolve branding details by gym slug
  const resolveTenantTheme = async (tenantSlugOrDomain: string) => {
    setLoading(true);
    try {
      // Find tenant ID first
      const { data: tenant, error: tenantError } = await supabase
        .from("tenants")
        .select("id")
        .or(`slug.eq.${tenantSlugOrDomain},custom_domain.eq.${tenantSlugOrDomain}`)
        .maybeSingle();

      if (tenantError || !tenant) {
        throw new Error("Target Gym not registered on the platform");
      }

      // Fetch branding properties
      const { data: brandingConfig, error: brandingError } = await supabase
        .from("tenant_branding")
        .select("*")
        .eq("tenant_id", tenant.id)
        .single();

      if (brandingError || !brandingConfig) {
        throw new Error("Failed to load branding configurations");
      }

      // 2. Cache details locally
      await AsyncStorage.setItem("tenant_id", tenant.id);
      await AsyncStorage.setItem("branding_cache", JSON.stringify(brandingConfig));
      
      applyThemeConfig(brandingConfig as unknown as TenantBranding);
    } catch (err) {
      console.warn("Dynamic Theme resolution warning:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Attempt to load from cache first
    AsyncStorage.getItem("branding_cache").then((cached) => {
      if (cached) {
        applyThemeConfig(JSON.parse(cached));
      }
      setLoading(false);
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, branding, loading, resolveTenantTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
