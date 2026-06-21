import React, { useState } from 'react';
import {
  Typography,
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  message,
  Popconfirm,
  Divider,
  Alert,
  Upload,
  Row,
  Col,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Settings,
  Plus,
  Edit3,
  Trash2,
  Download,
  Upload as UploadIcon,
  Database,
  HardDrive,
  FileWarning,
  Save,
} from 'lucide-react';
import { useDataStore } from '../store';
import { db } from '../db';
import type { InspectionItem } from '../types';
import { INSPECTION_CATEGORIES } from '../constants/inspectionItems';
import { generateId } from '../utils';

const { Title, Text } = Typography;
const { Option } = Select;

const SettingsPage: React.FC = () => {
  const { fetchAllData } = useDataStore();
  const [inspectionItems, setInspectionItems] = useState<InspectionItem[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InspectionItem | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadInspectionItems();
  }, []);

  const loadInspectionItems = async () => {
    const items = await db.inspectionItems.toArray();
    setInspectionItems(items);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      requirePhoto: true,
    });
    setItemModalOpen(true);
  };

  const handleEditItem = (item: InspectionItem) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setItemModalOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    await db.inspectionItems.delete(id);
    message.success('已删除检查项');
    loadInspectionItems();
  };

  const handleSubmitItem = async (values: Omit<InspectionItem, 'id'>) => {
    setLoading(true);
    try {
      if (editingItem) {
        await db.inspectionItems.update(editingItem.id, values);
        message.success('已更新检查项');
      } else {
        const newItem: InspectionItem = {
          ...values,
          id: generateId(),
        };
        await db.inspectionItems.add(newItem);
        message.success('已添加检查项');
      }
      setItemModalOpen(false);
      setEditingItem(null);
      form.resetFields();
      loadInspectionItems();
    } catch (error) {
      message.error('操作失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const [points, tasks, batches, items] = await Promise.all([
        db.measurementPoints.toArray(),
        db.retestTasks.toArray(),
        db.importBatches.toArray(),
        db.inspectionItems.toArray(),
      ]);

      const exportData = {
        version: '1.0',
        exportTime: new Date().toISOString(),
        data: {
          inspectionItems: items,
          measurementPoints: points,
          retestTasks: tasks,
          importBatches: batches,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `质量实测实量数据备份_${new Date().toLocaleDateString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success('数据导出成功');
    } catch (error) {
      message.error('数据导出失败：' + (error as Error).message);
    }
  };

  const handleImportData = async (file: File) => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.data) {
        throw new Error('无效的备份文件格式');
      }

      Modal.confirm({
        title: '确认导入数据',
        content:
          '导入将覆盖现有数据，建议先备份当前数据。是否继续？',
        okText: '确认导入',
        cancelText: '取消',
        okType: 'danger',
        onOk: async () => {
          await db.transaction(
            'rw',
            db.inspectionItems,
            db.measurementPoints,
            db.retestTasks,
            db.importBatches,
            async () => {
              await db.inspectionItems.clear();
              await db.measurementPoints.clear();
              await db.retestTasks.clear();
              await db.importBatches.clear();

              if (importData.data.inspectionItems) {
                await db.inspectionItems.bulkAdd(
                  importData.data.inspectionItems
                );
              }
              if (importData.data.measurementPoints) {
                await db.measurementPoints.bulkAdd(
                  importData.data.measurementPoints
                );
              }
              if (importData.data.retestTasks) {
                await db.retestTasks.bulkAdd(importData.data.retestTasks);
              }
              if (importData.data.importBatches) {
                await db.importBatches.bulkAdd(importData.data.importBatches);
              }
            }
          );
          message.success('数据导入成功');
          loadInspectionItems();
          fetchAllData();
        },
      });
    } catch (error) {
      message.error('数据导入失败：' + (error as Error).message);
    }
    return false;
  };

  const handleClearData = async () => {
    Modal.confirm({
      title: '确认清空所有数据',
      content:
        '此操作将删除所有测点数据、补测任务和导入记录，但会保留检查项标准库。此操作不可恢复，建议先备份数据。',
      okText: '确认清空',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        await db.transaction(
          'rw',
          db.measurementPoints,
          db.retestTasks,
          db.importBatches,
          async () => {
            await db.measurementPoints.clear();
            await db.retestTasks.clear();
            await db.importBatches.clear();
          }
        );
        message.success('已清空所有业务数据');
        fetchAllData();
      },
    });
  };

  const itemColumns: ColumnsType<InspectionItem> = [
    {
      title: '检查项名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
    },
    {
      title: '设计值',
      dataIndex: 'designValue',
      key: 'designValue',
      width: 100,
      align: 'right',
      render: (val, record) => `${val} ${record.unit}`,
    },
    {
      title: '允许正偏差',
      dataIndex: 'allowablePositiveDeviation',
      key: 'allowablePositiveDeviation',
      width: 110,
      align: 'right',
      render: (val, record) => `+${val} ${record.unit}`,
    },
    {
      title: '允许负偏差',
      dataIndex: 'allowableNegativeDeviation',
      key: 'allowableNegativeDeviation',
      width: 110,
      align: 'right',
      render: (val, record) => `-${val} ${record.unit}`,
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
    },
    {
      title: '规范编号',
      dataIndex: 'standardCode',
      key: 'standardCode',
      width: 130,
    },
    {
      title: '需照片',
      dataIndex: 'requirePhoto',
      key: 'requirePhoto',
      width: 80,
      align: 'center',
      render: (val) => (val ? '是' : '否'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<Edit3 size={14} className="text-blue-600" />}
            onClick={() => handleEditItem(record)}
          />
          <Popconfirm
            title="确定删除该检查项？"
            onConfirm={() => handleDeleteItem(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<Trash2 size={14} />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Title level={4} className="!m-0">
          系统设置
        </Title>
        <Settings className="text-blue-600" size={24} />
      </div>

      <Alert
        message="数据安全提示"
        description="本系统为离线桌面应用，所有数据存储在本地浏览器中。请定期备份数据以防丢失。建议在重要操作前先导出数据备份。"
        type="warning"
        showIcon
        className="mb-6"
      />

      <Card
        title={
          <div className="flex items-center gap-2">
            <Database size={18} className="text-blue-600" />
            检查项标准库管理
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={handleAddItem}
          >
            添加检查项
          </Button>
        }
        className="mb-6"
      >
        <Table
          columns={itemColumns}
          dataSource={inspectionItems}
          rowKey="id"
          scroll={{ x: 1000, y: 400 }}
          size="small"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 个检查项`,
          }}
        />
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            <HardDrive size={18} className="text-green-600" />
            数据备份与恢复
          </div>
        }
        className="mb-6"
      >
        <Row gutter={16}>
          <Col span={12}>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Download size={20} className="text-blue-600" />
                <Text strong>导出数据备份</Text>
              </div>
              <Text type="secondary" className="block mb-4">
                将所有数据导出为 JSON 文件，包括检查项、测点数据、补测任务等。
              </Text>
              <Button
                type="primary"
                icon={<Save size={14} />}
                onClick={handleExportData}
              >
                导出备份
              </Button>
            </div>
          </Col>
          <Col span={12}>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <UploadIcon size={20} className="text-green-600" />
                <Text strong>导入数据备份</Text>
              </div>
              <Text type="secondary" className="block mb-4">
                从 JSON 备份文件恢复数据，将覆盖现有所有数据。
              </Text>
              <Upload
                accept=".json"
                showUploadList={false}
                beforeUpload={handleImportData}
                maxCount={1}
              >
                <Button icon={<UploadIcon size={14} />}>选择备份文件</Button>
              </Upload>
            </div>
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            <FileWarning size={18} className="text-orange-600" />
            危险操作
          </div>
        }
        className="mb-6"
      >
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <Text strong className="text-red-600 block mb-2">
            清空业务数据
          </Text>
          <Text type="secondary" className="block mb-4">
            删除所有测点数据、补测任务和导入记录，但保留检查项标准库。此操作不可恢复。
          </Text>
          <Button danger onClick={handleClearData}>
            清空业务数据
          </Button>
        </div>
      </Card>

      <Card title="关于系统">
        <div className="space-y-2">
          <p>
            <Text strong>质量实测实量离线桌面客户端</Text>
          </p>
          <p>版本号：1.0.0</p>
          <p>
            本系统专为建筑工地资料员和质量员设计，支持离线环境下的实测实量数据管理。
          </p>
          <p>技术支持：建筑工程质量管理系统</p>
        </div>
      </Card>

      <Modal
        title={editingItem ? '编辑检查项' : '添加检查项'}
        open={itemModalOpen}
        onCancel={() => {
          setItemModalOpen(false);
          setEditingItem(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitItem}
          initialValues={{
            requirePhoto: true,
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="检查项名称"
                name="name"
                rules={[{ required: true, message: '请输入检查项名称' }]}
              >
                <Input placeholder="如：墙面垂直度" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select placeholder="请选择分类">
                  {INSPECTION_CATEGORIES.map((cat) => (
                    <Option key={cat} value={cat}>
                      {cat}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="设计值"
                name="designValue"
                rules={[{ required: true, message: '请输入设计值' }]}
              >
                <InputNumber style={{ width: '100%' }} step="0.1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="允许正偏差"
                name="allowablePositiveDeviation"
                rules={[{ required: true, message: '请输入允许正偏差' }]}
              >
                <InputNumber style={{ width: '100%' }} step="0.1" min="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="允许负偏差"
                name="allowableNegativeDeviation"
                rules={[{ required: true, message: '请输入允许负偏差' }]}
              >
                <InputNumber style={{ width: '100%' }} step="0.1" min="0" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="单位"
                name="unit"
                rules={[{ required: true, message: '请输入单位' }]}
              >
                <Select placeholder="请选择单位">
                  <Option value="mm">mm</Option>
                  <Option value="度">度</Option>
                  <Option value="%">%</Option>
                  <Option value="cm">cm</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="规范编号"
                name="standardCode"
                rules={[{ required: true, message: '请输入规范编号' }]}
              >
                <Input placeholder="如：GB50210-2018" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="是否需要照片佐证"
                name="requirePhoto"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item className="!mb-0">
            <Space className="w-full justify-end">
              <Button
                onClick={() => {
                  setItemModalOpen(false);
                  setEditingItem(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;
