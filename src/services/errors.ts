// ABOUTME: 第三方 Token 失效的统一错误类型，供 UI 识别并引导用户重新授权

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}
