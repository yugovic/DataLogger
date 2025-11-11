/* Simple logger that can be swapped later */
const isDev = import.meta && import.meta.env && import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    // always print errors in dev; silence in prod if needed
    console.error(...args);
  },
};

export default logger;

