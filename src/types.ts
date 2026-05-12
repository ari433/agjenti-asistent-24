export type UserRole = 'admin' | 'member';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  lastActive: any;
  companyId?: string;
  joinedAt?: any;
  subscriptionPlan?: 'free' | 'pro' | 'unlimited';
  subscriptionStatus?: 'active' | 'expired' | 'trial';
}

export interface Company {
  id: string;
  name: string;
  joinCode: string;
  createdBy: string;
  createdAt: any;
  logo?: string;
  trialStartedAt?: any;
  subscriptionPlan?: 'free' | 'pro' | 'unlimited';
  subscriptionStatus?: 'active' | 'expired' | 'trial';
}

export interface MarketingAsset {
  id: string;
  companyId: string;
  url: string;
  prompt: string;
  type: 'poster' | 'social' | 'banner';
  createdAt: any;
}

export type GoalPeriod = '1m' | '6m' | '12m';
export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  title: string;
  description: string;
  period: GoalPeriod;
  status: GoalStatus;
  createdBy: string;
  createdAt: any;
  companyId: string;
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  DONE = 'done',
  STUCK = 'stuck'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy: string;
  createdAt: any;
  companyId: string;
  deliverables?: TaskDeliverable[];
  aiAnalysis?: string;
  isAiValidated?: boolean;
}

export interface TaskDeliverable {
  id: string;
  type: 'text' | 'link' | 'file';
  content: string;
  fileName?: string;
  submittedAt: any;
  submittedBy: string;
}

export interface Notification {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  message: string;
  type: 'task' | 'message' | 'goal';
  read: boolean;
  relatedId?: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  content: string;
  createdAt: any;
  companyId: string;
}

export interface PerformanceAnalysis {
  id: string;
  userId: string;
  analysis: string;
  score: number;
  period: string;
  createdAt: any;
}
