import type { MarketDataSource } from "../data-source";
import { mockDataSource } from "./mock";
import { tencentDataSource } from "./tencent";
// 未来接入其他真实数据源时，在此注册，例如：
// import { twelveDataSource } from "./twelvedata";

const registry: Record<string, MarketDataSource> = {
  tencent: tencentDataSource,
  mock: mockDataSource,
  // twelvedata: twelveDataSource,
};

/**
 * 按 DATA_SOURCE 环境变量选择数据源（默认 tencent 实时行情）。
 * API Key 等敏感配置只在服务端读取，绝不暴露给浏览器。
 */
export function getDataSource(): MarketDataSource {
  const id = process.env.DATA_SOURCE ?? "tencent";
  const ds = registry[id];
  if (!ds) {
    throw new Error(`未知数据源 DATA_SOURCE=${id}`);
  }
  return ds;
}
