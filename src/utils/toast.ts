import { message } from 'antd';

export const toast = {
  success: (content: string, duration = 2) => message.success({ content, duration }),
  info: (content: string, duration = 2) => message.info({ content, duration }),
  warning: (content: string, duration = 3) => message.warning({ content, duration }),
  error: (content: string, duration = 3) => message.error({ content, duration }),
};

export default toast;

