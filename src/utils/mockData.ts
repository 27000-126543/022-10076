import type { MeasurementPoint, ImportBatch, RetestTask } from '../types';
import { db } from '../db';
import { generateId } from '../utils';
import { INSPECTION_ITEMS } from '../constants/inspectionItems';

const BUILDINGS = [
  { id: 'bld-1', name: '1#楼' },
  { id: 'bld-2', name: '2#楼' },
  { id: 'bld-3', name: '3#楼' },
];

const FLOORS_PER_BUILDING = 10;
const ROOMS_PER_FLOOR = 4;
const ROOM_TYPES = ['A户型', 'B户型', 'C户型', 'D户型'];

const CHECKERS = ['质量员A', '质量员B', '质量员C', '张工', '李工'];

const generateMockPoints = (): MeasurementPoint[] => {
  const points: MeasurementPoint[] = [];
  const batchId = generateId();
  const now = new Date();

  BUILDINGS.forEach((building, buildingIdx) => {
    for (let floorNum = 1; floorNum <= FLOORS_PER_BUILDING; floorNum++) {
      const floorId = `${building.id}-flr-${floorNum}`;
      const floorName = `${floorNum}层`;

      for (let roomNum = 1; roomNum <= ROOMS_PER_FLOOR; roomNum++) {
        const roomId = `${floorId}-rm-${100 * floorNum + roomNum}`;
        const roomNumber = `${100 * floorNum + roomNum}`;

        INSPECTION_ITEMS.slice(0, 6).forEach((item, itemIdx) => {
          const pointIdx = (buildingIdx * FLOORS_PER_BUILDING * ROOMS_PER_FLOOR * 6) +
            (floorNum - 1) * ROOMS_PER_FLOOR * 6 +
            (roomNum - 1) * 6 +
            itemIdx;

          const measuredValue = item.designValue + (Math.random() - 0.5) * (item.allowablePositiveDeviation + item.allowableNegativeDeviation) * 1.5;
          const roundedValue = Math.round(measuredValue * 10) / 10;
          const deviation = roundedValue - item.designValue;
          const isAbnormal =
            deviation > item.allowablePositiveDeviation ||
            deviation < -item.allowableNegativeDeviation;

          const point: MeasurementPoint = {
            id: generateId(),
            buildingId: building.id,
            buildingName: building.name,
            floorId,
            floorName,
            roomId,
            roomNumber,
            inspectionItemId: item.id,
            inspectionItemName: item.name,
            pointNumber: `${buildingIdx + 1}#-${floorNum}F-${roomNumber}-${item.name}-${String(itemIdx + 1).padStart(3, '0')}`,
            location: `距地面${(itemIdx + 1) * 0.5}m处`,
            designValue: item.designValue,
            measuredValue: roundedValue,
            allowablePositiveDeviation: item.allowablePositiveDeviation,
            allowableNegativeDeviation: item.allowableNegativeDeviation,
            deviation: Math.round(deviation * 10) / 10,
            isAbnormal,
            isDuplicate: pointIdx % 50 === 0,
            hasPhoto: pointIdx % 7 !== 0,
            status: isAbnormal
              ? pointIdx % 3 === 0
                ? 'retest_required'
                : 'pending'
              : pointIdx % 4 === 0
              ? 'pending'
              : 'approved',
            checker: CHECKERS[pointIdx % CHECKERS.length],
            checkDate: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            remark: isAbnormal ? '偏差超出允许范围，需复核' : undefined,
            importBatchId: batchId,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };

          points.push(point);
        });
      }
    }
  });

  return points;
};

const generateMockBatch = (points: MeasurementPoint[]): ImportBatch => {
  const abnormalCount = points.filter((p) => p.isAbnormal).length;
  const missingPhotoCount = points.filter((p) => !p.hasPhoto).length;
  const duplicateCount = points.filter((p) => p.isDuplicate).length;

  return {
    id: points[0]?.importBatchId || generateId(),
    fileName: '示例导入数据.xlsx',
    fileSize: 1024 * 1024,
    totalCount: points.length,
    validCount: points.length,
    abnormalCount,
    missingPhotoCount,
    duplicateCount,
    importedAt: new Date().toISOString(),
    importedBy: '系统演示',
  };
};

const generateMockRetestTasks = (points: MeasurementPoint[]): RetestTask[] => {
  const retestPoints = points.filter(
    (p) => p.status === 'retest_required' && p.isAbnormal
  ).slice(0, 15);

  const now = new Date();
  return retestPoints.map((point, idx) => {
    const isCompleted = idx % 3 === 0;
    const isVerified = isCompleted && idx % 2 === 0;

    return {
      id: generateId(),
      pointId: point.id,
      pointNumber: point.pointNumber,
      reason: `实测偏差${point.deviation > 0 ? '+' : ''}${point.deviation}mm，超出允许范围`,
      status: isVerified
        ? 'verified'
        : isCompleted
        ? 'completed'
        : 'pending',
      assignee: CHECKERS[idx % CHECKERS.length],
      deadline: new Date(now.getTime() + (idx + 1) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      completedDate: isCompleted
        ? new Date(now.getTime() - idx * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
        : undefined,
      retestValue: isCompleted
        ? point.designValue + (Math.random() - 0.5) * (point.allowablePositiveDeviation + point.allowableNegativeDeviation) * 0.8
        : undefined,
      remark: idx % 2 === 0 ? '已通知施工班组整改' : undefined,
      createdAt: new Date(now.getTime() - idx * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: now.toISOString(),
    };
  });
};

export const loadMockData = async (): Promise<{
  points: MeasurementPoint[];
  batch: ImportBatch;
  tasks: RetestTask[];
}> => {
  const existingPoints = await db.measurementPoints.count();
  if (existingPoints > 0) {
    return { points: [], batch: {} as ImportBatch, tasks: [] };
  }

  const points = generateMockPoints();
  const batch = generateMockBatch(points);
  const tasks = generateMockRetestTasks(points);

  await db.transaction(
    'rw',
    db.measurementPoints,
    db.importBatches,
    db.retestTasks,
    async () => {
      await db.importBatches.put(batch);
      await db.measurementPoints.bulkPut(points);
      await db.retestTasks.bulkPut(tasks);
    }
  );

  return { points, batch, tasks };
};

export const hasExistingData = async (): Promise<boolean> => {
  const count = await db.measurementPoints.count();
  return count > 0;
};
