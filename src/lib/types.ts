
export type RegistrationStatus = 'Processed' | 'Pending Review' | 'Rejected' | 'Processing' | 'Failed';

export interface Registration {
  id: string;
  applicantName: string;
  submissionDate: string;
  status: RegistrationStatus;
  location: string;
  email: string;
  phone: string;
  content: string;
  requiredFieldsFilled: boolean;
  attachmentsIncluded: boolean;
  officer?: string;
  remarks?: string;
  rejectionReason?: string;
  assignedReviewerId?: string;
  updatedAt?: string;
  isPrinted?: boolean;
}

export interface DashboardStats {
  total: number;
  processed: number;
  pendingReview: number;
  rejected: number;
  processing: number;
  failed: number;
  totalOfficers: number;
  activeOfficers: number;
  pendingOfficers: number;
  onDutyOfficers: number;
}

export interface DailyReport {
  id: string;
  officerId: string;
  date: string;
  ethioCount: number;
  safaricomCount: number;
  total: number;
  remarks?: string;
  timestamp?: any;
}

export interface MonthlySummary {
  id: string;
  officerId: string;
  month: string;
  year: string;
  ethio: number;
  safaricom: number;
  total: number;
  processed: number;
  processing: number;
  rejected: number;
  failed: number;
  pendingReview: number;
  timestamp?: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  text?: string;
  audioUrl?: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  timestamp: any; 
  isEdited?: boolean;
  deletedFor?: string[];
  updatedAt?: any;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  members: string[];
  name?: string;
  lastMessage?: string;
  lastTimestamp?: any;
  createdBy?: string;
  pinnedMessageId?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'alert' | 'update';
  targetRegion?: string;
  targetRole?: 'all' | 'admin' | 'reviewer';
  date: string;
  timestamp?: any;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  region?: string;
  cluster?: string;
  profilePhoto?: string;
  lastAnnouncementReadAt?: string;
  lastMessageReadAt?: string;
  updatedAt?: string;
  isDutyActive?: boolean;
}

export interface SystemSettings {
  id: string;
  bureauName: string;
  logoUrl: string;
  contactEmail?: string;
  contactPhone?: string;
  officeAddress?: string;
  operationalHours?: string;
  systemProtocol?: string;
  maintenanceMode?: boolean;
  publicLookupEnabled?: boolean;
  primaryLanguage?: string;
  dateFormat?: string;
  updatedAt: any;
}

export interface AuditLog {
  id: string;
  officerId: string;
  officerName: string;
  action: string;
  targetId: string;
  details: string;
  timestamp: any;
}
