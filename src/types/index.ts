export interface InspectionItem {
  id: string;
  name: string;
  category: string;
  designValue: number;
  allowablePositiveDeviation: number;
  allowableNegativeDeviation: number;
  unit: string;
  standardCode: string;
  requirePhoto: boolean;
}

export interface MeasurementPoint {
  id: string;
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorName: string;
  roomId: string;
  roomNumber: string;
  inspectionItemId: string;
  inspectionItemName: string;
  pointNumber: string;
  location: string;
  designValue: number;
  measuredValue: number;
  allowablePositiveDeviation: number;
  allowableNegativeDeviation: number;
  deviation: number;
  isAbnormal: boolean;
  isDuplicate: boolean;
  hasPhoto: boolean;
  photoPath?: string;
  photoData?: string;
  status: 'pending' | 'approved' | 'retest_required';
  checker: string;
  checkDate: string;
  remark?: string;
  importBatchId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetestTask {
  id: string;
  pointId: string;
  pointNumber: string;
  reason: string;
  status: 'pending' | 'completed' | 'verified';
  assignee: string;
  deadline: string;
  completedDate?: string;
  retestValue?: number;
  retestPhotoPath?: string;
  retestPhotoData?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  fileSize: number;
  totalCount: number;
  validCount: number;
  abnormalCount: number;
  missingPhotoCount: number;
  duplicateCount: number;
  importedAt: string;
  importedBy: string;
}

export interface Building {
  id: string;
  name: string;
  projectName: string;
  totalFloors: number;
  createdAt: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  name: string;
  floorNumber: number;
  createdAt: string;
}

export interface Room {
  id: string;
  floorId: string;
  roomNumber: string;
  roomType: string;
  createdAt: string;
}

export interface TreeNode {
  key: string;
  title: string;
  children?: TreeNode[];
  data?: {
    type: 'building' | 'floor' | 'room' | 'item';
    count?: number;
  };
}

export type PointStatusFilter = 'all' | 'pending' | 'approved' | 'retest_required';
export type AbnormalFilter = 'all' | 'abnormal' | 'missing_photo' | 'duplicate' | 'normal';

export interface ReportFilter {
  buildingId?: string;
  floorId?: string;
  roomId?: string;
  inspectionItemId?: string;
  startDate?: string;
  endDate?: string;
}

export type ReportType = 'household' | 'floor_summary' | 'rectification';

export interface HouseholdReportData {
  buildingName: string;
  floorName: string;
  roomNumber: string;
  inspectionItemName: string;
  pointNumber: string;
  designValue: number;
  measuredValue: number;
  allowablePositiveDeviation: number;
  allowableNegativeDeviation: number;
  deviation: number;
  isAbnormal: boolean;
  checker: string;
  checkDate: string;
}

export interface FloorSummaryData {
  buildingName: string;
  floorName: string;
  inspectionItemName: string;
  totalPoints: number;
  qualifiedPoints: number;
  passRate: number;
  maxDeviation: number;
  minDeviation: number;
  avgDeviation: number;
}

export interface RectificationRecord {
  pointNumber: string;
  buildingName: string;
  floorName: string;
  roomNumber: string;
  inspectionItemName: string;
  problem: string;
  deviation: number;
  allowableDeviation: string;
  rectificationRequirement: string;
  assignee: string;
  deadline: string;
  status: string;
  remark: string;
}

export interface RawImportRow {
  [key: string]: string | number | undefined;
  楼栋?: string;
  楼层?: string;
  房间号?: string;
  检查项?: string;
  测点编号?: string;
  设计值?: number | string;
  实测值?: number | string;
  允许正偏差?: number | string;
  允许负偏差?: number | string;
  位置?: string;
  检查人?: string;
  检查日期?: string;
  照片?: string;
  备注?: string;
}

export interface ColumnMapping {
  [key: string]: string;
}
