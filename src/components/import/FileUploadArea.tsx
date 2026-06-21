import React, { useCallback } from 'react';
import { Upload, message, Typography } from 'antd';
import { Inbox, FileSpreadsheet, FileText } from 'lucide-react';
import type { UploadFile } from 'antd/es/upload/interface';
import { parseExcelFile, parseCsvFile } from '../../utils/excel';
import { autoDetectColumnMapping } from '../../utils/classifier';
import { useImportStore } from '../../store';
import { formatFileSize } from '../../utils';

const { Text, Title } = Typography;

interface FileUploadAreaProps {
  onFileParsed?: () => void;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({ onFileParsed }) => {
  const setPreviewData = useImportStore((state) => state.setPreviewData);
  const setColumnMapping = useImportStore((state) => state.setColumnMapping);
  const setFileName = useImportStore((state) => state.setFileName);
  const resetImport = useImportStore((state) => state.resetImport);

  const handleFile = useCallback(
    async (file: UploadFile) => {
      resetImport();

      try {
        const fileExt = file.name?.split('.').pop()?.toLowerCase();
        let result;

        if (fileExt === 'xlsx' || fileExt === 'xls') {
          result = await parseExcelFile(file as unknown as File);
        } else if (fileExt === 'csv') {
          result = await parseCsvFile(file as unknown as File);
        } else {
          message.error('不支持的文件格式，请上传 Excel (.xlsx, .xls) 或 CSV 文件');
          return false;
        }

        if (result.headers.length === 0 || result.rows.length === 0) {
          message.error('文件内容为空，请检查文件');
          return false;
        }

        const mapping = autoDetectColumnMapping(result.headers);
        setFileName(file.name || '未知文件');
        setPreviewData(result.headers, result.rows);
        setColumnMapping(mapping);

        message.success(`成功解析文件，共 ${result.rows.length} 条数据`);
        onFileParsed?.();

        return false;
      } catch (error) {
        console.error('解析文件失败:', error);
        message.error('文件解析失败：' + (error as Error).message);
        return false;
      }
    },
    [setPreviewData, setColumnMapping, resetImport, onFileParsed]
  );

  const uploadProps = {
    accept: '.xlsx,.xls,.csv',
    showUploadList: false,
    beforeUpload: handleFile,
    multiple: false,
    maxCount: 1,
  };

  return (
    <Upload.Dragger {...uploadProps} className="!mb-6">
      <div className="py-12 px-8">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-50 p-6 rounded-full">
            <Inbox className="text-blue-600" size={48} />
          </div>
        </div>
        <Title level={4} className="!text-gray-700 !mb-2 !text-center">
          拖拽文件到此处或点击上传
        </Title>
        <Text className="block text-center text-gray-500 mb-6">
          支持 Excel (.xlsx, .xls) 和 CSV 格式文件，单个文件不超过 50MB
        </Text>
        <div className="flex justify-center gap-8">
          <div className="flex items-center gap-2 text-gray-500">
            <FileSpreadsheet size={18} />
            <Text className="!text-gray-500">Excel 表格</Text>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <FileText size={18} />
            <Text className="!text-gray-500">CSV 文件</Text>
          </div>
        </div>
      </div>
    </Upload.Dragger>
  );
};

export default FileUploadArea;
