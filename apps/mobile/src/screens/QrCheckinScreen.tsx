import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Helper function to generate client-side SHA256 HMAC representation in React Native
async function generateClientHmac(message: string, secretKey: string): Promise<string> {
  // In a full mobile build, you would import a native crypto polyfill (e.g. expo-crypto).
  // This simulates the HMAC SHA256 hex signature generation for representation.
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(message);

  try {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    return Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (_e) {
    // Basic JS fallback for development purposes if web crypto subtle is not present
    return "simulated_hmac_signature_" + message.length;
  }
}

export const QrCheckinScreen: React.FC = () => {
  const { theme } = useTheme();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [loading, setLoading] = useState(true);

  const generateToken = async () => {
    try {
      const memberId = await AsyncStorage.getItem("member_id") || "guest_member_id";
      const tenantId = await AsyncStorage.getItem("tenant_id") || "guest_tenant_id";
      
      const timestamp = Date.now();
      const globalSecret = "fallback_system_secret_key";
      const tenantSecret = `${globalSecret}_${tenantId}`;
      
      const message = `${memberId}:${timestamp}`;
      const signature = await generateClientHmac(message, tenantSecret);
      
      // Token format parsed by Edge function: memberId:timestamp:signature
      setQrToken(`${message}:${signature}`);
      setTimeLeft(15);
      setLoading(false);
    } catch (err) {
      console.error("Failed to generate check-in token:", err);
    }
  };

  useEffect(() => {
    // 1. Initial generation
    generateToken();

    // 2. Refresh QR code token every 15 seconds
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateToken();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text, fontFamily: theme.fontFamily }]}>
        Scan to Access
      </Text>
      
      <Text style={styles.subtitle}>
        Place the QR code in front of the gate scanner to unlock the door.
      </Text>

      <View style={[styles.qrContainer, { borderColor: theme.primary }]}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : (
          <View style={styles.qrPlaceholder}>
            {/* 
              In production, you would import a QR library (e.g. react-native-qrcode-svg) 
              passing values: value={qrToken} size={220}
            */}
            <Text style={styles.qrMockCode}>{qrToken?.substring(0, 30)}...</Text>
          </View>
        )}
      </View>

      <Text style={[styles.timer, { color: theme.primary }]}>
        Regenerates in {timeLeft} seconds
      </Text>
    </View>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
  },
  qrContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderWidth: 4,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  qrPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  qrMockCode: {
    color: "#0f172a",
    fontSize: 10,
    textAlign: "center",
  },
  timer: {
    marginTop: 24,
    fontSize: 15,
    fontWeight: "600",
  },
});
