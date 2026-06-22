import React, { useState } from "react";
import { useAuth } from "./contexts/AuthContext";
import { Member } from "@gymsaas/types";

// Mock Data for Simulated Demo Mode
const MOCK_MEMBERS: Member[] = [
  {
    id: "m-1",
    tenantId: "t-1",
    authUserId: null,
    email: "john@resistance.org",
    phone: "+1 555-2029",
    firstName: "John",
    lastName: "Connor",
    dob: "1985-02-28",
    status: "ACTIVE",
    qrCodeToken: "qr-tok-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null
  },
  {
    id: "m-2",
    tenantId: "t-1",
    authUserId: "u-2",
    email: "sarah@cyberdyne.com",
    phone: "+1 555-1984",
    firstName: "Sarah",
    lastName: "Connor",
    dob: "1965-11-10",
    status: "SUSPENDED",
    qrCodeToken: "qr-tok-2",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null
  },
  {
    id: "m-3",
    tenantId: "t-1",
    authUserId: null,
    email: "marcus@salvation.com",
    phone: "+1 555-2018",
    firstName: "Marcus",
    lastName: "Wright",
    dob: "1975-08-22",
    status: "FROZEN",
    qrCodeToken: "qr-tok-3",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null
  }
];

const App: React.FC = () => {
  const { loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "members" | "billing" | "ai">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Styling variable tokens matching design specifications
  const primaryColor = "#f59e0b"; // Amber-500 (Brand Accent)

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ ...styles.spinner, borderColor: `${primaryColor} transparent transparent transparent` }}></div>
        <p style={{ marginTop: 16, color: "#94a3b8" }}>Resolving dynamic tenant parameters...</p>
      </div>
    );
  }

  // Filter members list based on query
  const filteredMembers = MOCK_MEMBERS.filter((m) =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={styles.appWrapper}>
      {/* Sidebar Panel */}
      <aside style={styles.sidebar}>
        <div style={styles.logoContainer}>
          <div style={{ ...styles.logoIcon, backgroundColor: primaryColor }}>G</div>
          <h2 style={styles.logoText}>GymOS</h2>
        </div>

        <nav style={styles.navMenu}>
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              ...styles.navLink,
              backgroundColor: activeTab === "dashboard" ? "rgba(245, 158, 11, 0.1)" : "transparent",
              color: activeTab === "dashboard" ? primaryColor : "#94a3b8"
            }}
          >
            📊 Analytics Dashboard
          </button>
          <button
            onClick={() => setActiveTab("members")}
            style={{
              ...styles.navLink,
              backgroundColor: activeTab === "members" ? "rgba(245, 158, 11, 0.1)" : "transparent",
              color: activeTab === "members" ? primaryColor : "#94a3b8"
            }}
          >
            👥 Member CRM
          </button>
          <button
            onClick={() => setActiveTab("billing")}
            style={{
              ...styles.navLink,
              backgroundColor: activeTab === "billing" ? "rgba(245, 158, 11, 0.1)" : "transparent",
              color: activeTab === "billing" ? primaryColor : "#94a3b8"
            }}
          >
            🎨 Branding & Setup
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            style={{
              ...styles.navLink,
              backgroundColor: activeTab === "ai" ? "rgba(245, 158, 11, 0.1)" : "transparent",
              color: activeTab === "ai" ? primaryColor : "#94a3b8"
            }}
          >
            🧠 AI Insights
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <p style={styles.userName}>Demo Admin</p>
            <p style={styles.userRole}>Active Gym: Apex Gym</p>
          </div>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {activeTab === "dashboard" && (
          <div className="animate-fade-in">
            <header style={styles.header}>
              <h1 style={styles.title}>Analytics Dashboard</h1>
              <p style={styles.subtitle}>Overview of your business metrics</p>
            </header>

            {/* Stats Cards Grid */}
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Monthly Recurring Revenue</p>
                <h3 style={styles.statValue}>$18,500.00</h3>
                <span style={styles.statTrendUp}>↑ 8.4% this month</span>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Active Members</p>
                <h3 style={styles.statValue}>320</h3>
                <span style={styles.statTrendUp}>↑ 12.0% this month</span>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>CRM Lead Conversion</p>
                <h3 style={styles.statValue}>22.5%</h3>
                <span style={styles.statTrendUp}>↑ 2.1% this week</span>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Daily Attendance</p>
                <h3 style={styles.statValue}>145</h3>
                <span style={styles.statTrendDown}>↓ 1.4% today</span>
              </div>
            </div>

            {/* Performance charts mock grid */}
            <div style={styles.chartsGrid}>
              <div style={styles.chartCard}>
                <h4>Peak Traffic Hours</h4>
                <p style={styles.chartMockText}>[ Busiest hours: 6:00 PM - 8:00 PM with avg 85 check-ins ]</p>
              </div>
              <div style={styles.chartCard}>
                <h4>Accrued Tax Liabilities</h4>
                <p style={styles.chartMockText}>[ GST: $1,440.00 | VAT: $600.00 ]</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="animate-fade-in">
            <header style={styles.header}>
              <h1 style={styles.title}>Member Directory</h1>
              <p style={styles.subtitle}>Manage your clients profiles and waivers status</p>
            </header>

            {/* CRM Search and Filters */}
            <div style={styles.searchBarContainer}>
              <input
                type="text"
                placeholder="Search member by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              <button style={{ ...styles.primaryBtn, backgroundColor: primaryColor }}>+ Add Member</button>
            </div>

            {/* CRM Members Table */}
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeaderCell}>Name</th>
                    <th style={styles.tableHeaderCell}>Email</th>
                    <th style={styles.tableHeaderCell}>Phone</th>
                    <th style={styles.tableHeaderCell}>Status</th>
                    <th style={styles.tableHeaderCell}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => (
                    <tr key={m.id} style={styles.tableBodyRow}>
                      <td style={styles.tableCell}>{m.firstName} {m.lastName}</td>
                      <td style={styles.tableCell}>{m.email}</td>
                      <td style={styles.tableCell}>{m.phone}</td>
                      <td style={styles.tableCell}>
                        <span
                          style={{
                            ...styles.statusPill,
                            backgroundColor:
                              m.status === "ACTIVE"
                                ? "rgba(16, 185, 129, 0.1)"
                                : m.status === "FROZEN"
                                ? "rgba(245, 158, 11, 0.1)"
                                : "rgba(244, 63, 94, 0.1)",
                            color:
                              m.status === "ACTIVE"
                                ? "#10b981"
                                : m.status === "FROZEN"
                                ? "#f59e0b"
                                : "#f43f5e"
                          }}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <button
                          onClick={() => setSelectedMember(m)}
                          style={{ ...styles.ghostBtn, borderColor: primaryColor, color: primaryColor }}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail overlay */}
            {selectedMember && (
              <div style={styles.overlay}>
                <div style={styles.modalCard}>
                  <div style={styles.modalHeader}>
                    <h3>{selectedMember.firstName} {selectedMember.lastName}</h3>
                    <button onClick={() => setSelectedMember(null)} style={styles.closeBtn}>✕</button>
                  </div>
                  <div style={styles.modalBody}>
                    <p><strong>Email:</strong> {selectedMember.email}</p>
                    <p><strong>Phone:</strong> {selectedMember.phone}</p>
                    <p><strong>Date of Birth:</strong> {selectedMember.dob}</p>
                    <p><strong>QR Token:</strong> {selectedMember.qrCodeToken}</p>
                    <p style={{ marginTop: 12 }}><strong>HIPAA Medical Notes:</strong></p>
                    <p style={styles.medicalMockText}>
                      [ Asthma history. Keep inhaler in locker #12. No heavy isometric cardio. ]
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "billing" && (
          <div className="animate-fade-in">
            <header style={styles.header}>
              <h1 style={styles.title}>Branding & Setup</h1>
              <p style={styles.subtitle}>Modify your visual theme and gateway settings</p>
            </header>

            <div style={styles.settingsContainer}>
              <div style={styles.settingsSection}>
                <h3>🎨 Visual Theme Sliders</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Primary Brand Color</label>
                  <input type="color" defaultValue="#f59e0b" style={styles.colorInput} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Secondary Brand Color</label>
                  <input type="color" defaultValue="#0f172a" style={styles.colorInput} />
                </div>
                <button style={{ ...styles.primaryBtn, backgroundColor: primaryColor, marginTop: 12 }}>
                  Save Branding Changes
                </button>
              </div>

              <div style={styles.settingsSection}>
                <h3>💳 Gateway Integrations</h3>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Stripe Connect ID</label>
                  <input type="text" defaultValue="acct_1Mmock..." style={styles.textInput} readOnly />
                </div>
                <p style={{ fontSize: 13, color: "#94a3b8" }}>Stripe status: ACTIVE (OAuth connected)</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="animate-fade-in">
            <header style={styles.header}>
              <h1 style={styles.title}>AI Insights</h1>
              <p style={styles.subtitle}>Predictions and risk assessments derived from member check-in trends</p>
            </header>

            <div style={styles.aiAlertsList}>
              <div style={{ ...styles.aiAlertCard, borderLeftColor: "#f43f5e" }}>
                <div style={styles.aiAlertHeader}>
                  <span style={styles.riskBadgeRed}>HIGH CHURN RISK (89%)</span>
                  <h4>Sarah Connor</h4>
                </div>
                <p style={styles.aiAlertReason}>
                  Reason: Attendance velocity dropped by 80% over 14 days. No check-ins logged since June 8.
                </p>
                <button style={{ ...styles.primaryBtn, backgroundColor: primaryColor, alignSelf: "flex-start", marginTop: 8 }}>
                  Trigger WhatsApp Re-Engagement
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Inline CSS Styles for production-grade dark design
const styles: Record<string, React.CSSProperties> = {
  appWrapper: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#020617"
  },
  sidebar: {
    width: "260px",
    backgroundColor: "#0f172a",
    borderRight: "1px solid #1e293b",
    display: "flex",
    flexDirection: "column",
    padding: "24px"
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: "32px"
  },
  logoIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: "bold",
    fontSize: "18px",
    color: "#0f172a"
  },
  logoText: {
    fontSize: "20px",
    marginLeft: "12px",
    fontWeight: "bold"
  },
  navMenu: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1
  },
  navLink: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s"
  },
  sidebarFooter: {
    borderTop: "1px solid #1e293b",
    paddingTop: "16px"
  },
  userInfo: {
    marginBottom: "12px"
  },
  userName: {
    fontWeight: "bold",
    fontSize: "14px"
  },
  userRole: {
    fontSize: "12px",
    color: "#94a3b8"
  },
  logoutBtn: {
    backgroundColor: "transparent",
    border: "1px solid #334155",
    color: "#f43f5e",
    padding: "8px 12px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "12px",
    width: "100%"
  },
  mainContent: {
    flex: 1,
    padding: "40px",
    overflowY: "auto"
  },
  header: {
    marginBottom: "32px"
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold"
  },
  subtitle: {
    color: "#94a3b8",
    marginTop: "4px"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "24px",
    marginBottom: "40px"
  },
  statCard: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
    transition: "all 0.3s"
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: 500
  },
  statValue: {
    fontSize: "26px",
    fontWeight: "bold",
    marginTop: "8px",
    marginBottom: "4px"
  },
  statTrendUp: {
    color: "#10b981",
    fontSize: "12px",
    fontWeight: 500
  },
  statTrendDown: {
    color: "#f43f5e",
    fontSize: "12px",
    fontWeight: 500
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px"
  },
  chartCard: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "24px"
  },
  chartMockText: {
    marginTop: "20px",
    color: "#f59e0b",
    fontSize: "14px",
    fontFamily: "monospace"
  },
  searchBarContainer: {
    display: "flex",
    gap: "16px",
    marginBottom: "24px"
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    padding: "12px 16px",
    color: "#ffffff",
    outline: "none"
  },
  primaryBtn: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 24px",
    color: "#0f172a",
    fontWeight: "bold",
    cursor: "pointer"
  },
  ghostBtn: {
    backgroundColor: "transparent",
    border: "1px solid",
    borderRadius: "6px",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: "13px"
  },
  tableWrapper: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    overflow: "hidden"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  },
  tableHeaderRow: {
    borderBottom: "1px solid #1e293b",
    backgroundColor: "rgba(30, 41, 59, 0.5)"
  },
  tableHeaderCell: {
    padding: "16px 24px",
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: 600
  },
  tableBodyRow: {
    borderBottom: "1px solid #1e293b"
  },
  tableCell: {
    padding: "16px 24px",
    fontSize: "14px"
  },
  statusPill: {
    padding: "4px 8px",
    borderRadius: "9999px",
    fontSize: "12px",
    fontWeight: "bold"
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#020617"
  },
  spinner: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    borderWidth: "4px",
    borderStyle: "solid",
    animation: "spin 1s linear infinite"
  },
  settingsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "24px"
  },
  settingsSection: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "12px",
    padding: "24px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "16px"
  },
  label: {
    fontSize: "14px",
    color: "#94a3b8"
  },
  colorInput: {
    backgroundColor: "transparent",
    border: "none",
    width: "60px",
    height: "40px",
    cursor: "pointer"
  },
  textInput: {
    backgroundColor: "#020617",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    padding: "12px",
    color: "#ffffff",
    outline: "none"
  },
  aiAlertsList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  aiAlertCard: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderLeftWidth: "6px",
    borderRadius: "12px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  aiAlertHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  riskBadgeRed: {
    color: "#f43f5e",
    fontSize: "12px",
    fontWeight: "bold",
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    padding: "4px 8px",
    borderRadius: "4px"
  },
  aiAlertReason: {
    fontSize: "14px",
    color: "#94a3b8"
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  modalCard: {
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "16px",
    width: "480px",
    padding: "24px"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1e293b",
    paddingBottom: "12px",
    marginBottom: "16px"
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "18px",
    cursor: "pointer"
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  medicalMockText: {
    backgroundColor: "rgba(244, 63, 94, 0.05)",
    border: "1px dashed rgba(244, 63, 94, 0.3)",
    borderRadius: "8px",
    padding: "12px",
    color: "#f43f5e",
    fontFamily: "monospace",
    fontSize: "13px"
  }
};

export default App;
