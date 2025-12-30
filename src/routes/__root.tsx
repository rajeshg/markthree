import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import Header from '../components/Header'
import { Sidebar } from '../components/layout/Sidebar'
import { ThemeProvider } from '../contexts/ThemeContext'
import { SettingsProvider } from '../contexts/SettingsContext'
import { SidebarProvider } from '../components/ui/sidebar'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'MarkThree v2',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
    scripts: [
      {
        src: 'https://accounts.google.com/gsi/client',
        async: true,
        defer: true,
      },
      {
        src: 'https://apis.google.com/js/api.js',
        async: true,
        defer: true,
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <SettingsProvider>
            <SidebarProvider defaultOpen>
              <Sidebar />
              <main className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Outlet />
                </div>
              </main>
            </SidebarProvider>
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
              ]}
            />
            <Scripts />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
