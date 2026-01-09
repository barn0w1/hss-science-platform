import { ALLOWED_REDIRECT_HOSTS } from '../config/allowed-origins'

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
  // 環境変数から取得するか、ハードコードされたデフォルトを返す
  return process.env.DRIVE_URL || 'http://drive.localhost'
}
