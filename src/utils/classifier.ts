import type {
  RawImportRow,
  MeasurementPoint,
  InspectionItem,
  ColumnMapping,
} from '../types';
import {
  generateId,
  parseNumber,
  parseBuildingName,
  parseFloorName,
  parseFloorNumber,
  parseRoomNumber,
  calculateDeviation,
  isOutlier,
  formatDate,
} from './index';
import { DEFAULT_INSPECTION_ITEM_MAP } from '../constants/inspectionItems';

export const STANDARD_COLUMNS = [
  '楼栋',
  '楼层',
  '房间号',
  '检查项',
  '测点编号',
  '设计值',
  '实测值',
  '允许正偏差',
  '允许负偏差',
  '位置',
  '检查人',
  '检查日期',
  '照片',
  '备注',
];

export const COLUMN_ALIASES: Record<string, string[]> = {
  楼栋: ['楼栋', '楼号', '幢号', '栋号', 'building'],
  楼层: ['楼层', '层号', 'floor'],
  房间号: ['房间号', '房号', '房间', 'room'],
  检查项: ['检查项', '检测项', '检查内容', '检测内容', 'item'],
  测点编号: ['测点编号', '测点号', '编号', 'point'],
  设计值: ['设计值', '标准值', 'design'],
  实测值: ['实测值', '测量值', '实际值', 'measure'],
  允许正偏差: ['允许正偏差', '正偏差', '上偏差'],
  允许负偏差: ['允许负偏差', '负偏差', '下偏差'],
  位置: ['位置', '部位', 'location'],
  检查人: ['检查人', '测量人', '检测人', 'checker'],
  检查日期: ['检查日期', '测量日期', '检测日期', 'date'],
  照片: ['照片', '图片', 'photo', 'image'],
  备注: ['备注', '说明', 'remark'],
};

export const autoDetectColumnMapping = (
  headers: string[]
): ColumnMapping => {
  const mapping: ColumnMapping = {};

  headers.forEach((header) => {
    const normalizedHeader = header.trim().toLowerCase();

    for (const [standardColumn, aliases] of Object.entries(COLUMN_ALIASES)) {
      const matched = aliases.some(
        (alias) =>
          normalizedHeader.includes(alias.toLowerCase()) ||
          alias.toLowerCase().includes(normalizedHeader)
      );
      if (matched && !mapping[standardColumn]) {
        mapping[standardColumn] = header;
        break;
      }
    }

    if (!Object.values(mapping).includes(header)) {
      mapping[header] = header;
    }
  });

  return mapping;
};

export const matchInspectionItem = (
  itemName: string | undefined
): InspectionItem | null => {
  if (!itemName) return null;

  const normalizedName = itemName.trim();

  if (DEFAULT_INSPECTION_ITEM_MAP[normalizedName]) {
    return DEFAULT_INSPECTION_ITEM_MAP[normalizedName];
  }

  for (const item of Object.values(DEFAULT_INSPECTION_ITEM_MAP)) {
    if (
      item.name.includes(normalizedName) ||
      normalizedName.includes(item.name)
    ) {
      return item;
    }
  }

  return null;
};

export const generatePointNumber = (
  building: string,
  floor: string,
  room: string,
  item: string,
  index: number
): string => {
  const buildingShort = building.replace(/[^0-9]/g, '') || '0';
  const floorShort = floor.replace(/[^0-9-]/g, '') || '0';
  const roomShort = room.replace(/[^0-9]/g, '') || '000';
  const indexStr = String(index + 1).padStart(3, '0');
  return `${buildingShort}#-${floorShort}F-${roomShort}-${item}-${indexStr}`;
};

export const processRawRow = (
  row: RawImportRow,
  mapping: ColumnMapping,
  index: number,
  importBatchId: string,
  pointCounter: Record<string, number>
): MeasurementPoint | null => {
  const buildingRaw = row[mapping['楼栋'] || '楼栋'] as string;
  const floorRaw = row[mapping['楼层'] || '楼层'] as string;
  const roomRaw = row[mapping['房间号'] || '房间号'] as string;
  const itemRaw = row[mapping['检查项'] || '检查项'] as string;
  const pointNumberRaw = row[mapping['测点编号'] || '测点编号'] as string;
  const designValueRaw = row[mapping['设计值'] || '设计值'];
  const measuredValueRaw = row[mapping['实测值'] || '实测值'];
  const allowPosRaw = row[mapping['允许正偏差'] || '允许正偏差'];
  const allowNegRaw = row[mapping['允许负偏差'] || '允许负偏差'];
  const locationRaw = row[mapping['位置'] || '位置'] as string;
  const checkerRaw = row[mapping['检查人'] || '检查人'] as string;
  const checkDateRaw = row[mapping['检查日期'] || '检查日期'] as string;
  const photoRaw = row[mapping['照片'] || '照片'] as string;
  const remarkRaw = row[mapping['备注'] || '备注'] as string;

  const buildingName = parseBuildingName(buildingRaw);
  const floorName = parseFloorName(floorRaw);
  const roomNumber = parseRoomNumber(roomRaw);
  const inspectionItem = matchInspectionItem(itemRaw);

  if (!inspectionItem && !itemRaw) {
    return null;
  }

  const itemName = inspectionItem?.name || itemRaw || '未识别检查项';
  const designValue = parseNumber(designValueRaw) || inspectionItem?.designValue || 0;
  const measuredValue = parseNumber(measuredValueRaw);
  const allowPositiveDeviation = parseNumber(allowPosRaw) || inspectionItem?.allowablePositiveDeviation || 0;
  const allowNegativeDeviation = parseNumber(allowNegRaw) || inspectionItem?.allowableNegativeDeviation || 0;
  const deviation = calculateDeviation(measuredValue, designValue);
  const isAbnormal = isOutlier(measuredValue, designValue, allowPositiveDeviation, allowNegativeDeviation);

  const counterKey = `${buildingName}-${floorName}-${roomNumber}-${itemName}`;
  pointCounter[counterKey] = (pointCounter[counterKey] || 0) + 1;

  const pointNumber = pointNumberRaw || generatePointNumber(
    buildingName,
    floorName,
    roomNumber,
    itemName,
    pointCounter[counterKey] - 1
  );

  const buildingId = `bld-${buildingName.replace(/[^a-zA-Z0-9]/g, '')}`;
  const floorId = `${buildingId}-flr-${parseFloorNumber(floorRaw)}`;
  const roomId = `${floorId}-rm-${roomNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
  const inspectionItemId = inspectionItem?.id || `item-custom-${itemName}`;

  const hasPhoto = !!photoRaw;

  const point: MeasurementPoint = {
    id: generateId(),
    buildingId,
    buildingName,
    floorId,
    floorName,
    roomId,
    roomNumber,
    inspectionItemId,
    inspectionItemName: itemName,
    pointNumber,
    location: locationRaw || '',
    designValue,
    measuredValue,
    allowablePositiveDeviation: allowPositiveDeviation,
    allowableNegativeDeviation: allowNegativeDeviation,
    deviation,
    isAbnormal,
    isDuplicate: false,
    hasPhoto,
    photoPath: photoRaw,
    status: 'pending',
    checker: checkerRaw || '未填写',
    checkDate: checkDateRaw ? formatDate(checkDateRaw) : formatDate(new Date()),
    remark: remarkRaw,
    importBatchId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return point;
};

export const markDuplicates = (points: MeasurementPoint[]): MeasurementPoint[] => {
  const pointNumberMap = new Map<string, number>();

  points.forEach((point) => {
    const count = pointNumberMap.get(point.pointNumber) || 0;
    pointNumberMap.set(point.pointNumber, count + 1);
  });

  const seenPoints = new Set<string>();
  return points.map((point) => {
    const count = pointNumberMap.get(point.pointNumber) || 1;
    if (count > 1) {
      if (seenPoints.has(point.pointNumber)) {
        return { ...point, isDuplicate: true };
      }
      seenPoints.add(point.pointNumber);
    }
    return point;
  });
};

export const fuzzyMatchItem = (
  input: string,
  items: InspectionItem[]
): InspectionItem | null => {
  const normalizedInput = input.toLowerCase().trim();

  for (const item of items) {
    if (item.name.toLowerCase() === normalizedInput) {
      return item;
    }
  }

  for (const item of items) {
    if (item.name.toLowerCase().includes(normalizedInput)) {
      return item;
    }
  }

  for (const item of items) {
    if (normalizedInput.includes(item.name.toLowerCase())) {
      return item;
    }
  }

  return null;
};
