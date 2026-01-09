import { RootLayout } from '../layouts/root'

export const LoginPage = (props: { error?: string, redirectTo?: string }) => {
  const { error, redirectTo } = props
  
  const discordLoginUrl = redirectTo 
    ? `/auth/discord?redirect_to=${encodeURIComponent(redirectTo)}` 
    : '/auth/discord'

  return (
    <RootLayout>
      <div class="relative min-h-screen flex flex-col justify-center overflow-hidden bg-gray-50 py-6 sm:py-12">
        {/* 背景エフェクト */}
        <div class="absolute top-0 right-0 -mr-20 -mt-20 w-[800px] h-[800px] bg-gradient-to-br from-red-400 via-purple-500 to-orange-300 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        
        {/* カード */}
        <div class="relative z-10 bg-white px-10 py-12 shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-xl w-full">
          <div class="mx-auto max-w-md">
            <h1 class="text-3xl font-serif font-bold text-slate-900 mb-2">Welcome Back</h1>
            <p class="text-slate-500 mb-8">Sign in to access HSS Science Node.</p>

            {error && (
              <div class="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">
                {error}
              </div>
            )}

            <a
              href={discordLoginUrl}
              class="flex items-center justify-center w-full bg-slate-900 text-white px-6 py-3.5 rounded-full font-medium hover:bg-slate-800 transition-all hover:shadow-lg"
            >
              Continue with Discord
            </a>
          </div>
        </div>
      </div>
    </RootLayout>
  )
}
