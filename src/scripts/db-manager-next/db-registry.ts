export interface DBConfig {
  name: string
  dbName: string
  user: string
  host: string
  port?: string
  password?: string
}

export interface DBPair {
  name: string
  local: DBConfig
  production: DBConfig
}

export const databaseRegistry: Record<string, DBPair> = {
  portfolio: {
    name: 'Portfolio',
    local: {
      name: 'Local Portfolio',
      dbName: 'user',
      user: 'user',
      host: 'localhost',
    },
    production: {
      name: 'Production Portfolio',
      dbName: 'user',
      user: 'user',
      host: 'shinkansen.proxy.rlwy.net',
      port: '55719',
      password: 'user',
    },
  },
}

export const defaultSettings = {
  maxConnections: 10,
  statementTimeout: '15s',
  idleTransactionTimeout: '2min',
  idleSessionTimeout: '3min',
  masterIdleTimeout: '5min',
  tcpKeepalivesIdle: 60,
  tcpKeepalivesInterval: 30,
  tcpKeepalivesCount: 3,
  appUser: 'payload',
  appPass: 'payload',
}
