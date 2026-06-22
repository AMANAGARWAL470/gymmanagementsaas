// Global Enums
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_PAYMENT';
export type StaffRole = 'ADMIN' | 'TRAINER' | 'RECEPTIONIST';
export type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'FROZEN' | 'SUSPENDED';
export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'FROZEN';
export type FreezeStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type InvoiceStatus = 'PAID' | 'UNPAID' | 'OVERDUE' | 'VOID';
export type PaymentGateway = 'STRIPE' | 'RAZORPAY' | 'MANUAL';
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type CheckinMethod = 'QR' | 'RFID' | 'BIOMETRIC' | 'MANUAL';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'TRIAL' | 'WON' | 'LOST';
export type CmsModuleType = 'EXERCISE' | 'WORKOUT' | 'DIET' | 'PLAN' | 'NOTIFICATION' | 'FORM' | 'PROMOTION';
export type CmsVersionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

// Core Schemas
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TenantBranding {
  tenantId: string;
  logoUrl: string | null;
  appIconUrl: string | null;
  splashScreenUrl: string | null;
  memberCardTemplateUrl: string | null;
  primaryColorLight: string;
  secondaryColorLight: string;
  primaryColorDark: string;
  secondaryColorDark: string;
  fontFamily: string;
  timezone: string;
  locale: string;
  measurementSystem: 'METRIC' | 'IMPERIAL';
  updatedAt: string;
}

export interface Staff {
  id: string;
  tenantId: string;
  authUserId: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Member {
  id: string;
  tenantId: string;
  authUserId: string | null;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  status: MemberStatus;
  qrCodeToken: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MembershipPlan {
  id: string;
  tenantId: string;
  name: string;
  price: number;
  durationDays: number;
  isRecurring: boolean;
  maxFreezes: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MemberMembership {
  id: string;
  tenantId: string;
  memberId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Freeze {
  id: string;
  tenantId: string;
  membershipId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: FreezeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  memberId: string;
  membershipId: string | null;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId: string;
  transactionId: string | null;
  gateway: PaymentGateway;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface Attendance {
  id: string;
  tenantId: string;
  memberId: string;
  checkIn: string;
  checkOut: string | null;
  method: CheckinMethod;
  checkedInByStaffId: string | null;
  deviceId: string | null;
}

export interface MemberHealthRecord {
  id: string;
  tenantId: string;
  memberId: string;
  encryptedMedicalNotes: string | null;
  bioMetrics: Record<string, any>;
  updatedAt: string;
}

// API Payloads
export interface CheckoutSessionPayload {
  memberId: string;
  membershipPlanId: string;
  billingCountry: string;
}

export interface CheckoutSessionResponse {
  gateway: PaymentGateway;
  sessionId?: string;
  checkoutUrl?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
}

export interface DynamicQrPayload {
  memberId: string;
  timestamp: number;
  signature: string;
}

export interface OfflineSyncScan {
  cardToken: string;
  scannedAt: string;
}

export interface OfflineSyncPayload {
  scans: OfflineSyncScan[];
}
