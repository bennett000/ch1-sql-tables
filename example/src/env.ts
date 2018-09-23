export const dbUser = process.env.DB_USER || 'sql-tables-example';
export const dbName = process.env.DB_NAME || 'sql-tables-example';
export const dbPass = process.env.DB_PASS || 'this-is-dev';
export const dbHost = process.env.DB_HOST || 'postgres';
export const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
export const apiPort = process.env.API_PORT ? parseInt(process.env.API_PORT, 10) || 8282;
