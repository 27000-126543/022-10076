import React, { useState, useMemo, useEffect } from 'react';
import {
  Typography,
  Space,
  Button,
  Tag,
  Input,
  Select,
  Tree,
  Card,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  Search,
  Filter,
  Download,
  Upload,
  AlertTriangle,
  Image as ImageIcon,
  FileWarning,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import type { TreeProps } from 'antd';
import FileUploadArea from '../components/import/FileUploadArea';
import ColumnMappingTable from '../components/import/ColumnMappingTable';
import ProcessedDataTable from '../components/import/ProcessedDataTable';
import { useDataStore, useImportStore, useFilterStore, type TreeFilter } from '../store';
import { exportMeasurementPoints } from '../utils/excel';
import type { TreeNode } from '../types';

const { Title, Text } = Typography;
const { Search: SearchInput } = Input;
const { Option } = Select;

const parseTreeFilter = (
  selectedKeys: string[],
  treeData: TreeNode[]
): TreeFilter | null => {
  if (selectedKeys.length === 0) return null;
  const selectedKey = selectedKeys[0];

  const findNode = (nodes: TreeNode[], key: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.key === key) return node;
      if (node.children) {
        const result = findNode(node.children, key);
        if (result) return result;
      }
    }
    return null;
  };

  const node = findNode(treeData, selectedKey);
  if (!node?.data) return null;

  const { buildingId, floorId, roomId, inspectionItemId } = node.data;
  const filter: TreeFilter = {};
  if (buildingId) filter.buildingId = buildingId;
  if (floorId) filter.floorId = floorId;
  if (roomId) filter.roomId = roomId;
  if (inspectionItemId) filter.inspectionItemId = inspectionItemId;

  return Object.keys(filter).length > 0 ? filter : null;
};

const ImportVerifyPage: React.FC = () => {
  const { treeData, statistics, points, fetchAllData } = useDataStore();
  const { previewData, processedPoints, importResult, resetImport } =
    useImportStore();
  const {
    selectedKeys,
    statusFilter,
    abnormalFilter,
    searchText,
    treeFilter,
    setSelectedKeys,
    setStatusFilter,
    setAbnormalFilter,
    setSearchText,
    setTreeFilter,
    resetFilters,
  } = useFilterStore();

  const computedTreeFilter = useMemo(
    () => parseTreeFilter(selectedKeys, treeData),
    [selectedKeys, treeData]
  );

  useEffect(() => {
    setTreeFilter(computedTreeFilter);
  }, [computedTreeFilter, setTreeFilter]);

  const filteredPoints = useMemo(() => {
    if (!treeFilter) return points;
    return points.filter((p) => {
      if (treeFilter.buildingId && p.buildingId !== treeFilter.buildingId) return false;
      if (treeFilter.floorId && p.floorId !== treeFilter.floorId) return false;
      if (treeFilter.roomId && p.roomId !== treeFilter.roomId) return false;
      if (treeFilter.inspectionItemId && p.inspectionItemId !== treeFilter.inspectionItemId) return false;
      return true;
    });
  }, [points, treeFilter]);

  const filteredStatistics = useMemo(() => ({
    total: filteredPoints.length,
    abnormal: filteredPoints.filter((p) => p.isAbnormal).length,
    missingPhoto: filteredPoints.filter((p) => !p.hasPhoto).length,
    duplicate: filteredPoints.filter((p) => p.isDuplicate).length,
    pending: filteredPoints.filter((p) => p.status === 'pending').length,
  }), [filteredPoints]);

  const stepOrder = ['upload', 'mapping', 'processed', 'list'];
  const [step, setStep] = useState<'upload' | 'mapping' | 'processed' | 'list'>(
    'list'
  );

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onSelect: TreeProps['onSelect'] = (selectedKeysValue) => {
    setSelectedKeys(selectedKeysValue as string[]);
  };

  const handleExportAll = () => {
    exportMeasurementPoints(points, `实测实量数据_${new Date().toLocaleDateString()}`);
  };

  const handleNewImport = () => {
    resetImport();
    setStep('upload');
  };

  const handleFileParsed = () => {
    setStep('mapping');
  };

  const handleMappingComplete = () => {
    setStep('processed');
  };

  const handleImportComplete = () => {
    setStep('list');
    resetImport();
    fetchAllData();
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            stepOrder.indexOf(step) === 0
              ? 'bg-blue-600 text-white'
              : stepOrder.indexOf(step) > 0
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          1
        </div>
        <Text strong={step === 'upload'}>上传文件</Text>
      </div>
      <div className="w-8 h-px bg-gray-300" />
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'mapping'
              ? 'bg-blue-600 text-white'
              : ['processed', 'list'].includes(step)
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          2
        </div>
        <Text strong={step === 'mapping'}>字段映射</Text>
      </div>
      <div className="w-8 h-px bg-gray-300" />
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step === 'processed'
              ? 'bg-blue-600 text-white'
              : step === 'list'
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          3
        </div>
        <Text strong={step === 'processed'}>确认导入</Text>
      </div>
      <div className="flex-1" />
      {step !== 'list' && (
        <Button
          icon={<RotateCcw size={14} />}
          onClick={() => {
            setStep('list');
            resetImport();
          }}
        >
          返回列表
        </Button>
      )}
    </div>
  );

  if (step === 'upload') {
    return (
      <div className="p-6">
        {renderStepIndicator()}
        <FileUploadArea onFileParsed={handleFileParsed} />
      </div>
    );
  }

  if (step === 'mapping') {
    return (
      <div className="p-6">
        {renderStepIndicator()}
        <ColumnMappingTable onProcessComplete={handleMappingComplete} />
        {previewData.length > 0 && (
          <div className="mt-6">
            <Title level={5} className="!mb-4">
              数据预览（前5行）
            </Title>
            <ProcessedDataTable showOnlyProcessed />
          </div>
        )}
      </div>
    );
  }

  if (step === 'processed') {
    return (
      <div className="p-6">
        {renderStepIndicator()}
        {importResult && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              importResult.success ? 'bg-green-50' : 'bg-red-50'
            }`}
          >
            <Text strong className={importResult.success ? 'text-green-700' : 'text-red-700'}>
              {importResult.message}
            </Text>
            {importResult.success && (
              <div className="flex gap-4 mt-2">
                <Text className="text-green-600">
                  总数据：{importResult.totalCount} 条
                </Text>
                <Text className="text-red-600">
                  异常值：{importResult.abnormalCount} 条
                </Text>
                <Text className="text-orange-600">
                  缺照片：{importResult.missingPhotoCount} 条
                </Text>
                <Text className="text-yellow-600">
                  重复：{importResult.duplicateCount} 条
                </Text>
              </div>
            )}
          </div>
        )}
        {processedPoints.length > 0 && (
          <ProcessedDataTable
            showOnlyProcessed
            onImportComplete={handleImportComplete}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px-48px)]">
      <div className="w-64 border-r p-4 overflow-y-auto bg-gray-50">
        <Title level={5} className="!mb-4">
          数据分类
        </Title>
        <Tree
          showLine={{ showLeafIcon: false }}
          treeData={treeData as TreeProps['treeData']}
          selectedKeys={selectedKeys}
          onSelect={onSelect}
          defaultExpandAll
          titleRender={(nodeData: TreeNode) => (
            <div className="flex items-center justify-between w-full">
              <span>{nodeData.title}</span>
              {nodeData.data?.count !== undefined && (
                <Tag color="blue" className="!mb-0">
                  {nodeData.data.count}
                </Tag>
              )}
            </div>
          )}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Title level={4} className="!m-0">
                导入校对
              </Title>
              <Tag color="blue">共 {filteredStatistics.total} 条数据</Tag>
            </div>
            <Space>
              <Button icon={<Download size={14} />} onClick={handleExportAll}>
                导出全部
              </Button>
              <Button
                type="primary"
                icon={<Upload size={14} />}
                onClick={handleNewImport}
              >
                导入数据
              </Button>
            </Space>
          </div>

          <Row gutter={16} className="mb-4">
            <Col span={6}>
              <Card className="!bg-red-50 !border-red-200">
                <Statistic
                  title="异常值"
                  value={filteredStatistics.abnormal}
                  prefix={<AlertTriangle className="text-red-500" size={18} />}
                  valueStyle={{ color: '#DC2626' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="!bg-orange-50 !border-orange-200">
                <Statistic
                  title="缺失照片"
                  value={filteredStatistics.missingPhoto}
                  prefix={<ImageIcon className="text-orange-500" size={18} />}
                  valueStyle={{ color: '#D97706' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="!bg-yellow-50 !border-yellow-200">
                <Statistic
                  title="重复点位"
                  value={filteredStatistics.duplicate}
                  prefix={<FileWarning className="text-yellow-600" size={18} />}
                  valueStyle={{ color: '#CA8A04' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="!bg-blue-50 !border-blue-200">
                <Statistic
                  title="待校对"
                  value={filteredStatistics.pending}
                  prefix={<Clock className="text-blue-500" size={18} />}
                  valueStyle={{ color: '#2563EB' }}
                />
              </Card>
            </Col>
          </Row>

          <div className="flex items-center gap-4">
            <SearchInput
              placeholder="搜索测点编号、房间号、检查项..."
              prefix={<Search size={16} />}
              allowClear
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Select
              style={{ width: 150 }}
              placeholder="状态筛选"
              allowClear
              value={statusFilter === 'all' ? undefined : statusFilter}
              onChange={(value) => setStatusFilter(value || 'all')}
              suffixIcon={<Filter size={14} />}
            >
              <Option value="all">全部状态</Option>
              <Option value="pending">
                <div className="flex items-center gap-2">
                  <Clock size={14} /> 待校对
                </div>
              </Option>
              <Option value="approved">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" /> 已通过
                </div>
              </Option>
              <Option value="retest_required">
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-orange-500" /> 需补测
                </div>
              </Option>
            </Select>
            <Select
              style={{ width: 150 }}
              placeholder="异常筛选"
              allowClear
              value={abnormalFilter === 'all' ? undefined : abnormalFilter}
              onChange={(value) => setAbnormalFilter(value || 'all')}
              suffixIcon={<Filter size={14} />}
            >
              <Option value="all">全部数据</Option>
              <Option value="abnormal">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" /> 异常值
                </div>
              </Option>
              <Option value="missing_photo">
                <div className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-orange-500" /> 缺失照片
                </div>
              </Option>
              <Option value="duplicate">
                <div className="flex items-center gap-2">
                  <FileWarning size={14} className="text-yellow-500" /> 重复点位
                </div>
              </Option>
              <Option value="normal">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" /> 正常数据
                </div>
              </Option>
            </Select>
            <Button onClick={resetFilters} icon={<RotateCcw size={14} />}>
              重置筛选
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <ProcessedDataTable />
        </div>
      </div>
    </div>
  );
};

export default ImportVerifyPage;
