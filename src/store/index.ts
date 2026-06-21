import { create } from 'zustand';
import type {
  MeasurementPoint,
  RetestTask,
  ImportBatch,
  ReportFilter,
  TreeNode,
  PointStatusFilter,
  AbnormalFilter,
  HouseholdReportData,
  FloorSummaryData,
  RectificationRecord,
  RawImportRow,
  ColumnMapping,
} from '../types';
import {
  dataService,
  retestService,
  importService,
  reportService,
} from '../services';
import { processRawRow, markDuplicates } from '../utils/classifier';
import { generateId } from '../utils';

interface DataState {
  points: MeasurementPoint[];
  treeData: TreeNode[];
  retestTasks: RetestTask[];
  importBatches: ImportBatch[];
  statistics: {
    total: number;
    abnormal: number;
    missingPhoto: number;
    duplicate: number;
    pending: number;
    approved: number;
    retestRequired: number;
    pendingRetest: number;
    passRate: string;
  };
  loading: boolean;
  error: string | null;
  fetchAllData: () => Promise<void>;
  fetchTreeData: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  fetchRetestTasks: () => Promise<void>;
  fetchImportBatches: () => Promise<void>;
  updatePoint: (id: string, updates: Partial<MeasurementPoint>) => Promise<void>;
  deletePoint: (id: string) => Promise<void>;
  approvePoint: (id: string) => Promise<void>;
  createRetestTask: (
    point: MeasurementPoint,
    reason: string,
    assignee: string,
    deadline: string
  ) => Promise<void>;
  completeRetestTask: (
    id: string,
    retestValue: number,
    retestPhotoData?: string
  ) => Promise<void>;
  verifyRetestTask: (id: string, verified: boolean) => Promise<void>;
  deleteRetestTask: (id: string) => Promise<void>;
  deleteImportBatch: (id: string) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  points: [],
  treeData: [],
  retestTasks: [],
  importBatches: [],
  statistics: {
    total: 0,
    abnormal: 0,
    missingPhoto: 0,
    duplicate: 0,
    pending: 0,
    approved: 0,
    retestRequired: 0,
    pendingRetest: 0,
    passRate: '0.00',
  },
  loading: false,
  error: null,

  fetchAllData: async () => {
    set({ loading: true, error: null });
    try {
      const [points, treeData, retestTasks, importBatches, statistics] =
        await Promise.all([
          dataService.getAllPoints(),
          dataService.getTreeData(),
          retestService.getAllTasks(),
          importService.getBatches(),
          dataService.getStatistics(),
        ]);
      set({ points, treeData, retestTasks, importBatches, statistics });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchTreeData: async () => {
    try {
      const treeData = await dataService.getTreeData();
      set({ treeData });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchStatistics: async () => {
    try {
      const statistics = await dataService.getStatistics();
      set({ statistics });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchRetestTasks: async () => {
    try {
      const retestTasks = await retestService.getAllTasks();
      set({ retestTasks });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchImportBatches: async () => {
    try {
      const importBatches = await importService.getBatches();
      set({ importBatches });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  updatePoint: async (id: string, updates: Partial<MeasurementPoint>) => {
    await dataService.updatePoint(id, updates);
    await get().fetchAllData();
  },

  deletePoint: async (id: string) => {
    await dataService.deletePoint(id);
    await get().fetchAllData();
  },

  approvePoint: async (id: string) => {
    await dataService.updatePoint(id, { status: 'approved' });
    await get().fetchAllData();
  },

  createRetestTask: async (
    point: MeasurementPoint,
    reason: string,
    assignee: string,
    deadline: string
  ) => {
    await retestService.createTask(point, reason, assignee, deadline);
    await get().fetchAllData();
  },

  completeRetestTask: async (
    id: string,
    retestValue: number,
    retestPhotoData?: string
  ) => {
    await retestService.completeTask(id, retestValue, retestPhotoData);
    await get().fetchAllData();
  },

  verifyRetestTask: async (id: string, verified: boolean) => {
    await retestService.verifyTask(id, verified);
    await get().fetchAllData();
  },

  deleteRetestTask: async (id: string) => {
    await retestService.deleteTask(id);
    await get().fetchAllData();
  },

  deleteImportBatch: async (id: string) => {
    await importService.deleteBatch(id);
    await get().fetchAllData();
  },
}));

interface ImportState {
  isImporting: boolean;
  importProgress: number;
  previewData: RawImportRow[];
  headers: string[];
  columnMapping: ColumnMapping;
  processedPoints: MeasurementPoint[];
  importResult: {
    success: boolean;
    message: string;
    totalCount: number;
    validCount: number;
    abnormalCount: number;
    missingPhotoCount: number;
    duplicateCount: number;
  } | null;
  setPreviewData: (headers: string[], rows: RawImportRow[]) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  processData: () => void;
  importData: (fileName: string, fileSize: number) => Promise<void>;
  resetImport: () => void;
}

export const useImportStore = create<ImportState>((set, get) => ({
  isImporting: false,
  importProgress: 0,
  previewData: [],
  headers: [],
  columnMapping: {},
  processedPoints: [],
  importResult: null,

  setPreviewData: (headers: string[], rows: RawImportRow[]) => {
    set({
      headers,
      previewData: rows,
    });
  },

  setColumnMapping: (mapping: ColumnMapping) => {
    set({ columnMapping: mapping });
  },

  processData: () => {
    const { previewData, columnMapping } = get();
    const batchId = generateId();
    const pointCounter: Record<string, number> = {};

    let points = previewData
      .map((row, index) =>
        processRawRow(row, columnMapping, index, batchId, pointCounter)
      )
      .filter((p): p is MeasurementPoint => p !== null);

    points = markDuplicates(points);

    set({ processedPoints: points });
  },

  importData: async (fileName: string, fileSize: number) => {
    set({ isImporting: true, importProgress: 0 });
    try {
      const { processedPoints } = get();
      const totalCount = processedPoints.length;

      set({ importProgress: 30 });

      const batchId = await importService.createBatch(
        fileName,
        fileSize,
        totalCount,
        processedPoints
      );

      set({ importProgress: 60 });

      const pointsWithBatchId = processedPoints.map((p) => ({
        ...p,
        importBatchId: batchId,
      }));

      await dataService.addPoints(pointsWithBatchId);

      set({ importProgress: 100 });

      const abnormalCount = processedPoints.filter((p) => p.isAbnormal).length;
      const missingPhotoCount = processedPoints.filter((p) => !p.hasPhoto).length;
      const duplicateCount = processedPoints.filter((p) => p.isDuplicate).length;

      set({
        importResult: {
          success: true,
          message: '导入成功！',
          totalCount,
          validCount: totalCount,
          abnormalCount,
          missingPhotoCount,
          duplicateCount,
        },
      });
    } catch (error) {
      set({
        importResult: {
          success: false,
          message: (error as Error).message,
          totalCount: 0,
          validCount: 0,
          abnormalCount: 0,
          missingPhotoCount: 0,
          duplicateCount: 0,
        },
      });
    } finally {
      set({ isImporting: false });
    }
  },

  resetImport: () => {
    set({
      isImporting: false,
      importProgress: 0,
      previewData: [],
      headers: [],
      columnMapping: {},
      processedPoints: [],
      importResult: null,
    });
  },
}));

interface ReportState {
  householdReport: HouseholdReportData[];
  floorSummary: FloorSummaryData[];
  rectificationLedger: RectificationRecord[];
  generating: boolean;
  filter: ReportFilter;
  setFilter: (filter: Partial<ReportFilter>) => void;
  generateHouseholdReport: () => Promise<void>;
  generateFloorSummary: () => Promise<void>;
  generateRectificationLedger: () => Promise<void>;
}

export const useReportStore = create<ReportState>((set, get) => ({
  householdReport: [],
  floorSummary: [],
  rectificationLedger: [],
  generating: false,
  filter: {},

  setFilter: (filter: Partial<ReportFilter>) => {
    set((state) => ({
      filter: { ...state.filter, ...filter },
    }));
  },

  generateHouseholdReport: async () => {
    set({ generating: true });
    try {
      const data = await reportService.generateHouseholdReport(get().filter);
      set({ householdReport: data });
    } catch (error) {
      console.error('生成分户实测表失败:', error);
    } finally {
      set({ generating: false });
    }
  },

  generateFloorSummary: async () => {
    set({ generating: true });
    try {
      const data = await reportService.generateFloorSummary(get().filter);
      set({ floorSummary: data });
    } catch (error) {
      console.error('生成楼层汇总表失败:', error);
    } finally {
      set({ generating: false });
    }
  },

  generateRectificationLedger: async () => {
    set({ generating: true });
    try {
      const data = await reportService.generateRectificationLedger(get().filter);
      set({ rectificationLedger: data });
    } catch (error) {
      console.error('生成质量整改台账失败:', error);
    } finally {
      set({ generating: false });
    }
  },
}));

interface FilterState {
  selectedKeys: string[];
  statusFilter: PointStatusFilter;
  abnormalFilter: AbnormalFilter;
  searchText: string;
  setSelectedKeys: (keys: string[]) => void;
  setStatusFilter: (filter: PointStatusFilter) => void;
  setAbnormalFilter: (filter: AbnormalFilter) => void;
  setSearchText: (text: string) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  selectedKeys: [],
  statusFilter: 'all',
  abnormalFilter: 'all',
  searchText: '',

  setSelectedKeys: (keys: string[]) => set({ selectedKeys: keys }),
  setStatusFilter: (filter: PointStatusFilter) => set({ statusFilter: filter }),
  setAbnormalFilter: (filter: AbnormalFilter) => set({ abnormalFilter: filter }),
  setSearchText: (text: string) => set({ searchText: text }),
  resetFilters: () =>
    set({
      selectedKeys: [],
      statusFilter: 'all',
      abnormalFilter: 'all',
      searchText: '',
    }),
}));
