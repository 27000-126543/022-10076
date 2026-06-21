import React, { useState, useEffect } from 'react';
import { Layout, Menu, theme, Typography, Badge, Button } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  HardHat,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { useDataStore } from '../../store';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const [collapsed, setCollapsed] = useState(false);
  const statistics = useDataStore((state) => state.statistics);
  const fetchAllData = useDataStore((state) => state.fetchAllData);
  const loading = useDataStore((state) => state.loading);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const menuItems = [
    {
      key: '/',
      icon: <FileText size={18} />,
      label: '导入校对',
    },
    {
      key: '/retest',
      icon: (
        <Badge count={statistics.pendingRetest} size="small">
          <AlertTriangle size={18} />
        </Badge>
      ),
      label: '补测清单',
    },
    {
      key: '/reports',
      icon: <FileSpreadsheet size={18} />,
      label: '报表生成',
    },
    {
      key: '/settings',
      icon: <Settings size={18} />,
      label: '系统设置',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleRefresh = () => {
    fetchAllData();
  };

  return (
    <Layout className="min-h-screen">
      <Header
        className="flex items-center justify-between px-6"
        style={{
          background: 'linear-gradient(90deg, #1E3A8A 0%, #1E40AF 100%)',
          height: 64,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-lg">
            <HardHat className="text-white" size={28} />
          </div>
          <div>
            <Title level={4} className="!text-white !m-0 !font-bold">
              质量实测实量管理系统
            </Title>
            <p className="text-blue-200 text-xs !m-0">离线桌面客户端</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <div className="text-white text-xl font-bold">
                {statistics.total}
              </div>
              <div className="text-blue-200 text-xs">总测点</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <div className="text-green-400 text-xl font-bold">
                {statistics.passRate}%
              </div>
              <div className="text-blue-200 text-xs">合格率</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <div className="text-red-400 text-xl font-bold">
                {statistics.abnormal}
              </div>
              <div className="text-blue-200 text-xs">异常值</div>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <div className="text-orange-400 text-xl font-bold">
                {statistics.pendingRetest}
              </div>
              <div className="text-blue-200 text-xs">待补测</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="text"
              icon={<RefreshCw size={16} className="text-white" />}
              onClick={handleRefresh}
              loading={loading}
              className="hover:!bg-white/10"
            />
            <Button
              type="text"
              icon={<Bell size={16} className="text-white" />}
              className="hover:!bg-white/10"
            />
          </div>
        </div>
      </Header>
      <Layout>
        <Sider
          width={220}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          style={{
            background: '#1F2937',
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            className="!border-r-0 !bg-transparent !mt-4"
            style={{
              background: '#1F2937',
            }}
          />
        </Sider>
        <Content
          className="p-6"
          style={{
            background: '#F3F4F6',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          <div
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: '100%',
            }}
            className="shadow-sm"
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
