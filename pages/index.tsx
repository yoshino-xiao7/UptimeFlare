import Head from 'next/head'

import { Inter } from 'next/font/google'
import { MonitorTarget } from '@/types/config'
import { maintenances, pageConfig, workerConfig } from '@/uptime.config'
import OverallStatus from '@/components/OverallStatus'
import Header from '@/components/Header'
import MonitorList from '@/components/MonitorList'
import { Center, Text, Alert, Button } from '@mantine/core'
import MonitorDetail from '@/components/MonitorDetail'
import Footer from '@/components/Footer'
import { useTranslation } from 'react-i18next'
import { CompactedMonitorStateWrapper, getFromStore } from '@/worker/src/store'
import { useEffect, useState, useCallback } from 'react'
import { IconAlertTriangle } from '@tabler/icons-react'

export const runtime = 'experimental-edge'
const inter = Inter({ subsets: ['latin'] })

// 静默刷新间隔（毫秒）- 60秒
const REFRESH_INTERVAL = 60000

// 检测浏览器兼容性
function checkBrowserCompatibility(): boolean {
  if (typeof window === 'undefined') return true

  try {
    // 检测基本的现代浏览器特性
    const hasPromise = typeof Promise !== 'undefined'
    const hasFetch = typeof fetch !== 'undefined'
    const hasAsyncAwait = (function () {
      try {
        new Function('async () => {}')
        return true
      } catch (e) {
        return false
      }
    })()

    return hasPromise && hasFetch && hasAsyncAwait
  } catch (e) {
    return false
  }
}

export default function Home({
  compactedStateStr: initialStateStr,
  monitors,
}: {
  compactedStateStr: string
  monitors: MonitorTarget[]
  tooltip?: string
  statusPageLink?: string
}) {
  const { t } = useTranslation('common')
  const [monitorId, setMonitorId] = useState<string>('')
  const [compactedStateStr, setCompactedStateStr] = useState(initialStateStr)
  const [isCompatible, setIsCompatible] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  let state = new CompactedMonitorStateWrapper(compactedStateStr).uncompact()

  // 检测浏览器兼容性
  useEffect(() => {
    setIsCompatible(checkBrowserCompatibility())
  }, [])

  // 客户端获取 hash（SSR 兼容）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMonitorId(window.location.hash.substring(1))
    }
  }, [])

  // 静默刷新函数
  const silentRefresh = useCallback(async () => {
    if (typeof window === 'undefined') return

    try {
      // 获取页面最新数据
      const response = await fetch(window.location.pathname, {
        cache: 'no-store',
        headers: { 'Accept': 'text/html' }
      })

      if (response.ok) {
        const html = await response.text()
        // 从 __NEXT_DATA__ 中提取最新状态
        const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
        if (scriptMatch && scriptMatch[1]) {
          try {
            const nextData = JSON.parse(scriptMatch[1])
            const newStateStr = nextData?.props?.pageProps?.compactedStateStr
            if (newStateStr && newStateStr !== compactedStateStr) {
              setCompactedStateStr(newStateStr)
              setLastRefresh(Date.now())
            }
          } catch (parseError) {
            // 解析失败，静默忽略
          }
        }
      }
    } catch (error) {
      // 网络错误，静默忽略
    }
  }, [compactedStateStr])

  // 设置定时刷新
  useEffect(() => {
    if (typeof window === 'undefined') return

    const interval = setInterval(silentRefresh, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [silentRefresh])

  // 浏览器不兼容提示
  if (!isCompatible) {
    return (
      <>
        <Head>
          <title>{pageConfig.title}</title>
          <link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} />
        </Head>
        <main className={inter.className}>
          <Center style={{ minHeight: '100vh', padding: '20px' }}>
            <Alert
              icon={<IconAlertTriangle size={24} />}
              title="浏览器版本过低"
              color="orange"
              style={{ maxWidth: '400px' }}
            >
              <Text size="sm" mb="md">
                您的浏览器版本不支持此页面的部分功能。为了获得最佳体验，请：
              </Text>
              <Text size="sm" mb="xs">• 升级您的浏览器到最新版本</Text>
              <Text size="sm" mb="xs">• 或使用 Chrome、Firefox、Safari 等主流浏览器访问</Text>
              <Button
                mt="md"
                variant="light"
                color="orange"
                onClick={() => window.location.reload()}
              >
                刷新重试
              </Button>
            </Alert>
          </Center>
        </main>
      </>
    )
  }

  // Specify monitorId in URL hash to view a specific monitor (can be used in iframe)
  if (monitorId) {
    const monitor = monitors.find((monitor) => monitor.id === monitorId)
    if (!monitor || !state) {
      return <Text fw={700}>{t('Monitor not found', { id: monitorId })}</Text>
    }
    return (
      <div style={{ maxWidth: '810px' }}>
        <MonitorDetail monitor={monitor} state={state} />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>{pageConfig.title}</title>
        <link rel="icon" href={pageConfig.favicon ?? '/favicon.png'} />
      </Head>

      <main className={inter.className}>
        <Header />

        {state.lastUpdate === 0 ? (
          <Center>
            <Text fw={700}>{t('Monitor State not defined')}</Text>
          </Center>
        ) : (
          <div>
            <OverallStatus state={state} monitors={monitors} maintenances={maintenances} />
            <MonitorList monitors={monitors} state={state} />
          </div>
        )}

        <Footer />
      </main>
    </>
  )
}

export async function getServerSideProps() {
  // Read state as string from storage, to avoid hitting server-side cpu time limit
  const compactedStateStr = await getFromStore(process.env as any, 'state')

  // Only present these values to client
  const monitors = workerConfig.monitors.map((monitor) => {
    return {
      id: monitor.id,
      name: monitor.name,
      // @ts-ignore
      tooltip: monitor?.tooltip,
      // @ts-ignore
      statusPageLink: monitor?.statusPageLink,
      // @ts-ignore
      hideLatencyChart: monitor?.hideLatencyChart,
    }
  })

  return { props: { compactedStateStr, monitors } }
}
