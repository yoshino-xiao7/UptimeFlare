import Head from 'next/head'

import { Inter } from 'next/font/google'
import { MonitorTarget } from '@/types/config'
import { maintenances, pageConfig, workerConfig } from '@/uptime.config'
import OverallStatus from '@/components/OverallStatus'
import Header from '@/components/Header'
import MonitorList from '@/components/MonitorList'
import { Center, Text } from '@mantine/core'
import MonitorDetail from '@/components/MonitorDetail'
import Footer from '@/components/Footer'
import { useTranslation } from 'react-i18next'
import { CompactedMonitorStateWrapper, getFromStore } from '@/worker/src/store'
import { useEffect, useState, useCallback } from 'react'

export const runtime = 'experimental-edge'
const inter = Inter({ subsets: ['latin'] })

// 静默刷新间隔（毫秒）
const REFRESH_INTERVAL = 60000

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
  const [compactedStateStr, setCompactedStateStr] = useState(initialStateStr)
  const [isRefreshing, setIsRefreshing] = useState(false)

  let state = new CompactedMonitorStateWrapper(compactedStateStr).uncompact()

  // 静默刷新函数
  const silentRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const response = await fetch('/api/data')
      if (response.ok) {
        // 获取完整状态需要重新请求页面数据
        const pageResponse = await fetch(window.location.href, {
          headers: { 'Accept': 'text/html' }
        })
        if (pageResponse.ok) {
          // 使用 Next.js 的软刷新
          const html = await pageResponse.text()
          const match = html.match(/__NEXT_DATA__.*?>(.*?)<\/script>/)
          if (match) {
            try {
              const nextData = JSON.parse(match[1])
              if (nextData.props?.pageProps?.compactedStateStr) {
                setCompactedStateStr(nextData.props.pageProps.compactedStateStr)
              }
            } catch (e) {
              console.log('Silent refresh: parse error')
            }
          }
        }
      }
    } catch (error) {
      console.log('Silent refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // 设置定时刷新
  useEffect(() => {
    const interval = setInterval(silentRefresh, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [silentRefresh])

  // Specify monitorId in URL hash to view a specific monitor (can be used in iframe)
  const monitorId = window.location.hash.substring(1)
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
          <div style={{ transition: 'opacity 0.3s ease', opacity: isRefreshing ? 0.8 : 1 }}>
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

