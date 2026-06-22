import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ThemeProvider, useTheme } from "./src/contexts/ThemeContext";
import { QrCheckinScreen } from "./src/screens/QrCheckinScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";

type TabType = "dashboard" | "scan" | "workouts" | "diets" | "challenges";

interface SetLog {
  reps: number;
  weight: number;
}

interface WorkoutLog {
  id: string;
  exercise: string;
  sets: SetLog[];
  timestamp: string;
}

const MobileAppInner: React.FC = () => {
  const { theme, resolveTenantTheme, loading } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [tenantSlug, setTenantSlug] = useState("");
  const [currentGym, setCurrentGym] = useState("Apex Gym");

  // State for Workout Tracker
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([
    {
      id: "w-1",
      exercise: "Bench Press",
      sets: [
        { reps: 10, weight: 135 },
        { reps: 8, weight: 155 },
      ],
      timestamp: "Yesterday",
    },
  ]);
  const [newExercise, setNewExercise] = useState("");
  const [newReps, setNewReps] = useState("");
  const [newWeight, setNewWeight] = useState("");

  // State for Diet & Calorie Tracker
  const [caloriesLogged, setCaloriesLogged] = useState(1450);
  const [waterCups, setWaterCups] = useState(4);
  const [foodInput, setFoodInput] = useState("");
  const [caloriesInput, setCaloriesInput] = useState("");

  // Setup initial mock data in storage for QR Checkin
  useEffect(() => {
    const initStorage = async () => {
      await AsyncStorage.setItem("member_id", "m-1");
      await AsyncStorage.setItem("tenant_id", "t-1");
    };
    initStorage();
  }, []);

  const handleResolveTheme = async () => {
    if (!tenantSlug.trim()) return;
    await resolveTenantTheme(tenantSlug.toLowerCase().trim());
    setCurrentGym(tenantSlug.toUpperCase().trim());
    setTenantSlug("");
  };

  const handleLogWorkout = () => {
    if (!newExercise.trim() || !newReps || !newWeight) return;
    const repsVal = parseInt(newReps, 10);
    const weightVal = parseFloat(newWeight);
    if (isNaN(repsVal) || isNaN(weightVal)) return;

    const newLog: WorkoutLog = {
      id: Math.random().toString(),
      exercise: newExercise.trim(),
      sets: [{ reps: repsVal, weight: weightVal }],
      timestamp: "Just Now",
    };

    setWorkoutLogs([newLog, ...workoutLogs]);
    setNewExercise("");
    setNewReps("");
    setNewWeight("");
  };

  const handleLogFood = () => {
    if (!caloriesInput) return;
    const calVal = parseInt(caloriesInput, 10);
    if (isNaN(calVal)) return;

    setCaloriesLogged((prev) => prev + calVal);
    setFoodInput("");
    setCaloriesInput("");
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: "#020617" }]}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={{ color: "#94a3b8", marginTop: 12 }}>Loading branding context...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header Branding Panel */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.primary + "33" }]}>
          <View>
            <Text style={[styles.gymTitle, { color: theme.primary }]}>{currentGym}</Text>
            <Text style={styles.userSubtitle}>Welcome back, John!</Text>
          </View>
          <View style={[styles.activeStatusPill, { backgroundColor: theme.primary + "1A" }]}>
            <Text style={[styles.statusText, { color: theme.primary }]}>● ACTIVE</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Tenant Resolver Selector (Mocking Dynamic Domain / Branding swap) */}
          <View style={[styles.resolverCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.resolverTitle, { color: theme.text }]}>🌐 Multi-Tenant Domain Swap</Text>
            <View style={styles.resolverRow}>
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter gym slug (e.g. apex-gym)"
                placeholderTextColor="#64748b"
                value={tenantSlug}
                onChangeText={setTenantSlug}
              />
              <TouchableOpacity
                onPress={handleResolveTheme}
                style={[styles.btn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.btnText}>Apply Theme</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tab Render Switchboard */}
          {activeTab === "dashboard" && (
            <View>
              {/* Member Card Component */}
              <View style={[styles.memberCard, { backgroundColor: theme.primary }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardLogo}>GymOS Member</Text>
                  <Text style={styles.cardTier}>PLATINUM</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardNumber}>•••• •••• •••• 1209</Text>
                  <Text style={styles.cardHolderName}>JOHN CONNOR</Text>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardValidText}>Valid Thru: 12/2026</Text>
                </View>
              </View>

              {/* Quick Stats Grid */}
              <Text style={styles.sectionHeader}>Quick Stats</Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                  <Text style={styles.statLabel}>Check-ins (Week)</Text>
                  <Text style={[styles.statValue, { color: theme.primary }]}>3 / 5</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                  <Text style={styles.statLabel}>Diet Calorie Progress</Text>
                  <Text style={[styles.statValue, { color: theme.primary }]}>{caloriesLogged} kcal</Text>
                </View>
              </View>

              {/* Motivational Tip */}
              <View style={[styles.infoBanner, { backgroundColor: theme.surface }]}>
                <Text style={styles.bannerEmoji}>💡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bannerTitle, { color: theme.text }]}>Today's Target</Text>
                  <Text style={styles.bannerSubtitle}>
                    Aim for 160g of protein to maintain muscle mass in a 20% caloric deficit.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeTab === "scan" && (
            <View style={styles.scanWrapper}>
              <QrCheckinScreen />
            </View>
          )}

          {activeTab === "workouts" && (
            <View>
              {/* Log Workout Exercise Form */}
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>🏋️ Log Exercise Set</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, marginBottom: 12 }]}
                  placeholder="Exercise Name (e.g. Bench Press)"
                  placeholderTextColor="#64748b"
                  value={newExercise}
                  onChangeText={setNewExercise}
                />
                <View style={styles.formRow}>
                  <TextInput
                    style={[styles.inputHalf, { color: theme.text }]}
                    placeholder="Reps"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={newReps}
                    onChangeText={setNewReps}
                  />
                  <TextInput
                    style={[styles.inputHalf, { color: theme.text }]}
                    placeholder="Weight (lbs)"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={newWeight}
                    onChangeText={setNewWeight}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleLogWorkout}
                  style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.btnText}>Log Set</Text>
                </TouchableOpacity>
              </View>

              {/* Workout History */}
              <Text style={styles.sectionHeader}>Log History</Text>
              {workoutLogs.map((log) => (
                <View key={log.id} style={[styles.logCard, { backgroundColor: theme.surface }]}>
                  <View style={styles.logHeader}>
                    <Text style={[styles.logExerciseName, { color: theme.text }]}>{log.exercise}</Text>
                    <Text style={styles.logTime}>{log.timestamp}</Text>
                  </View>
                  {log.sets.map((s, idx) => (
                    <Text key={idx} style={styles.logSetText}>
                      Set {idx + 1}: {s.reps} Reps @ {s.weight} lbs
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          {activeTab === "diets" && (
            <View>
              {/* Calorie Progress Card */}
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>🍳 Calorie Deficit Tracker</Text>
                <Text style={styles.macroTrackerSub}>Daily Limit: 2200 kcal</Text>
                
                {/* Progress bar container */}
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: theme.primary,
                        width: `${Math.min((caloriesLogged / 2200) * 100, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.calorieNumber, { color: theme.primary }]}>
                  {caloriesLogged} / 2200 kcal
                </Text>

                {/* Macro Splits Grid */}
                <View style={styles.macroSplitRow}>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroLabel}>Protein</Text>
                    <Text style={[styles.macroVal, { color: theme.primary }]}>160g</Text>
                  </View>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroLabel}>Carbs</Text>
                    <Text style={[styles.macroVal, { color: theme.primary }]}>254g</Text>
                  </View>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroLabel}>Fat</Text>
                    <Text style={[styles.macroVal, { color: theme.primary }]}>61g</Text>
                  </View>
                </View>
              </View>

              {/* Log Food Entry Form */}
              <View style={[styles.card, { backgroundColor: theme.surface, marginTop: 16 }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>➕ Quick Log Food</Text>
                <View style={styles.resolverRow}>
                  <TextInput
                    style={[styles.input, { color: theme.text, flex: 2 }]}
                    placeholder="Meal description (e.g. Chicken Salad)"
                    placeholderTextColor="#64748b"
                    value={foodInput}
                    onChangeText={setFoodInput}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text, flex: 1, marginLeft: 8 }]}
                    placeholder="Calories"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={caloriesInput}
                    onChangeText={setCaloriesInput}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleLogFood}
                  style={[styles.primaryBtn, { backgroundColor: theme.primary, marginTop: 12 }]}
                >
                  <Text style={styles.btnText}>Add Calories</Text>
                </TouchableOpacity>
              </View>

              {/* Water Intake Section */}
              <View style={[styles.card, { backgroundColor: theme.surface, marginTop: 16 }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>💧 Hydration Tracker</Text>
                <Text style={styles.macroTrackerSub}>Daily Target: 8 Cups</Text>
                <View style={styles.waterRow}>
                  <Text style={[styles.waterVal, { color: theme.text }]}>{waterCups} / 8 Cups</Text>
                  <TouchableOpacity
                    onPress={() => setWaterCups(waterCups + 1)}
                    style={[styles.addWaterBtn, { backgroundColor: theme.primary }]}
                  >
                    <Text style={styles.btnText}>+ 1 Cup</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {activeTab === "challenges" && (
            <View>
              {/* Challenge Banner */}
              <View style={[styles.challengeHero, { backgroundColor: theme.surface }]}>
                <Text style={styles.challengeIcon}>🏆</Text>
                <Text style={[styles.challengeTitle, { color: theme.text }]}>30-Day Squat Challenge</Text>
                <Text style={styles.challengeDesc}>
                  Perform squats every day. Log your sets to gain points and climb the rankings!
                </Text>
              </View>

              {/* Leaderboard list */}
              <Text style={styles.sectionHeader}>Gym Leaderboard</Text>
              <View style={[styles.leaderboardCard, { backgroundColor: theme.surface }]}>
                <View style={styles.leaderboardRow}>
                  <Text style={styles.rankNum}>🥇</Text>
                  <Text style={[styles.leaderboardName, { color: theme.text }]}>Sarah Connor</Text>
                  <Text style={[styles.leaderboardScore, { color: theme.primary }]}>300 Reps</Text>
                </View>
                <View style={styles.leaderboardRow}>
                  <Text style={styles.rankNum}>🥈</Text>
                  <Text style={[styles.leaderboardName, { color: theme.text }]}>John Connor</Text>
                  <Text style={[styles.leaderboardScore, { color: theme.primary }]}>280 Reps</Text>
                </View>
                <View style={[styles.leaderboardRow, styles.currentUserRow]}>
                  <Text style={styles.rankNum}>3</Text>
                  <Text style={[styles.leaderboardName, { color: theme.primary, fontWeight: "bold" }]}>You</Text>
                  <Text style={[styles.leaderboardScore, { color: theme.primary, fontWeight: "bold" }]}>150 Reps</Text>
                </View>
                <View style={styles.leaderboardRow}>
                  <Text style={styles.rankNum}>4</Text>
                  <Text style={[styles.leaderboardName, { color: theme.text }]}>Marcus Wright</Text>
                  <Text style={[styles.leaderboardScore, { color: theme.primary }]}>120 Reps</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Floating Bottom Tab Bar Navigation */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.primary + "22" }]}>
          <TouchableOpacity onPress={() => setActiveTab("dashboard")} style={styles.tabItem}>
            <Text style={[styles.tabIcon, { color: activeTab === "dashboard" ? theme.primary : "#64748b" }]}>📊</Text>
            <Text style={[styles.tabText, { color: activeTab === "dashboard" ? theme.primary : "#64748b" }]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("scan")} style={styles.tabItem}>
            <Text style={[styles.tabIcon, { color: activeTab === "scan" ? theme.primary : "#64748b" }]}>🔑</Text>
            <Text style={[styles.tabText, { color: activeTab === "scan" ? theme.primary : "#64748b" }]}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("workouts")} style={styles.tabItem}>
            <Text style={[styles.tabIcon, { color: activeTab === "workouts" ? theme.primary : "#64748b" }]}>🏋️</Text>
            <Text style={[styles.tabText, { color: activeTab === "workouts" ? theme.primary : "#64748b" }]}>Workouts</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("diets")} style={styles.tabItem}>
            <Text style={[styles.tabIcon, { color: activeTab === "diets" ? theme.primary : "#64748b" }]}>🍳</Text>
            <Text style={[styles.tabText, { color: activeTab === "diets" ? theme.primary : "#64748b" }]}>Diets</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab("challenges")} style={styles.tabItem}>
            <Text style={[styles.tabIcon, { color: activeTab === "challenges" ? theme.primary : "#64748b" }]}>🏆</Text>
            <Text style={[styles.tabText, { color: activeTab === "challenges" ? theme.primary : "#64748b" }]}>Rank</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <ThemeProvider isDarkMode={true}>
      <MobileAppInner />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gymTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  userSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 2,
  },
  activeStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  resolverCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  resolverTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  resolverRow: {
    flexDirection: "row",
  },
  input: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  inputHalf: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#334155",
    marginHorizontal: 4,
  },
  btn: {
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  btnText: {
    color: "#020617",
    fontWeight: "bold",
    fontSize: 13,
  },
  memberCard: {
    borderRadius: 16,
    height: 180,
    padding: 20,
    justifyContent: "space-between",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardLogo: {
    color: "#020617",
    fontWeight: "bold",
    fontSize: 16,
  },
  cardTier: {
    color: "#020617",
    fontSize: 12,
    fontWeight: "bold",
    opacity: 0.8,
  },
  cardBody: {
    marginTop: 20,
  },
  cardNumber: {
    color: "#020617",
    fontSize: 18,
    letterSpacing: 2,
    fontWeight: "bold",
    opacity: 0.9,
  },
  cardHolderName: {
    color: "#020617",
    fontSize: 15,
    marginTop: 8,
    fontWeight: "bold",
  },
  cardFooter: {
    alignItems: "flex-end",
  },
  cardValidText: {
    color: "#020617",
    fontSize: 11,
    opacity: 0.7,
  },
  sectionHeader: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
  },
  infoBanner: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  bannerEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  bannerSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 2,
  },
  scanWrapper: {
    flex: 1,
    height: Dimensions.get("window").height * 0.6,
    justifyContent: "center",
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  formRow: {
    flexDirection: "row",
    marginHorizontal: -4,
    marginBottom: 12,
  },
  primaryBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  logExerciseName: {
    fontSize: 15,
    fontWeight: "bold",
  },
  logTime: {
    color: "#64748b",
    fontSize: 12,
  },
  logSetText: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 4,
  },
  macroTrackerSub: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: "#1e293b",
    borderRadius: 5,
    overflow: "hidden",
    marginVertical: 8,
  },
  progressBarFill: {
    height: "100%",
  },
  calorieNumber: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
  },
  macroSplitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  macroPill: {
    width: "30%",
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  macroLabel: {
    color: "#94a3b8",
    fontSize: 11,
  },
  macroVal: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 4,
  },
  waterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  waterVal: {
    fontSize: 16,
    fontWeight: "bold",
  },
  addWaterBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  challengeHero: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    textAlign: "center",
  },
  challengeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  challengeDesc: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  leaderboardCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  leaderboardRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    alignItems: "center",
  },
  rankNum: {
    fontSize: 16,
    width: 32,
    textAlign: "center",
  },
  leaderboardName: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  leaderboardScore: {
    fontSize: 14,
    fontWeight: "600",
  },
  currentUserRow: {
    backgroundColor: "rgba(245, 158, 11, 0.05)",
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  tabIcon: {
    fontSize: 20,
  },
  tabText: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: "500",
  },
});
