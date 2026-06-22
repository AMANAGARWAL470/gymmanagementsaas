import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient, User, Session } from "@supabase/supabase-js";
import { StaffRole } from "@gymsaas/types";

// Helper function to decode JWT claims locally without validation (client-side only)
function parseJwtClaims(token: string): { tenant_id?: string; role?: StaffRole } {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return {
      tenant_id: payload.user_metadata?.tenant_id || payload.tenantId,
      role: payload.user_metadata?.role || payload.role,
    };
  } catch (_err) {
    return {};
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  tenantId: string | null;
  role: StaffRole | "OWNER" | "MEMBER" | null;
  loading: boolean;
  logout: () => Promise<void>;
  switchTenant: (targetTenantId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Supabase client instance (bind credentials from environment)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "placeholder_anon_key";
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<StaffRole | "OWNER" | "MEMBER" | null>(null);
  const [loading, setLoading] = useState(true);

  // Parse claims from active session token
  const resolveSessionClaims = (activeSession: Session | null) => {
    if (activeSession) {
      setSession(activeSession);
      setUser(activeSession.user);
      
      const claims = parseJwtClaims(activeSession.access_token);
      setTenantId(claims.tenant_id || null);
      setRole(claims.role || null);
    } else {
      setSession(null);
      setUser(null);
      setTenantId(null);
      setRole(null);
    }
  };

  useEffect(() => {
    // 1. Fetch initial session state
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      resolveSessionClaims(initialSession);
      setLoading(false);
    });

    // 2. Listen to authentication changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      resolveSessionClaims(updatedSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const switchTenant = async (targetTenantId: string) => {
    if (!session) return;
    setLoading(true);
    
    // Call the edge function switch-tenant to update user metadata context
    const { data, error } = await supabase.functions.invoke("auth/switch-tenant", {
      body: { targetTenantId },
    });

    if (error || !data.success) {
      setLoading(false);
      throw new Error(error?.message || "Failed to switch active gym workspace");
    }

    // Force refresh Supabase token to generate new JWT with updated claims
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      setLoading(false);
      throw refreshError;
    }
    
    resolveSessionClaims(refreshData.session);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, tenantId, role, loading, logout, switchTenant }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
