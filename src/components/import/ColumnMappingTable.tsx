import React from 'react';
import { Table, Select, Typography, Space, Button, Tag } from 'antd';
import { Settings, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { useImportStore } from '../../store';
import { STANDARD_COLUMNS } from '../../utils/classifier';
import type { RawImportRow, ColumnMapping } from '../../types';

const { Text, Title } = Typography;
const { Option } = Select;

interface ColumnMappingTableProps {
  onProcessComplete?: () => void;
}

const ColumnMappingTable: React.FC<ColumnMappingTableProps> = ({
  onProcessComplete,
}) => {
  const {
    headers,
    previewData,
    columnMapping,
    setColumnMapping,
    processData,
  } = useImportStore();

  const handleMappingChange = (
    originalColumn: string,
    standardColumn: string
  ) => {
    const newMapping: ColumnMapping = { ...columnMapping };
    newMapping[standardColumn] = originalColumn;
    setColumnMapping(newMapping);
  };

  const handleProcess = () => {
    processData();
    onProcessComplete?.();
  };

  const mappedCount = Object.keys(columnMapping).filter(
    (k) => columnMapping[k] && k !== columnMapping[k]
  ).length;

  const columns: ColumnsType<{ header: string; sample: string }> = [
    {
      title: '原始列名',
      dataIndex: 'header',
      key: 'header',
      width: 200,
      render: (text) => (
        <Text strong className="text-gray-700">
          {text}
        </Text>
      ),
    },
    {
      title: '示例数据',
      dataIndex: 'sample',
      key: 'sample',
      width: 200,
      ellipsis: true,
      render: (text) => <Text className="text-gray-500">{text}</Text>,
    },
    {
      title: '映射到标准字段',
      dataIndex: 'mapping',
      key: 'mapping',
      width: 250,
      render: (_, record) => (
        <Select
          style={{ width: '100%' }}
          placeholder="请选择标准字段"
          allowClear
          value={
            Object.entries(columnMapping).find(
              ([, v]) => v === record.header
            )?.[0] || undefined
          }
          onChange={(value) => {
            if (value) {
              handleMappingChange(record.header, value);
            } else {
              const newMapping = { ...columnMapping };
              const keyToDelete = Object.entries(newMapping).find(
                ([, v]) => v === record.header
              )?.[0];
              if (keyToDelete) {
                delete newMapping[keyToDelete];
              }
              setColumnMapping(newMapping);
            }
          }}
        >
          {STANDARD_COLUMNS.map((col) => (
            <Option key={col} value={col}>
              {col}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const isMapped = Object.values(columnMapping).includes(record.header);
        return isMapped ? (
          <Tag color="green" icon={<CheckCircle2 size={12} />}>
            已映射
          </Tag>
        ) : (
          <Tag color="default">未映射</Tag>
        );
      },
    },
  ];

  const tableData = headers.map((header) => ({
    key: header,
    header,
    sample: String(previewData[0]?.[header] || ''),
  }));

  if (headers.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Settings className="text-blue-600" size={20} />
          <Title level={5} className="!m-0">
            字段映射配置
          </Title>
          <Tag color="blue">已映射 {mappedCount} 个字段</Tag>
        </div>
        <Space>
          <Button type="primary" onClick={handleProcess} icon={<ArrowRight size={16} />}>
            处理数据
          </Button>
        </Space>
      </div>
      <Text type="secondary" className="block mb-4">
        系统已自动识别字段映射，如有误请手动调整。确保"实测值"、"检查项"、"楼栋"、"楼层"、"房间号"等关键字段正确映射。
      </Text>
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        size="small"
        bordered
      />
    </div>
  );
};

export default ColumnMappingTable;
