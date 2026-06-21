import type {
  MeasurementPoint,
  RetestTask,
  ImportBatch,
  Building,
  Floor,
  Room,
  InspectionItem,
  TreeNode,
  ReportFilter,
  HouseholdReportData,
  FloorSummaryData,
  RectificationRecord,
} from '../types';
import { db } from '../db';
import { generateId } from '../utils';

export const dataService = {
  async getAllPoints(): Promise<MeasurementPoint[]> {
    return db.measurementPoints.orderBy('createdAt').reverse().toArray();
  },

  async getPointsByFilter(
    filter: ReportFilter & {
      status?: string;
      isAbnormal?: boolean;
      hasPhoto?: boolean;
      isDuplicate?: boolean;
    }
  ): Promise<MeasurementPoint[]> {
    let query = db.measurementPoints.toCollection();

    if (filter.buildingId) {
      query = query.filter((p) => p.buildingId === filter.buildingId);
    }
    if (filter.floorId) {
      query = query.filter((p) => p.floorId === filter.floorId);
    }
    if (filter.roomId) {
      query = query.filter((p) => p.roomId === filter.roomId);
    }
    if (filter.inspectionItemId) {
      query = query.filter((p) => p.inspectionItemId === filter.inspectionItemId);
    }
    if (filter.status && filter.status !== 'all') {
      query = query.filter((p) => p.status === filter.status);
    }
    if (filter.isAbnormal === true) {
      query = query.filter((p) => p.isAbnormal);
    }
    if (filter.hasPhoto === false) {
      query = query.filter((p) => !p.hasPhoto);
    }
    if (filter.isDuplicate === true) {
      query = query.filter((p) => p.isDuplicate);
    }
    if (filter.startDate) {
      query = query.filter((p) => p.checkDate >= filter.startDate!);
    }
    if (filter.endDate) {
      query = query.filter((p) => p.checkDate <= filter.endDate!);
    }

    return query.reverse().sortBy('createdAt');
  },

  async getPointById(id: string): Promise<MeasurementPoint | undefined> {
    return db.measurementPoints.get(id);
  },

  async addPoint(point: MeasurementPoint): Promise<string> {
    return db.measurementPoints.add(point) as Promise<string>;
  },

  async addPoints(points: MeasurementPoint[]): Promise<void> {
    await db.measurementPoints.bulkAdd(points);
  },

  async updatePoint(
    id: string,
    updates: Partial<MeasurementPoint>
  ): Promise<void> {
    if (updates.measuredValue !== undefined) {
      const point = await db.measurementPoints.get(id);
      if (point) {
        const deviation = Math.round((updates.measuredValue - point.designValue) * 100) / 100;
        const isAbnormal =
          deviation > point.allowablePositiveDeviation ||
          deviation < -point.allowableNegativeDeviation;
        updates = { ...updates, deviation, isAbnormal };
      }
    }
    await db.measurementPoints.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deletePoint(id: string): Promise<void> {
    await db.measurementPoints.delete(id);
  },

  async getTreeData(): Promise<TreeNode[]> {
    const points = await this.getAllPoints();

    const buildingMap = new Map<string, TreeNode>();
    const floorMap = new Map<string, TreeNode>();
    const roomMap = new Map<string, TreeNode>();
    const itemMap = new Map<string, TreeNode>();

    points.forEach((point) => {
      if (!buildingMap.has(point.buildingId)) {
        buildingMap.set(point.buildingId, {
          key: point.buildingId,
          title: point.buildingName,
          data: { type: 'building', count: 0 },
          children: [],
        });
      }

      const buildingNode = buildingMap.get(point.buildingId)!;
      buildingNode.data!.count = (buildingNode.data!.count || 0) + 1;

      const floorKey = `${point.buildingId}-${point.floorId}`;
      if (!floorMap.has(floorKey)) {
        floorMap.set(floorKey, {
          key: floorKey,
          title: point.floorName,
          data: { type: 'floor', count: 0 },
          children: [],
        });
        buildingNode.children!.push(floorMap.get(floorKey)!);
      }

      const floorNode = floorMap.get(floorKey)!;
      floorNode.data!.count = (floorNode.data!.count || 0) + 1;

      const roomKey = `${floorKey}-${point.roomId}`;
      if (!roomMap.has(roomKey)) {
        roomMap.set(roomKey, {
          key: roomKey,
          title: `${point.roomNumber}室`,
          data: { type: 'room', count: 0 },
          children: [],
        });
        floorNode.children!.push(roomMap.get(roomKey)!);
      }

      const roomNode = roomMap.get(roomKey)!;
      roomNode.data!.count = (roomNode.data!.count || 0) + 1;

      const itemKey = `${roomKey}-${point.inspectionItemId}`;
      if (!itemMap.has(itemKey)) {
        itemMap.set(itemKey, {
          key: itemKey,
          title: point.inspectionItemName,
          data: { type: 'item', count: 0 },
        });
        roomNode.children!.push(itemMap.get(itemKey)!);
      }

      const itemNode = itemMap.get(itemKey)!;
      itemNode.data!.count = (itemNode.data!.count || 0) + 1;
    });

    return Array.from(buildingMap.values());
  },

  async getInspectionItems(): Promise<InspectionItem[]> {
    return db.inspectionItems.toArray();
  },

  async addInspectionItem(item: InspectionItem): Promise<string> {
    return db.inspectionItems.add(item) as Promise<string>;
  },

  async getStatistics() {
    const points = await this.getAllPoints();
    const retestTasks = await retestService.getAllTasks();

    const total = points.length;
    const abnormal = points.filter((p) => p.isAbnormal).length;
    const missingPhoto = points.filter((p) => !p.hasPhoto).length;
    const duplicate = points.filter((p) => p.isDuplicate).length;
    const pending = points.filter((p) => p.status === 'pending').length;
    const approved = points.filter((p) => p.status === 'approved').length;
    const retestRequired = points.filter(
      (p) => p.status === 'retest_required'
    ).length;
    const pendingRetest = retestTasks.filter((t) => t.status === 'pending').length;

    return {
      total,
      abnormal,
      missingPhoto,
      duplicate,
      pending,
      approved,
      retestRequired,
      pendingRetest,
      passRate: total > 0 ? ((approved / total) * 100).toFixed(2) : '0.00',
    };
  },
};

export const retestService = {
  async getAllTasks(): Promise<RetestTask[]> {
    return db.retestTasks.orderBy('createdAt').reverse().toArray();
  },

  async getTasksByStatus(
    status: 'pending' | 'completed' | 'verified'
  ): Promise<RetestTask[]> {
    return db.retestTasks.where('status').equals(status).toArray();
  },

  async getTaskByPointId(pointId: string): Promise<RetestTask | undefined> {
    return db.retestTasks.where('pointId').equals(pointId).first();
  },

  async createTask(
    point: MeasurementPoint,
    reason: string,
    assignee: string,
    deadline: string
  ): Promise<string> {
    const task: RetestTask = {
      id: generateId(),
      pointId: point.id,
      pointNumber: point.pointNumber,
      reason,
      status: 'pending',
      assignee,
      deadline,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dataService.updatePoint(point.id, {
      status: 'retest_required',
    });

    return db.retestTasks.add(task) as Promise<string>;
  },

  async updateTask(
    id: string,
    updates: Partial<RetestTask>
  ): Promise<void> {
    await db.retestTasks.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async completeTask(
    id: string,
    retestValue: number,
    retestPhotoData?: string
  ): Promise<void> {
    const task = await db.retestTasks.get(id);
    if (!task) return;

    const point = await dataService.getPointById(task.pointId);
    if (!point) return;

    const deviation = retestValue - point.designValue;
    const isAbnormal =
      deviation > point.allowablePositiveDeviation ||
      deviation < -point.allowableNegativeDeviation;

    await db.transaction('rw', db.retestTasks, db.measurementPoints, async () => {
      await db.retestTasks.update(id, {
        status: 'completed',
        retestValue,
        retestPhotoData,
        completedDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString(),
      });

      await db.measurementPoints.update(task.pointId, {
        measuredValue: retestValue,
        deviation,
        isAbnormal,
        hasPhoto: retestPhotoData ? true : point.hasPhoto,
        photoData: retestPhotoData || point.photoData,
        status: isAbnormal ? 'retest_required' : 'pending',
        updatedAt: new Date().toISOString(),
      });
    });
  },

  async verifyTask(id: string, verified: boolean): Promise<void> {
    const task = await db.retestTasks.get(id);
    if (!task) return;

    await db.transaction('rw', db.retestTasks, db.measurementPoints, async () => {
      await db.retestTasks.update(id, {
        status: verified ? 'verified' : 'pending',
        updatedAt: new Date().toISOString(),
      });

      if (verified) {
        await db.measurementPoints.update(task.pointId, {
          status: 'approved',
          updatedAt: new Date().toISOString(),
        });
      }
    });
  },

  async deleteTask(id: string): Promise<void> {
    const task = await db.retestTasks.get(id);
    if (task) {
      await db.transaction('rw', db.retestTasks, db.measurementPoints, async () => {
        await db.retestTasks.delete(id);
        await db.measurementPoints.update(task.pointId, {
          status: 'pending',
          updatedAt: new Date().toISOString(),
        });
      });
    }
  },
};

export const importService = {
  async createBatch(
    fileName: string,
    fileSize: number,
    totalCount: number,
    points: MeasurementPoint[],
    importedBy: string = '系统'
  ): Promise<string> {
    const abnormalCount = points.filter((p) => p.isAbnormal).length;
    const missingPhotoCount = points.filter((p) => !p.hasPhoto).length;
    const duplicateCount = points.filter((p) => p.isDuplicate).length;
    const validCount = points.length;

    const batch: ImportBatch = {
      id: generateId(),
      fileName,
      fileSize,
      totalCount,
      validCount,
      abnormalCount,
      missingPhotoCount,
      duplicateCount,
      importedAt: new Date().toISOString(),
      importedBy,
    };

    return db.importBatches.add(batch) as Promise<string>;
  },

  async getBatches(): Promise<ImportBatch[]> {
    return db.importBatches.orderBy('importedAt').reverse().toArray();
  },

  async getBatchById(id: string): Promise<ImportBatch | undefined> {
    return db.importBatches.get(id);
  },

  async getPointsByBatchId(batchId: string): Promise<MeasurementPoint[]> {
    return db.measurementPoints.where('importBatchId').equals(batchId).toArray();
  },

  async deleteBatch(id: string): Promise<void> {
    await db.transaction(
      'rw',
      db.importBatches,
      db.measurementPoints,
      async () => {
        await db.measurementPoints.where('importBatchId').equals(id).delete();
        await db.importBatches.delete(id);
      }
    );
  },
};

export const reportService = {
  async generateHouseholdReport(
    filter: ReportFilter
  ): Promise<HouseholdReportData[]> {
    const points = await dataService.getPointsByFilter(filter);

    return points
      .filter((p) => p.status === 'approved')
      .map((p) => ({
        buildingName: p.buildingName,
        floorName: p.floorName,
        roomNumber: p.roomNumber,
        inspectionItemName: p.inspectionItemName,
        pointNumber: p.pointNumber,
        designValue: p.designValue,
        measuredValue: p.measuredValue,
        allowablePositiveDeviation: p.allowablePositiveDeviation,
        allowableNegativeDeviation: p.allowableNegativeDeviation,
        deviation: p.deviation,
        isAbnormal: p.isAbnormal,
        checker: p.checker,
        checkDate: p.checkDate,
      }));
  },

  async generateFloorSummary(
    filter: ReportFilter
  ): Promise<FloorSummaryData[]> {
    const points = await dataService.getPointsByFilter(filter);
    const approvedPoints = points.filter((p) => p.status === 'approved');

    const groupMap = new Map<string, MeasurementPoint[]>();

    approvedPoints.forEach((p) => {
      const key = `${p.buildingId}-${p.floorId}-${p.inspectionItemId}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(p);
    });

    const summary: FloorSummaryData[] = [];

    groupMap.forEach((groupPoints, key) => {
      const firstPoint = groupPoints[0];
      const deviations = groupPoints.map((p) => p.deviation);
      const qualifiedPoints = groupPoints.filter((p) => !p.isAbnormal).length;

      summary.push({
        buildingName: firstPoint.buildingName,
        floorName: firstPoint.floorName,
        inspectionItemName: firstPoint.inspectionItemName,
        totalPoints: groupPoints.length,
        qualifiedPoints,
        passRate: (qualifiedPoints / groupPoints.length) * 100,
        maxDeviation: Math.max(...deviations),
        minDeviation: Math.min(...deviations),
        avgDeviation:
          deviations.reduce((a, b) => a + b, 0) / deviations.length,
      });
    });

    return summary.sort(
      (a, b) =>
        a.buildingName.localeCompare(b.buildingName) ||
        a.floorName.localeCompare(b.floorName) ||
        a.inspectionItemName.localeCompare(b.inspectionItemName)
    );
  },

  async generateRectificationLedger(
    filter: ReportFilter
  ): Promise<RectificationRecord[]> {
    const points = await dataService.getPointsByFilter(filter);
    const abnormalPoints = points.filter((p) => p.isAbnormal);
    const retestTasks = await retestService.getAllTasks();
    const taskMap = new Map(retestTasks.map((t) => [t.pointId, t]));

    const records: RectificationRecord[] = [];

    abnormalPoints.forEach((p) => {
      const task = taskMap.get(p.id);
      const problem =
        p.deviation > 0
          ? `${p.inspectionItemName}偏大，超出允许偏差`
          : `${p.inspectionItemName}偏小，超出允许偏差`;
      const allowableDeviation = `+${p.allowablePositiveDeviation}/-${p.allowableNegativeDeviation} ${
        p.inspectionItemName.includes('空鼓') ? '%' : 'mm'
      }`;

      records.push({
        pointNumber: p.pointNumber,
        buildingName: p.buildingName,
        floorName: p.floorName,
        roomNumber: p.roomNumber,
        inspectionItemName: p.inspectionItemName,
        problem,
        deviation: p.deviation,
        allowableDeviation,
        rectificationRequirement: `重新测量并确保偏差在允许范围内，偏差值不得超过${allowableDeviation}`,
        assignee: task?.assignee || '未分配',
        deadline: task?.deadline || '未设置',
        status: task
          ? task.status === 'pending'
            ? '待整改'
            : task.status === 'completed'
            ? '已整改待复核'
            : '已完成'
          : p.status === 'retest_required'
          ? '待补测'
          : '待处理',
        remark: task?.remark || p.remark || '',
      });
    });

    return records.sort((a, b) => {
      const priority = { 待处理: 0, 待补测: 1, 待整改: 2, 已整改待复核: 3, 已完成: 4 };
      return (priority[a.status as keyof typeof priority] || 0) - (priority[b.status as keyof typeof priority] || 0);
    });
  },
};

export const buildingService = {
  async getAll(): Promise<Building[]> {
    return db.buildings.orderBy('name').toArray();
  },

  async add(building: Omit<Building, 'id' | 'createdAt'>): Promise<string> {
    const id = generateId();
    return db.buildings.add({
      ...building,
      id,
      createdAt: new Date().toISOString(),
    }) as Promise<string>;
  },
};

export const floorService = {
  async getByBuildingId(buildingId: string): Promise<Floor[]> {
    return db.floors.where('buildingId').equals(buildingId).toArray();
  },

  async add(floor: Omit<Floor, 'id' | 'createdAt'>): Promise<string> {
    const id = generateId();
    return db.floors.add({
      ...floor,
      id,
      createdAt: new Date().toISOString(),
    }) as Promise<string>;
  },
};

export const roomService = {
  async getByFloorId(floorId: string): Promise<Room[]> {
    return db.rooms.where('floorId').equals(floorId).toArray();
  },

  async add(room: Omit<Room, 'id' | 'createdAt'>): Promise<string> {
    const id = generateId();
    return db.rooms.add({
      ...room,
      id,
      createdAt: new Date().toISOString(),
    }) as Promise<string>;
  },
};
