import Dexie, { Table } from 'dexie';
import type {
  MeasurementPoint,
  RetestTask,
  ImportBatch,
  InspectionItem,
  Building,
  Floor,
  Room,
} from '../types';
import { INSPECTION_ITEMS } from '../constants/inspectionItems';

export class AppDatabase extends Dexie {
  inspectionItems!: Table<InspectionItem>;
  buildings!: Table<Building>;
  floors!: Table<Floor>;
  rooms!: Table<Room>;
  measurementPoints!: Table<MeasurementPoint>;
  retestTasks!: Table<RetestTask>;
  importBatches!: Table<ImportBatch>;

  constructor() {
    super('QualityMeasurementDB');
    this.version(1).stores({
      inspectionItems: 'id, name, category',
      buildings: 'id, name, projectName',
      floors: 'id, buildingId, name, floorNumber',
      rooms: 'id, floorId, roomNumber',
      measurementPoints:
        'id, buildingId, floorId, roomId, inspectionItemId, pointNumber, status, isAbnormal, isDuplicate, hasPhoto, importBatchId, checkDate',
      retestTasks: 'id, pointId, status, assignee, deadline',
      importBatches: 'id, fileName, importedAt',
    });
  }

  async initializeDefaultData() {
    try {
      const count = await this.inspectionItems.count();
      if (count === 0) {
        await this.inspectionItems.bulkPut(INSPECTION_ITEMS);
      }
    } catch (error) {
      console.warn('初始化检查项数据时出现警告:', error);
    }
  }
}

export const db = new AppDatabase();

export const initializeDatabase = async () => {
  await db.initializeDefaultData();
};
