import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ImportVerifyPage from './pages/ImportVerifyPage';
import RetestListPage from './pages/RetestListPage';
import ReportGeneratePage from './pages/ReportGeneratePage';
import SettingsPage from './pages/SettingsPage';
import { initializeDatabase } from './db';
import { loadMockData, hasExistingData } from './utils/mockData';
import { useEffect, useState } from 'react';
import { Spin, Modal, Button, Typography } from 'antd';
import { Database, HardHat } from 'lucide-react';

const { Title, Text } = Typography;

function App() {
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      const hasData = await hasExistingData();
      if (!hasData) {
        setShowModal(true);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLoadDemo = async () => {
    setInitializing(true);
    try {
      await loadMockData();
      setShowModal(false);
      window.location.reload();
    } catch (error) {
      console.error('加载演示数据失败:', error);
    } finally {
      setInitializing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">系统初始化中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Modal
        open={showModal}
        title={
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <HardHat className="text-blue-600" size={28} />
            </div>
            <div>
              <Title level={4} className="!m-0">
                欢迎使用质量实测实量管理系统
              </Title>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full">
            <Text type="secondary">首次使用？</Text>
            <div className="flex gap-2">
              <Button onClick={() => setShowModal(false)}>
                直接使用
              </Button>
              <Button
                type="primary"
                icon={<Database size={14} />}
                onClick={handleLoadDemo}
                loading={initializing}
              >
                加载演示数据
              </Button>
            </div>
          </div>
        }
        closable={false}
        maskClosable={false}
        width={600}
      >
        <div className="py-4">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <Text strong className="text-blue-800 block mb-2">
              系统说明
            </Text>
            <Text type="secondary" className="block mb-1">
              本系统专为建筑工地资料员和质量员设计，支持：
            </Text>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>拖拽导入 Excel/CSV 测量表格</li>
              <li>自动按楼栋、楼层、房间、检查项分类</li>
              <li>智能检测异常值、缺失照片、重复点位</li>
              <li>生成补测清单和整改台账</li>
              <li>一键生成分户表、汇总表、整改台账</li>
            </ul>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <Text strong className="text-orange-800 block mb-2">
              <Database size={16} className="inline mr-2" />
              数据存储说明
            </Text>
            <Text type="secondary">
              本系统为离线客户端，所有数据存储在本地浏览器中。
              建议定期导出数据备份，防止数据丢失。
            </Text>
          </div>
        </div>
      </Modal>

      <Router>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<ImportVerifyPage />} />
            <Route path="/retest" element={<RetestListPage />} />
            <Route path="/reports" element={<ReportGeneratePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
