export interface DriveInfo {
  name: string
  mount: string
  total: number
  free: number
  used: number
  type: string
}

export interface FileEntry {
  path: string
  name: string
  size: number
  isDir: boolean
  modified: number
}

export interface ScanItem {
  id: string
  path: string
  name: string
  category: string
  size: number
  safe: boolean
  protected: boolean
  reason?: string
}

export interface CleanupResult {
  deleted: string[]
  failed: { path: string; reason: string }[]
  freed: number
}

export interface HistoryEntry {
  id: string
  timestamp: number
  action: string
  category: string
  freed: number
  items: number
  details: string
}

export interface DuplicateGroup {
  hash: string
  size: number
  files: string[]
}

export interface Settings {
  protectedDirs: string[]
  quarantineDir: string
  dryRun: boolean
  lowStorageThresholdGB: number
  largeFileThresholdMB: number
  maxScanDepth: number
  allowRecycleBin: boolean
  agentEnabled: boolean
  agentIntervalMinutes: number
  agentLowThresholdGB: number
  paystackPublicKey: string
  paystackPlanCode: string
  agentSubscriptionActive: boolean
  agentSubscriptionExpiresAt: number
  agentSubscriptionReference: string
}