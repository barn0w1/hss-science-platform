// 許可されたリダイレクト先のホスト名リスト
// サブドメインのワイルドカード判定などはここで行う
// 本番環境、開発環境で分ける
export const ALLOWED_REDIRECT_HOSTS = [
  'localhost',
  '.localhost', // サブドメイン許可 (e.g. drive.localhost)
  '.hss-science.org', // 本番ドメインのサブドメイン許可
  'hss-science.org',
] as const
