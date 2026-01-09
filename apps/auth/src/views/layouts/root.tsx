import type { FC, PropsWithChildren } from 'hono/jsx'

export const RootLayout: FC<PropsWithChildren> = (props) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>HSS Science</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Merriweather:wght@700&display=swap"
        rel="stylesheet"
      />
    </head>
    <body class="bg-gray-50 text-slate-900 font-sans antialiased">
      {props.children}
    </body>
  </html>
)
