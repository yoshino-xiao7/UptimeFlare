import { Text, Tooltip, Collapse, UnstyledButton, Group, Badge } from '@mantine/core'
import { MonitorState, MonitorTarget } from '@/types/config'
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import DetailChart from './DetailChart'
import DetailBar from './DetailBar'
import { getColor } from '@/util/color'
import { maintenances } from '@/uptime.config'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'

export default function MonitorDetail({
  monitor,
  state,
}: {
  monitor: MonitorTarget
  state: MonitorState
}) {
  const { t } = useTranslation('common')
  const [isExpanded, setIsExpanded] = useState(false)

  if (!state.latency[monitor.id])
    return (
      <>
        <Text mt="sm" fw={700}>
          {monitor.name}
        </Text>
        <Text mt="sm" fw={700}>
          {t('No data available')}
        </Text>
      </>
    )

  let statusIcon =
    state.incident[monitor.id].slice(-1)[0].end === undefined ? (
      <IconAlertCircle
        style={{ width: '1.25em', height: '1.25em', color: '#b91c1c', marginRight: '3px' }}
      />
    ) : (
      <IconCircleCheck
        style={{ width: '1.25em', height: '1.25em', color: '#059669', marginRight: '3px' }}
      />
    )

  // Hide real status icon if monitor is in maintenance
  const now = new Date()
  const hasMaintenance = maintenances
    .filter((m) => now >= new Date(m.start) && (!m.end || now <= new Date(m.end)))
    .find((maintenance) => maintenance.monitors?.includes(monitor.id))
  if (hasMaintenance)
    statusIcon = (
      <IconAlertTriangle
        style={{
          width: '1.25em',
          height: '1.25em',
          color: '#fab005',
          marginRight: '3px',
        }}
      />
    )

  let totalTime = Date.now() / 1000 - state.incident[monitor.id][0].start[0]
  let downTime = 0
  for (let incident of state.incident[monitor.id]) {
    downTime += (incident.end ?? Date.now() / 1000) - incident.start[0]
  }

  const uptimePercent = (((totalTime - downTime) / totalTime) * 100).toPrecision(4)

  // 计算平均响应时间和最新响应时间
  const latencyData = state.latency[monitor.id]
  const validLatencies = latencyData.filter(p => p.ping > 0).map(p => p.ping)
  const avgLatency = validLatencies.length > 0
    ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
    : 0
  const latestLatency = latencyData.length > 0 ? latencyData[latencyData.length - 1].ping : 0

  // Conditionally render monitor name with or without hyperlink based on monitor.url presence
  const monitorNameElement = (
    <Text mt="sm" fw={700} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {monitor.statusPageLink ? (
        <a
          href={monitor.statusPageLink}
          target="_blank"
          style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit' }}
        >
          {statusIcon} {monitor.name}
        </a>
      ) : (
        <>
          {statusIcon} {monitor.name}
        </>
      )}
    </Text>
  )

  const showChart = !monitor.hideLatencyChart

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {monitor.tooltip ? (
          <Tooltip label={monitor.tooltip}>{monitorNameElement}</Tooltip>
        ) : (
          monitorNameElement
        )}

        <Group gap="xs">
          {/* 收缩状态下显示简洁的响应时间 */}
          {showChart && !isExpanded && (
            <Group gap={4} style={{ transition: 'opacity 0.3s ease' }}>
              <Badge
                size="sm"
                variant="light"
                color={latestLatency > 500 ? 'red' : latestLatency > 200 ? 'yellow' : 'green'}
                style={{ fontWeight: 500 }}
              >
                {latestLatency}ms
              </Badge>
              <Badge size="sm" variant="outline" color="gray" style={{ fontWeight: 400 }}>
                平均 {avgLatency}ms
              </Badge>
            </Group>
          )}
          <Text mt="sm" fw={700} style={{ display: 'inline', color: getColor(uptimePercent, true) }}>
            {t('Overall', { percent: uptimePercent })}
          </Text>
        </Group>
      </div>

      {/* 可点击的状态条区域 */}
      {showChart ? (
        <UnstyledButton
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ width: '100%', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              transition: 'transform 0.3s ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}>
              <IconChevronRight size={16} style={{ color: '#666' }} />
            </div>
            <div style={{ flex: 1 }}>
              <DetailBar monitor={monitor} state={state} />
            </div>
          </div>
        </UnstyledButton>
      ) : (
        <DetailBar monitor={monitor} state={state} />
      )}

      {/* 带动画的可收缩图表 */}
      {showChart && (
        <Collapse in={isExpanded} transitionDuration={300} transitionTimingFunction="ease">
          <div style={{ paddingTop: '8px' }}>
            <DetailChart monitor={monitor} state={state} />
          </div>
        </Collapse>
      )}
    </>
  )
}
