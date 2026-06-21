import React, { useState, useMemo } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  Popconfirm,
  message,
  Typography,
  Tooltip,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Image,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Image as ImageIcon,
  FileWarning,
  Edit3,
  Trash2,
  Send,
} from 'lucide-react';
import { useDataStore, useImportStore, useFilterStore } from '../../store';
import type { MeasurementPoint } from '../../types';
import { formatDate, formatDeviation, getStatusText } from '../../utils';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;

interface ProcessedDataTableProps {
  showOnlyProcessed?: boolean;
  onImportComplete?: () => void;
}

const ProcessedDataTable: React.FC<ProcessedDataTableProps> = ({
  showOnlyProcessed = false,
  onImportComplete,
}) => {
  const {
    processedPoints,
    isImporting,
    importProgress,
    importResult,
    importData,
    resetImport,
  } = useImportStore();

  const { approvePoint, createRetestTask, updatePoint, deletePoint } =
    useDataStore();

  const { selectedKeys, statusFilter, abnormalFilter, searchText, treeFilter } =
    useFilterStore();

  const [retestModalOpen, setRetestModalOpen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<MeasurementPoint | null>(
    null
  );
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm();

  const displayPoints = useMemo(() => {
    let points = showOnlyProcessed ? processedPoints : useDataStore.getState().points;

    if (treeFilter) {
      if (treeFilter.buildingId) {
        points = points.filter((p) => p.buildingId === treeFilter.buildingId);
      }
      if (treeFilter.floorId) {
        points = points.filter((p) => p.floorId === treeFilter.floorId);
      }
      if (treeFilter.roomId) {
        points = points.filter((p) => p.roomId === treeFilter.roomId);
      }
      if (treeFilter.inspectionItemId) {
        points = points.filter((p) => p.inspectionItemId === treeFilter.inspectionItemId);
      }
    }

    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      points = points.filter(
        (p) =>
          p.pointNumber.toLowerCase().includes(lowerSearch) ||
          p.roomNumber.toLowerCase().includes(lowerSearch) ||
          p.inspectionItemName.toLowerCase().includes(lowerSearch)
      );
    }

    if (statusFilter !== 'all') {
      points = points.filter((p) => p.status === statusFilter);
    }

    if (abnormalFilter === 'abnormal') {
      points = points.filter((p) => p.isAbnormal);
    } else if (abnormalFilter === 'missing_photo') {
      points = points.filter((p) => !p.hasPhoto);
    } else if (abnormalFilter === 'duplicate') {
      points = points.filter((p) => p.isDuplicate);
    } else if (abnormalFilter === 'normal') {
      points = points.filter(
        (p) => !p.isAbnormal && p.hasPhoto && !p.isDuplicate
      );
    }

    return points;
  }, [showOnlyProcessed, processedPoints, searchText, statusFilter, abnormalFilter, treeFilter]);

  const handleApprove = async (point: MeasurementPoint) => {
    await approvePoint(point.id);
    message.success('已通过校对');
  };

  const handleMarkRetest = (point: MeasurementPoint) => {
    setSelectedPoint(point);
    setRetestModalOpen(true);
  };

  const handleSubmitRetest = async (values: {
    reason: string;
    assignee: string;
    deadline: string;
  }) => {
    if (!selectedPoint) return;
    await createRetestTask(
      selectedPoint,
      values.reason,
      values.assignee,
      values.deadline
    );
    message.success('已标记为需现场补测');
    setRetestModalOpen(false);
    setSelectedPoint(null);
    form.resetFields();
  };

  const handleEdit = (point: MeasurementPoint) => {
    setSelectedPoint(point);
    form.setFieldsValue({
      measuredValue: point.measuredValue,
      checker: point.checker,
      checkDate: point.checkDate ? dayjs(point.checkDate) : undefined,
      remark: point.remark,
    });
    setEditModalOpen(true);
  };

  const handleSubmitEdit = async (values: {
    measuredValue: number;
    checker: string;
    checkDate: dayjs.Dayjs;
    remark: string;
  }) => {
    if (!selectedPoint) return;

    const measuredValue = Number(values.measuredValue);
    const deviation = Math.round((measuredValue - selectedPoint.designValue) * 100) / 100;
    const isAbnormal =
      deviation > selectedPoint.allowablePositiveDeviation ||
      deviation < -selectedPoint.allowableNegativeDeviation;

    await updatePoint(selectedPoint.id, {
      measuredValue,
      checker: values.checker,
      checkDate: values.checkDate ? values.checkDate.format('YYYY-MM-DD') : '',
      remark: values.remark,
      deviation,
      isAbnormal,
    });
    message.success('已更新测点数据');
    setEditModalOpen(false);
    setSelectedPoint(null);
    form.resetFields();
  };

  const handleDelete = async (id: string) => {
    await deletePoint(id);
    message.success('已删除测点');
  };

  const handleImport = async () => {
    if (processedPoints.length === 0) {
      message.warning('没有可导入的数据');
      return;
    }
    const success = await importData('导入数据', processedPoints.length * 100);
    if (success) {
      onImportComplete?.();
    }
  };

  const columns: ColumnsType<MeasurementPoint> = [
    {
      title: '测点编号',
      dataIndex: 'pointNumber',
      key: 'pointNumber',
      width: 220,
      fixed: 'left',
      render: (text, record) => (
        <div>
          <Text strong className="text-gray-800">
            {text}
          </Text>
          <div className="flex gap-1 mt-1">
            {record.isDuplicate && (
              <Tag color="orange" icon={<FileWarning size={10} />}>
                重复
              </Tag>
            )}
            {record.isAbnormal && (
              <Tag color="red" icon={<AlertTriangle size={10} />}>
                异常
              </Tag>
            )}
            {!record.hasPhoto && (
              <Tag color="gold" icon={<ImageIcon size={10} />}>
                缺照片
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '楼栋',
      dataIndex: 'buildingName',
      key: 'buildingName',
      width: 80,
    },
    {
      title: '楼层',
      dataIndex: 'floorName',
      key: 'floorName',
      width: 70,
    },
    {
      title: '房间',
      dataIndex: 'roomNumber',
      key: 'roomNumber',
      width: 80,
    },
    {
      title: '检查项',
      dataIndex: 'inspectionItemName',
      key: 'inspectionItemName',
      width: 120,
    },
    {
      title: '设计值',
      dataIndex: 'designValue',
      key: 'designValue',
      width: 80,
      align: 'right',
      render: (val) => <Text className="font-mono">{val}</Text>,
    },
    {
      title: '实测值',
      dataIndex: 'measuredValue',
      key: 'measuredValue',
      width: 80,
      align: 'right',
      render: (val, record) => (
        <Text
          className={`font-mono font-bold ${
            record.isAbnormal ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {val}
        </Text>
      ),
    },
    {
      title: '允许偏差',
      key: 'allowable',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Text className="font-mono text-gray-500">
          +{record.allowablePositiveDeviation}/-{record.allowableNegativeDeviation}
        </Text>
      ),
    },
    {
      title: '偏差值',
      dataIndex: 'deviation',
      key: 'deviation',
      width: 80,
      align: 'right',
      render: (val, record) => (
        <Text
          className={`font-mono font-bold ${
            record.isAbnormal ? 'text-red-600' : 'text-gray-700'
          }`}
        >
          {formatDeviation(val)}
        </Text>
      ),
    },
    {
      title: '照片',
      key: 'photo',
      width: 60,
      align: 'center',
      render: (_, record) =>
        record.photoData || record.photoPath ? (
          <Tooltip title="查看照片">
            <Image
              width={32}
              height={32}
              src={record.photoData || record.photoPath}
              style={{ objectFit: 'cover', borderRadius: 4 }}
            />
          </Tooltip>
        ) : (
          <Text type="secondary" className="text-gray-400">
            <ImageIcon size={16} />
          </Text>
        ),
    },
    {
      title: '检查人',
      dataIndex: 'checker',
      key: 'checker',
      width: 80,
    },
    {
      title: '检查日期',
      dataIndex: 'checkDate',
      key: 'checkDate',
      width: 100,
      render: (val) => formatDate(val),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => {
        const colorMap: Record<string, string> = {
          pending: 'default',
          approved: 'green',
          retest_required: 'orange',
        };
        return (
          <Tag color={colorMap[status] || 'default'}>
            {getStatusText(status)}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'pending' && (
            <>
              <Tooltip title="通过校对">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckCircle size={16} className="text-green-600" />}
                  onClick={() => handleApprove(record)}
                />
              </Tooltip>
              <Tooltip title="标记补测">
                <Button
                  type="text"
                  size="small"
                  icon={<XCircle size={16} className="text-orange-600" />}
                  onClick={() => handleMarkRetest(record)}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="编辑">
            <Button
              type="text"
              size="small"
              icon={<Edit3 size={16} className="text-blue-600" />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除该测点？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<Trash2 size={16} />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {showOnlyProcessed && processedPoints.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-4 bg-blue-50 rounded-lg">
          <div>
            <Title level={5} className="!m-0 !text-blue-800">
              数据处理完成
            </Title>
            <Text className="text-blue-600">
              共 {processedPoints.length} 条数据，异常{' '}
              {processedPoints.filter((p) => p.isAbnormal).length} 条，缺照片{' '}
              {processedPoints.filter((p) => !p.hasPhoto).length} 条，重复{' '}
              {processedPoints.filter((p) => p.isDuplicate).length} 条
            </Text>
          </div>
          <Space>
            <Button onClick={resetImport}>重新导入</Button>
            <Button
              type="primary"
              icon={<Send size={16} />}
              onClick={handleImport}
              loading={isImporting}
            >
              确认导入
            </Button>
          </Space>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={displayPoints}
        rowKey="id"
        scroll={{ x: 1400, y: 500 }}
        size="small"
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条数据`,
        }}
      />

      <Modal
        title="标记需现场补测"
        open={retestModalOpen}
        onCancel={() => {
          setRetestModalOpen(false);
          setSelectedPoint(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        {selectedPoint && (
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <Text strong>测点：</Text>
            <Text>{selectedPoint.pointNumber}</Text>
            <br />
            <Text strong>当前偏差：</Text>
            <Text className={selectedPoint.isAbnormal ? 'text-red-600' : ''}>
              {formatDeviation(selectedPoint.deviation)} mm
            </Text>
          </div>
        )}
        <Form form={form} layout="vertical" onFinish={handleSubmitRetest}>
          <Form.Item
            label="补测原因"
            name="reason"
            rules={[{ required: true, message: '请输入补测原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入补测原因" />
          </Form.Item>
          <Form.Item
            label="责任人"
            name="assignee"
            rules={[{ required: true, message: '请选择责任人' }]}
          >
            <Select placeholder="请选择责任人">
              <Option value="质量员A">质量员A</Option>
              <Option value="质量员B">质量员B</Option>
              <Option value="施工班组长">施工班组长</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="整改期限"
            name="deadline"
            rules={[{ required: true, message: '请选择整改期限' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item className="!mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => {
                  setRetestModalOpen(false);
                  setSelectedPoint(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                确认标记
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑测点数据"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setSelectedPoint(null);
          form.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmitEdit}>
          <Form.Item
            label="实测值"
            name="measuredValue"
            rules={[{ required: true, message: '请输入实测值' }]}
          >
            <Input type="number" step="0.1" placeholder="请输入实测值" />
          </Form.Item>
          <Form.Item
            label="检查人"
            name="checker"
            rules={[{ required: true, message: '请输入检查人' }]}
          >
            <Input placeholder="请输入检查人" />
          </Form.Item>
          <Form.Item
            label="检查日期"
            name="checkDate"
            rules={[{ required: true, message: '请选择检查日期' }]}
          >
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>
          <Form.Item className="!mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => {
                  setEditModalOpen(false);
                  setSelectedPoint(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProcessedDataTable;
