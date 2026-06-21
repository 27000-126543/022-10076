import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1E40AF',
          colorSuccess: '#059669',
          colorWarning: '#D97706',
          colorError: '#DC2626',
          colorInfo: '#1E40AF',
          borderRadius: 4,
          fontFamily:
            '"Microsoft YaHei", "PingFang SC", system-ui, sans-serif',
        },
        components: {
          Layout: {
            headerBg: '#1E40AF',
            siderBg: '#1F2937',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: '#1E40AF',
            darkItemHoverBg: '#374151',
          },
          Table: {
            headerBg: '#F3F4F6',
            rowHoverBg: '#EFF6FF',
            borderColor: '#E5E7EB',
          },
          Button: {
            controlHeight: 32,
            borderRadius: 4,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>
);
