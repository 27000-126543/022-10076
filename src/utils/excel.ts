import * as XLSX from 'xlsx';
import type {
  RawImportRow,
  MeasurementPoint,
  HouseholdReportData,
  FloorSummaryData,
  RectificationRecord,
} from '../types';

export const parseExcelFile = async (file: File): Promise<{
  headers: string[];
  rows: RawImportRow[];
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false,
        }) as RawImportRow[];

        const headers = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        })[0] as string[];

        resolve({
          headers: headers.filter((h) => h && h.toString().trim()),
          rows: jsonData,
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};

export const parseCsvFile = async (file: File): Promise<{
  headers: string[];
  rows: RawImportRow[];
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter((line) => line.trim());

        if (lines.length === 0) {
          resolve({ headers: [], rows: [] });
          return;
        }

        const headers = parseCsvLine(lines[0]);
        const rows: RawImportRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCsvLine(lines[i]);
          const row: RawImportRow = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          rows.push(row);
        }

        resolve({ headers, rows });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

export const exportToExcel = <T extends Record<string, unknown>>(
  data: T[],
  sheetName: string,
  fileName: string
): void => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportHouseholdReport = (
  data: HouseholdReportData[],
  fileName: string
): void => {
  const exportData = data.map((item) => ({
    '楼栋': item.buildingName,
    '楼层': item.floorName,
    '房间号': item.roomNumber,
    '检查项': item.inspectionItemName,
    '测点编号': item.pointNumber,
    '设计值(mm)': item.designValue,
    '实测值(mm)': item.measuredValue,
    '允许正偏差(mm)': item.allowablePositiveDeviation,
    '允许负偏差(mm)': item.allowableNegativeDeviation,
    '偏差值(mm)': item.deviation,
    '是否合格': item.isAbnormal ? '不合格' : '合格',
    '检查人': item.checker,
    '检查日期': item.checkDate,
  }));
  exportToExcel(exportData, '分户实测表', fileName);
};

export const exportFloorSummary = (
  data: FloorSummaryData[],
  fileName: string
): void => {
  const exportData = data.map((item) => ({
    '楼栋': item.buildingName,
    '楼层': item.floorName,
    '检查项': item.inspectionItemName,
    '实测点数': item.totalPoints,
    '合格点数': item.qualifiedPoints,
    '合格率(%)': item.passRate.toFixed(2),
    '最大偏差(mm)': item.maxDeviation,
    '最小偏差(mm)': item.minDeviation,
    '平均偏差(mm)': item.avgDeviation.toFixed(2),
  }));
  exportToExcel(exportData, '楼层汇总表', fileName);
};

export const exportRectificationLedger = (
  data: RectificationRecord[],
  fileName: string
): void => {
  const exportData = data.map((item) => ({
    '测点编号': item.pointNumber,
    '楼栋': item.buildingName,
    '楼层': item.floorName,
    '房间号': item.roomNumber,
    '检查项': item.inspectionItemName,
    '问题描述': item.problem,
    '偏差值(mm)': item.deviation,
    '允许偏差': item.allowableDeviation,
    '整改要求': item.rectificationRequirement,
    '责任人': item.assignee,
    '整改期限': item.deadline,
    '状态': item.status,
    '备注': item.remark,
  }));
  exportToExcel(exportData, '质量整改台账', fileName);
};

export const exportMeasurementPoints = (
  points: MeasurementPoint[],
  fileName: string
): void => {
  const exportData = points.map((item) => ({
    '楼栋': item.buildingName,
    '楼层': item.floorName,
    '房间号': item.roomNumber,
    '检查项': item.inspectionItemName,
    '测点编号': item.pointNumber,
    '位置': item.location,
    '设计值(mm)': item.designValue,
    '实测值(mm)': item.measuredValue,
    '允许正偏差(mm)': item.allowablePositiveDeviation,
    '允许负偏差(mm)': item.allowableNegativeDeviation,
    '偏差值(mm)': item.deviation,
    '是否异常': item.isAbnormal ? '是' : '否',
    '是否重复': item.isDuplicate ? '是' : '否',
    '是否有照片': item.hasPhoto ? '是' : '否',
    '状态': item.status === 'pending' ? '待校对' : item.status === 'approved' ? '已通过' : '需补测',
    '检查人': item.checker,
    '检查日期': item.checkDate,
    '备注': item.remark || '',
  }));
  exportToExcel(exportData, '测点数据', fileName);
};
