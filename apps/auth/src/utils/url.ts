import { env, PORTS } from '@hss/config';

const ALLOWED_REDIRECT_HOSTS = [
  'localhost',
  '.localhost',
];

if (env.HSS_COOKIE_DOMAIN) {
  ALLOWED_REDIRECT_HOSTS.push(env.HSS_COOKIE_DOMAIN);
  // Also allow the bare domain if it starts with dot
  if (env.HSS_COOKIE_DOMAIN.startsWith('.')) {
    ALLOWED_REDIRECT_HOSTS.push(env.HSS_COOKIE_DOMAIN.slice(1));
  }
}

/**
 * リダイレクトURLが許可されたドメインかどうかを検証する
 * @param url 検証するURL文字列
 * @returns 検証済みのURL、またはnull
 */
export function validateRedirectUrl(url: string | undefined | null): string | null {
  if (!url) return null

  try {
    const validUrl = new URL(url)
    const hostname = validUrl.hostname

    // ホスト名の検証
    const isAllowed = ALLOWED_REDIRECT_HOSTS.some((allowed: string) => {
      if (allowed.startsWith('.')) {
        return hostname.endsWith(allowed) || hostname === allowed.slice(1)
      }
      return hostname === allowed
    })

    if (isAllowed) {
      return url
    }
  } catch (e) {
    // URLパースエラーの場合は無効とみなす
    return null
  }

  return null
}

/**
 * デフォルトのリダイレクトURLを取得 (環境変数または安全なデフォルト)
 */
export function getDefaultRedirectUrl(): string {
  // 環境変数から取得するか、システムのルートへ
  if (process.env.DRIVE_URL) return process.env.DRIVE_URL;

  const protocol = env.NODE_ENV === 'production' ? 'https' : 'http';
  
  // localhostの場合はポートを含める (Webのポートへ)
  if (env.HSS_DOMAIN === 'localhost') {
    return `${protocol}://${env.HSS_DOMAIN}`;
  }

  // 本番環境などはドメイン直下 (例: https://hss-science.org)
  return `${protocol}://${env.HSS_DOMAIN}`;
}
