import React, { useState, useMemo } from 'react';
import {
  Typography,
  Tabs,
  Form,
  Select,
  DatePicker,
  Button,
  Table,
  Tag,
  Space,
  Card,
  Row,
  Col,
  Statistic,
  Tooltip,
  Alert,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  FileSpreadsheet,
  Home,
  Building2,
  AlertTriangle,
  Download,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar,
  Clock,
} from 'lucide-react';
import { useDataStore, useReportStore } from '../store';
import {
  exportHouseholdReport,
  exportFloorSummary,
  exportRectificationLedger,
} from '../utils/excel';
import type {
  HouseholdReportData,
  FloorSummaryData,
  RectificationRecord,
  ReportType,
} from '../types';
import { formatDate, formatDeviation } from '../utils';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ReportGeneratePage: React.FC = () => {
  const { points } = useDataStore();
  const {
    householdReport,
    floorSummary,
    rectificationLedger,
    generating,
    filter,
    setFilter,
    generateHouseholdReport,
    generateFloorSummary,
    generateRectificationLedger,
  } = useReportStore();

  const [activeTab, setActiveTab] = useState<ReportType>('household');
  const [form] = Form.useForm();

  const buildings = useMemo(() => {
    const uniqueBuildings = new Map<string, string>();
    points.forEach((p) => {
      uniqueBuildings.set(p.buildingId, p.buildingName);
    });
    return Array.from(uniqueBuildings.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [points]);

  const floors = useMemo(() => {
    if (!filter.buildingId) return [];
    const uniqueFloors = new Map<string, string>();
    points
      .filter((p) => p.buildingId === filter.buildingId)
      .forEach((p) => {
        uniqueFloors.set(p.floorId, p.floorName);
      });
    return Array.from(uniqueFloors.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [points, filter.buildingId]);

  const rooms = useMemo(() => {
    if (!filter.floorId) return [];
    const uniqueRooms = new Map<string, string>();
    points
      .filter((p) => p.floorId === filter.floorId)
      .forEach((p) => {
        uniqueRooms.set(p.roomId, p.roomNumber);
      });
    return Array.from(uniqueRooms.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [points, filter.floorId]);

  const handleGenerate = async () => {
    switch (activeTab) {
      case 'household':
        await generateHouseholdReport();
        break;
      case 'floor_summary':
        await generateFloorSummary();
        break;
      case 'rectification':
        await generateRectificationLedger();
        break;
    }
    message.success('报表生成成功');
  };

  const handleExport = () => {
    const dateStr = new Date().toLocaleDateString();
    switch (activeTab) {
      case 'household':
        if (householdReport.length === 0) {
          message.warning('暂无数据可导出');
          return;
        }
        exportHouseholdReport(householdReport, `分户实测表_${dateStr}`);
        message.success('导出成功');
        break;
      case 'floor_summary':
        if (floorSummary.length === 0) {
          message.warning('暂无数据可导出');
          return;
        }
        exportFloorSummary(floorSummary, `楼层汇总表_${dateStr}`);
        message.success('导出成功');
        break;
      case 'rectification':
        if (rectificationLedger.length === 0) {
          message.warning('暂无数据可导出');
          return;
        }
        exportRectificationLedger(
          rectificationLedger,
          `质量整改台账_${dateStr}`
        );
        message.success('导出成功');
        break;
    }
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as ReportType);
  };

  const householdColumns: ColumnsType<HouseholdReportData> = [
    {
      title: '楼栋',
      dataIndex: 'buildingName',
      key: 'buildingName',
      width: 80,
      fixed: 'left',
    },
    {
      title: '楼层',
      dataIndex: 'floorName',
      key: 'floorName',
      width: 70,
    },
    {
      title: '房间号',
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
      title: '测点编号',
      dataIndex: 'pointNumber',
      key: 'pointNumber',
      width: 200,
    },
    {
      title: '设计值(mm)',
      dataIndex: 'designValue',
      key: 'designValue',
      width: 100,
      align: 'right',
    },
    {
      title: '实测值(mm)',
      dataIndex: 'measuredValue',
      key: 'measuredValue',
      width: 100,
      align: 'right',
      render: (val, record) => (
        <Text strong className={record.isAbnormal ? 'text-red-600' : ''}>
          {val}
        </Text>
      ),
    },
    {
      title: '允许正偏差(mm)',
      dataIndex: 'allowablePositiveDeviation',
      key: 'allowablePositiveDeviation',
      width: 110,
      align: 'right',
    },
    {
      title: '允许负偏差(mm)',
      dataIndex: 'allowableNegativeDeviation',
      key: 'allowableNegativeDeviation',
      width: 110,
      align: 'right',
    },
    {
      title: '偏差值(mm)',
      dataIndex: 'deviation',
      key: 'deviation',
      width: 90,
      align: 'right',
      render: (val, record) => (
        <Text
          strong
          className={`font-mono ${record.isAbnormal ? 'text-red-600' : ''}`}
        >
          {formatDeviation(val)}
        </Text>
      ),
    },
    {
      title: '是否合格',
      key: 'isQualified',
      width: 80,
      align: 'center',
      render: (_, record) =>
        record.isAbnormal ? (
          <Tag color="red" icon={<XCircle size={12} />}>
            不合格
          </Tag>
        ) : (
          <Tag color="green" icon={<CheckCircle size={12} />}>
            合格
          </Tag>
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
  ];

  const floorSummaryColumns: ColumnsType<FloorSummaryData> = [
    {
      title: '楼栋',
      dataIndex: 'buildingName',
      key: 'buildingName',
      width: 80,
      fixed: 'left',
    },
    {
      title: '楼层',
      dataIndex: 'floorName',
      key: 'floorName',
      width: 70,
    },
    {
      title: '检查项',
      dataIndex: 'inspectionItemName',
      key: 'inspectionItemName',
      width: 120,
    },
    {
      title: '实测点数',
      dataIndex: 'totalPoints',
      key: 'totalPoints',
      width: 90,
      align: 'right',
    },
    {
      title: '合格点数',
      dataIndex: 'qualifiedPoints',
      key: 'qualifiedPoints',
      width: 90,
      align: 'right',
    },
    {
      title: '合格率(%)',
      dataIndex: 'passRate',
      key: 'passRate',
      width: 100,
      align: 'right',
      render: (val) => (
        <Text
          strong
          className={val >= 90 ? 'text-green-600' : val >= 80 ? 'text-orange-600' : 'text-red-600'}
        >
          {val.toFixed(2)}%
        </Text>
      ),
    },
    {
      title: '最大偏差(mm)',
      dataIndex: 'maxDeviation',
      key: 'maxDeviation',
      width: 110,
      align: 'right',
      render: (val) => <Text className="font-mono">{formatDeviation(val)}</Text>,
    },
    {
      title: '最小偏差(mm)',
      dataIndex: 'minDeviation',
      key: 'minDeviation',
      width: 110,
      align: 'right',
      render: (val) => <Text className="font-mono">{formatDeviation(val)}</Text>,
    },
    {
      title: '平均偏差(mm)',
      dataIndex: 'avgDeviation',
      key: 'avgDeviation',
      width: 110,
      align: 'right',
      render: (val) => <Text className="font-mono">{val.toFixed(2)}</Text>,
    },
  ];

  const rectificationColumns: ColumnsType<RectificationRecord> = [
    {
      title: '测点编号',
      dataIndex: 'pointNumber',
      key: 'pointNumber',
      width: 200,
      fixed: 'left',
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
      title: '房间号',
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
      title: '问题描述',
      dataIndex: 'problem',
      key: 'problem',
      width: 200,
      ellipsis: true,
    },
    {
      title: '偏差值(mm)',
      dataIndex: 'deviation',
      key: 'deviation',
      width: 100,
      align: 'right',
      render: (val) => (
        <Text strong className="text-red-600 font-mono">
          {formatDeviation(val)}
        </Text>
      ),
    },
    {
      title: '允许偏差',
      dataIndex: 'allowableDeviation',
      key: 'allowableDeviation',
      width: 100,
    },
    {
      title: '整改要求',
      dataIndex: 'rectificationRequirement',
      key: 'rectificationRequirement',
      width: 250,
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
      width: 100,
      render: (val) => formatDate(val),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const colorMap: Record<string, string> = {
          待处理: 'default',
          待补测: 'orange',
          待整改: 'red',
          已整改待复核: 'blue',
          已完成: 'green',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 150,
      ellipsis: true,
    },
  ];

  const getReportData = () => {
    switch (activeTab) {
      case 'household':
        return householdReport;
      case 'floor_summary':
        return floorSummary;
      case 'rectification':
        return rectificationLedger;
      default:
        return [];
    }
  };

  const getColumns = () => {
    switch (activeTab) {
      case 'household':
        return householdColumns;
      case 'floor_summary':
        return floorSummaryColumns;
      case 'rectification':
        return rectificationColumns;
      default:
        return [];
    }
  };

  const reportData = getReportData();
  const columns = getColumns();

  const summaryStats = useMemo(() => {
    if (activeTab === 'floor_summary' && floorSummary.length > 0) {
      const totalPoints = floorSummary.reduce((sum, item) => sum + item.totalPoints, 0);
      const qualifiedPoints = floorSummary.reduce((sum, item) => sum + item.qualifiedPoints, 0);
      const avgPassRate = totalPoints > 0 ? (qualifiedPoints / totalPoints) * 100 : 0;
      const maxDeviation = Math.max(...floorSummary.map((item) => item.maxDeviation));
      const minDeviation = Math.min(...floorSummary.map((item) => item.minDeviation));
      return { totalPoints, qualifiedPoints, avgPassRate, maxDeviation, minDeviation };
    }
    if (activeTab === 'rectification') {
      const pendingCount = rectificationLedger.filter((item) => item.status === '待处理' || item.status === '待补测' || item.status === '待整改').length;
      const completedCount = rectificationLedger.filter((item) => item.status === '已完成').length;
      return { total: rectificationLedger.length, pending: pendingCount, completed: completedCount };
    }
    if (activeTab === 'household') {
      const qualifiedCount = householdReport.filter((item) => !item.isAbnormal).length;
      const unqualifiedCount = householdReport.filter((item) => item.isAbnormal).length;
      return { total: householdReport.length, qualified: qualifiedCount, unqualified: unqualifiedCount };
    }
    return null;
  }, [activeTab, householdReport, floorSummary, rectificationLedger]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Title level={4} className="!m-0">
            报表生成
          </Title>
          <FileSpreadsheet className="text-blue-600" size={24} />
        </div>
        <Space>
          <Button icon={<RefreshCw size={14} />} onClick={handleGenerate} loading={generating}>
            生成报表
          </Button>
          <Button
            type="primary"
            icon={<Download size={14} />}
            onClick={handleExport}
            disabled={reportData.length === 0}
          >
            导出Excel
          </Button>
        </Space>
      </div>

      <Card className="mb-6">
        <Form
          form={form}
          layout="inline"
          className="flex flex-wrap gap-4"
        >
          <Form.Item label="楼栋">
            <Select
              style={{ width: 150 }}
              placeholder="选择楼栋"
              allowClear
              value={filter.buildingId}
              onChange={(value) => {
                setFilter({ buildingId: value, floorId: undefined, roomId: undefined });
                form.setFieldsValue({ floorId: undefined, roomId: undefined });
              }}
            >
              {buildings.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="楼层">
            <Select
              style={{ width: 120 }}
              placeholder="选择楼层"
              allowClear
              value={filter.floorId}
              disabled={!filter.buildingId}
              onChange={(value) => {
                setFilter({ floorId: value, roomId: undefined });
                form.setFieldsValue({ roomId: undefined });
              }}
            >
              {floors.map((f) => (
                <Option key={f.id} value={f.id}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="房间">
            <Select
              style={{ width: 120 }}
              placeholder="选择房间"
              allowClear
              value={filter.roomId}
              disabled={!filter.floorId}
              onChange={(value) => setFilter({ roomId: value })}
            >
              {rooms.map((r) => (
                <Option key={r.id} value={r.id}>
                  {r.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="时间范围">
            <RangePicker
              format="YYYY-MM-DD"
              value={filter.startDate && filter.endDate ? [dayjs(filter.startDate), dayjs(filter.endDate)] : null}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setFilter({
                    startDate: dates[0].format('YYYY-MM-DD'),
                    endDate: dates[1].format('YYYY-MM-DD'),
                  });
                } else {
                  setFilter({ startDate: undefined, endDate: undefined });
                }
              }}
            />
          </Form.Item>
          <Form.Item>
            <Button
              icon={<Filter size={14} />}
              onClick={() => setFilter({ buildingId: undefined, floorId: undefined, roomId: undefined, startDate: undefined, endDate: undefined })}
            >
              重置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Alert
        message="报表说明"
        description="分户实测表按房间展示所有已通过校对的测点数据；楼层汇总表按楼层和检查项统计合格率；质量整改台账列出所有需要整改的问题点。"
        type="info"
        showIcon
        className="mb-6"
      />

      {summaryStats && (
        <Row gutter={16} className="mb-6">
          {activeTab === 'household' && 'total' in summaryStats && (
            <>
              <Col span={8}>
                <Card className="!bg-blue-50">
                  <Statistic
                    title="实测点数"
                    value={summaryStats.total}
                    prefix={<Home size={18} className="text-blue-500" />}
                    valueStyle={{ color: '#2563EB' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card className="!bg-green-50">
                  <Statistic
                    title="合格点数"
                    value={summaryStats.qualified}
                    prefix={<CheckCircle size={18} className="text-green-500" />}
                    valueStyle={{ color: '#059669' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card className="!bg-red-50">
                  <Statistic
                    title="不合格点数"
                    value={summaryStats.unqualified}
                    prefix={<XCircle size={18} className="text-red-500" />}
                    valueStyle={{ color: '#DC2626' }}
                  />
                </Card>
              </Col>
            </>
          )}
          {activeTab === 'floor_summary' && 'totalPoints' in summaryStats && (
            <>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总测点"
                    value={summaryStats.totalPoints}
                    prefix={<Building2 size={18} className="text-blue-500" />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="合格点"
                    value={summaryStats.qualifiedPoints}
                    prefix={<CheckCircle size={18} className="text-green-500" />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="平均合格率"
                    value={summaryStats.avgPassRate.toFixed(2)}
                    suffix="%"
                    prefix={<TrendingUp size={18} className="text-orange-500" />}
                    valueStyle={{ color: '#D97706' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="偏差范围"
                    value={`${summaryStats.minDeviation}~${summaryStats.maxDeviation}`}
                    suffix="mm"
                    prefix={<Calendar size={18} className="text-purple-500" />}
                  />
                </Card>
              </Col>
            </>
          )}
          {activeTab === 'rectification' && 'total' in summaryStats && (
            <>
              <Col span={8}>
                <Card className="!bg-red-50">
                  <Statistic
                    title="需整改总数"
                    value={summaryStats.total}
                    prefix={<AlertTriangle size={18} className="text-red-500" />}
                    valueStyle={{ color: '#DC2626' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card className="!bg-orange-50">
                  <Statistic
                    title="待处理"
                    value={summaryStats.pending}
                    prefix={<Clock size={18} className="text-orange-500" />}
                    valueStyle={{ color: '#D97706' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card className="!bg-green-50">
                  <Statistic
                    title="已完成"
                    value={summaryStats.completed}
                    prefix={<CheckCircle size={18} className="text-green-500" />}
                    valueStyle={{ color: '#059669' }}
                  />
                </Card>
              </Col>
            </>
          )}
        </Row>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        className="mb-4"
        items={[
          {
            key: 'household',
            label: (
              <span className="flex items-center gap-2">
                <Home size={16} />
                分户实测表
              </span>
            ),
          },
          {
            key: 'floor_summary',
            label: (
              <span className="flex items-center gap-2">
                <Building2 size={16} />
                楼层汇总表
              </span>
            ),
          },
          {
            key: 'rectification',
            label: (
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} />
                质量整改台账
              </span>
            ),
          },
        ]}
      />

      <Table
        columns={columns as ColumnsType<any>}
        dataSource={reportData as any[]}
        rowKey={(record, index) =>
          `row-${index}-${JSON.stringify(record).slice(0, 20)}`
        }
        scroll={{ x: 1400, y: 500 }}
        size="small"
        bordered
        loading={generating}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条数据`,
        }}
        locale={{
          emptyText: (
            <div className="text-center py-12">
              <FileSpreadsheet size={48} className="text-gray-300 mx-auto mb-3" />
              <Text type="secondary">
                请点击"生成报表"按钮生成数据
              </Text>
            </div>
          ),
        }}
      />
    </div>
  );
};

export default ReportGeneratePage;
