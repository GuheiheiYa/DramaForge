/** 后端 API 根地址 — 默认端口 7790，与 backend/app/config.py 中 API_PORT 一致 */
export const DEFAULT_API_PORT = 7790;

export const API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ?? `http://localhost:${DEFAULT_API_PORT}`;

export const API_BASE = `${API_ORIGIN}/api/v1`;
