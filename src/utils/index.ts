import dayjs from 'dayjs';

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const parseNumber = (value: string | number | undefined): number => {
  if (value === undefined || value === null || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? 0 : num;
};

export const parseBuildingName = (raw: string | undefined): string => {
  if (!raw) return '未识别楼栋';
  const match = raw.match(/(\d+)\s*(#|栋|号楼|幢)/);
  if (match) {
    return `${match[1]}#楼`;
  }
  return raw.trim();
};

export const parseFloorName = (raw: string | undefined): string => {
  if (!raw) return '未识别楼层';
  const negativeMatch = raw.match(/-?\d+/);
  if (negativeMatch) {
    const num = parseInt(negativeMatch[0], 10);
    if (num < 0) {
      return `B${Math.abs(num)}层`;
    }
    return `${num}层`;
  }
  return raw.trim();
};

export const parseFloorNumber = (raw: string | undefined): number => {
  if (!raw) return 0;
  const match = raw.match(/-?\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const parseRoomNumber = (raw: string | undefined): string => {
  if (!raw) return '未识别房间';
  return raw.trim();
};

export const isOutlier = (
  measured: number,
  design: number,
  allowPositive: number,
  allowNegative: number
): boolean => {
  const deviation = measured - design;
  return deviation > allowPositive || deviation < -allowNegative;
};

export const calculateDeviation = (
  measured: number,
  design: number
): number => {
  return Math.round((measured - design) * 100) / 100;
};

export const formatDeviation = (deviation: number): string => {
  const sign = deviation > 0 ? '+' : '';
  return `${sign}${deviation}`;
};

export const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待校对',
    approved: '已通过',
    retest_required: '需补测',
  };
  return map[status] || status;
};

export const getRetestStatusText = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待补测',
    completed: '已补测',
    verified: '已复核',
  };
  return map[status] || status;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
