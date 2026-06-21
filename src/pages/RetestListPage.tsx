import React, { useState } from 'react';
import {
  Typography,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Upload,
  message,
  Progress,
  Card,
  Statistic,
  Row,
  Col,
  Tabs,
  Tooltip,
  Image,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  CheckCircle2,
  Edit3,
  Trash2,
  Upload as UploadIcon,
  Download,
  Plus,
  Image as ImageIcon,
  Send,
} from 'lucide-react';
import { useDataStore } from '../store';
import type { RetestTask, MeasurementPoint } from '../types';
import {
  formatDate,
  formatDateTime,
  getRetestStatusText,
  readFileAsDataURL,
} from '../utils';
import { exportToExcel } from '../utils/excel';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const RetestListPage: React.FC = () => {
  const {
    retestTasks,
    points,
    completeRetestTask,
    verifyRetestTask,
    deleteRetestTask,
    updatePoint,
  } = useDataStore();

  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<RetestTask | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MeasurementPoint | null>(
    null
  );
  const [form] = Form.useForm();
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'verified'>('pending');

  const filteredTasks = retestTasks.filter((t) => t.status === activeTab);

  const pendingCount = retestTasks.filter((t) => t.status === 'pending').length;
  const completedCount = retestTasks.filter((t) => t.status === 'completed').length;
  const verifiedCount = retestTasks.filter((t) => t.status === 'verified').length;

  const handleComplete = (task: RetestTask) => {
    const point = points.find((p) => p.id === task.pointId);
    setSelectedTask(task);
    setSelectedPoint(point || null);
    form.setFieldsValue({
      retestValue: point?.measuredValue,
      remark: task.remark,
    });
    setPhotoData(task.retestPhotoData || null);
    setCompleteModalOpen(true);
  };

  const handlePhotoUpload = async (file: UploadFile) => {
    try {
      const dataUrl = await readFileAsDataURL(file as unknown as File);
      setPhotoData(dataUrl);
      message.success('照片上传成功');
    } catch (error) {
      message.error('照片上传失败');
    }
    return false;
  };

  const handleSubmitComplete = async (values: {
    retestValue: number;
    remark: string;
  }) => {
    if (!selectedTask) return;
    await completeRetestTask(
      selectedTask.id,
      values.retestValue,
      photoData || undefined
    );
    message.success('补测数据已提交');
    setCompleteModalOpen(false);
    setSelectedTask(null);
    setSelectedPoint(null);
    setPhotoData(null);
    form.resetFields();
  };

  const handleVerify = async (task: RetestTask, verified: boolean) => {
    await verifyRetestTask(task.id, verified);
    message.success(verified ? '已复核通过' : '已退回重新补测');
  };

  const handleDelete = async (id: string) => {
    await deleteRetestTask(id);
    message.success('已删除补测任务');
  };

  const handleExport = () => {
    const exportData = retestTasks.map((task) => {
      const point = points.find((p) => p.id === task.pointId);
      return {
        '测点编号': task.pointNumber,
        '楼栋': point?.buildingName,
        '楼层': point?.floorName,
        '房间号': point?.roomNumber,
        '检查项': point?.inspectionItemName,
        '补测原因': task.reason,
        '责任人': task.assignee,
        '整改期限': task.deadline,
        '状态': getRetestStatusText(task.status),
        '补测值': task.retestValue ?? '',
        '完成日期': task.completedDate ?? '',
        '备注': task.remark ?? '',
        '创建时间': formatDateTime(task.createdAt),
      };
    });
    exportToExcel(exportData, '补测清单', `补测清单_${new Date().toLocaleDateString()}`);
  };

  const columns: ColumnsType<RetestTask> = [
    {
      title: '测点编号',
      dataIndex: 'pointNumber',
      key: 'pointNumber',
      width: 200,
      fixed: 'left',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '位置',
      key: 'location',
      width: 150,
      render: (_, record) => {
        const point = points.find((p) => p.id === record.pointId);
        return (
          <Text>
            {point?.buildingName} {point?.floorName} {point?.roomNumber}室
          </Text>
        );
      },
    },
    {
      title: '检查项',
      key: 'item',
      width: 120,
      render: (_, record) => {
        const point = points.find((p) => p.id === record.pointId);
        return <Text>{point?.inspectionItemName}</Text>;
      },
    },
    {
      title: '原实测值',
      key: 'originalValue',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const point = points.find((p) => p.id === record.pointId);
        return (
          <Text type="danger" strong>
            {point?.measuredValue}
          </Text>
        );
      },
    },
    {
      title: '允许偏差',
      key: 'allowable',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const point = points.find((p) => p.id === record.pointId);
        return (
          <Text className="font-mono text-gray-500">
            +{point?.allowablePositiveDeviation}/-{point?.allowableNegativeDeviation}
          </Text>
        );
      },
    },
    {
      title: '补测原因',
      dataIndex: 'reason',
      key: 'reason',
      width: 150,
      ellipsis: true,
    },
    {
      title: '责任人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 100,
    },
    {
      title: '整改期限',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 110,
      render: (date) => formatDate(date),
    },
    {
      title: '补测值',
      dataIndex: 'retestValue',
      key: 'retestValue',
      width: 100,
      align: 'right',
      render: (val) => (val !== undefined ? <Text strong>{val}</Text> : '-'),
    },
    {
      title: '补测照片',
      key: 'photo',
      width: 80,
      align: 'center',
      render: (_, record) =>
        record.retestPhotoData ? (
          <Tooltip title="查看照片">
            <Image
              width={32}
              height={32}
              src={record.retestPhotoData}
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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const colorMap: Record<string, string> = {
          pending: 'orange',
          completed: 'blue',
          verified: 'green',
        };
        const iconMap: Record<string, React.ReactNode> = {
          pending: <Clock size={12} />,
          completed: <CheckCircle size={12} />,
          verified: <CheckCircle2 size={12} />,
        };
        return (
          <Tag color={colorMap[status]} icon={iconMap[status]}>
            {getRetestStatusText(status)}
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
            <Tooltip title="回填补测数据">
              <Button
                type="text"
                size="small"
                icon={<Plus size={16} className="text-green-600" />}
                onClick={() => handleComplete(record)}
              />
            </Tooltip>
          )}
          {record.status === 'completed' && (
            <>
              <Tooltip title="复核通过">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckCircle2 size={16} className="text-green-600" />}
                  onClick={() => handleVerify(record, true)}
                />
              </Tooltip>
              <Tooltip title="退回重测">
                <Button
                  type="text"
                  size="small"
                  icon={<Edit3 size={16} className="text-orange-600" />}
                  onClick={() => handleVerify(record, false)}
                />
              </Tooltip>
            </>
          )}
          <Popconfirm
            title="确定删除该补测任务？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<Trash2 size={16} />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const completionRate =
    retestTasks.length > 0
      ? Math.round((verifiedCount / retestTasks.length) * 100)
      : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Title level={4} className="!m-0">
            补测清单
          </Title>
          <Tag color="orange">共 {retestTasks.length} 条任务</Tag>
        </div>
        <Space>
          <Button icon={<Download size={14} />} onClick={handleExport}>
            导出清单
          </Button>
        </Space>
      </div>

      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="待补测"
              value={pendingCount}
              prefix={<Clock className="text-orange-500" size={18} />}
              valueStyle={{ color: '#D97706' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已补测待复核"
              value={completedCount}
              prefix={<CheckCircle className="text-blue-500" size={18} />}
              valueStyle={{ color: '#2563EB' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已复核完成"
              value={verifiedCount}
              prefix={<CheckCircle2 className="text-green-500" size={18} />}
              valueStyle={{ color: '#059669' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="mb-2">
              <Text className="text-gray-500">完成率</Text>
            </div>
            <Progress percent={completionRate} size="small" />
            <Text strong className="text-blue-600">
              {completionRate}%
            </Text>
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as typeof activeTab)}
        className="mb-4"
      >
        <TabPane
          tab={
            <span className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              待补测 ({pendingCount})
            </span>
          }
          key="pending"
        />
        <TabPane
          tab={
            <span className="flex items-center gap-2">
              <CheckCircle size={16} className="text-blue-500" />
              已补测 ({completedCount})
            </span>
          }
          key="completed"
        />
        <TabPane
          tab={
            <span className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              已复核 ({verifiedCount})
            </span>
          }
          key="verified"
        />
      </Tabs>

      <Table
        columns={columns}
        dataSource={filteredTasks}
        rowKey="id"
        scroll={{ x: 1400, y: 500 }}
        size="small"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条数据`,
        }}
        locale={{
          emptyText: (
            <div className="text-center py-12">
              <AlertTriangle size={48} className="text-gray-300 mx-auto mb-3" />
              <Text type="secondary">暂无{getRetestStatusText(activeTab)}的任务</Text>
            </div>
          ),
        }}
      />

      <Modal
        title="回填补测数据"
        open={completeModalOpen}
        onCancel={() => {
          setCompleteModalOpen(false);
          setSelectedTask(null);
          setSelectedPoint(null);
          setPhotoData(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        {selectedPoint && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Text type="secondary" className="block text-sm">
                  测点编号
                </Text>
                <Text strong>{selectedPoint.pointNumber}</Text>
              </div>
              <div>
                <Text type="secondary" className="block text-sm">
                  检查项
                </Text>
                <Text>{selectedPoint.inspectionItemName}</Text>
              </div>
              <div>
                <Text type="secondary" className="block text-sm">
                  原实测值
                </Text>
                <Text type="danger" strong>
                  {selectedPoint.measuredValue}
                </Text>
              </div>
              <div>
                <Text type="secondary" className="block text-sm">
                  允许偏差
                </Text>
                <Text className="font-mono">
                  +{selectedPoint.allowablePositiveDeviation}/-{selectedPoint.allowableNegativeDeviation}
                </Text>
              </div>
            </div>
          </div>
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmitComplete}>
          <Form.Item
            label="补测值"
            name="retestValue"
            rules={[{ required: true, message: '请输入补测值' }]}
          >
            <Input type="number" step="0.1" placeholder="请输入补测值" />
          </Form.Item>

          <Form.Item label="补测照片">
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={handlePhotoUpload}
              maxCount={1}
            >
              <Button icon={<UploadIcon size={14} />}>
                {photoData ? '重新上传照片' : '上传补测照片'}
              </Button>
            </Upload>
            {photoData && (
              <div className="mt-3">
                <Image
                  width={200}
                  height={150}
                  src={photoData}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                />
              </div>
            )}
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} placeholder="请输入备注" />
          </Form.Item>

          <Form.Item className="!mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => {
                  setCompleteModalOpen(false);
                  setSelectedTask(null);
                  setSelectedPoint(null);
                  setPhotoData(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit" icon={<Send size={14} />}>
                提交补测数据
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RetestListPage;
