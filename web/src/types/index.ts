import type { 
  ProjectSummary, 
  Wallet, 
  APIKey, 
  CallRecord, 
  AuditMessage, 
  Approval, 
  ServiceTool, 
  PolicyResponse,
  OrgMember,
  UserOrgMembership,
  AuthSession
} from '../api';
export { api } from '../api';


export type View = 'landing' | 'services' | 'login' | 'app' | 'docs' | 'projects';
export type Tab = 'overview' | 'wallets' | 'policy' | 'keys' | 'calls' | 'audit' | 'approvals';
export type CallFilter = 'ALL' | 'SETTLED' | 'PENDING' | 'REJECTED';

export interface UserSession {
  email: string;
  role: string;
  orgName: string;
}

export type { 
  ProjectSummary, 
  Wallet, 
  APIKey, 
  CallRecord, 
  AuditMessage, 
  Approval, 
  ServiceTool, 
  PolicyResponse,
  OrgMember,
  UserOrgMembership,
  AuthSession 
};
