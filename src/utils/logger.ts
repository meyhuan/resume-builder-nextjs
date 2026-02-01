/**
 * Simple logger utility for elegant console logging with styles
 */
const COLORS = {
  info: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  debug: '#6b7280',
};

const getStyle = (type: keyof typeof COLORS) => 
  `background: ${COLORS[type]}; color: #fff; padding: 2px 4px; border-radius: 3px; font-weight: bold;`;

export const logger = {
  info: (module: string, message: string, ...args: unknown[]) => {
    console.log(`%c${module}%c ${message}`, getStyle('info'), '', ...args);
  },
  success: (module: string, message: string, ...args: unknown[]) => {
    console.log(`%c${module}%c ${message}`, getStyle('success'), '', ...args);
  },
  warning: (module: string, message: string, ...args: unknown[]) => {
    console.warn(`%c${module}%c ${message}`, getStyle('warning'), '', ...args);
  },
  error: (module: string, message: string, ...args: unknown[]) => {
    console.error(`%c${module}%c ${message}`, getStyle('error'), '', ...args);
  },
  debug: (module: string, message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`%c${module}%c ${message}`, getStyle('debug'), '', ...args);
    }
  },
};
