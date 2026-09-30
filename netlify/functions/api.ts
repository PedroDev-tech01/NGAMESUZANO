import serverless from 'serverless-http';

let cachedHandler: any = null;

function normalizePath(event: any): any {
  const normalized = { ...event };
  const functionPrefix = '/.netlify/functions/api';
  const currentPath = String(event?.path || event?.rawPath || '');

  if (currentPath.startsWith(functionPrefix)) {
    const pathAfterFunction = currentPath.slice(functionPrefix.length) || '/';
    normalized.path = pathAfterFunction;
    normalized.rawPath = pathAfterFunction;
  }

  return normalized;
}

export const handler = async (event: any, context: any) => {
  if (!cachedHandler) {
    // Garante que server.ts seja carregado em modo serverless e nunca execute app.listen().
    process.env.NETLIFY_FUNCTION = 'true';
    const { app } = await import('../../server');
    cachedHandler = serverless(app);
  }

  return cachedHandler(normalizePath(event), context);
};
