import { MonitorState, MonitorTarget } from '@/types/config'
import { Accordion, Card, Center, Text, Box } from '@mantine/core'
import MonitorDetail from './MonitorDetail'
import { pageConfig } from '@/uptime.config'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// 透明玻璃卡片样式
const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  padding: '12px 16px',
  marginBottom: '12px',
}

// 暗色模式下的玻璃卡片样式
const glassCardStyleDark: React.CSSProperties = {
  ...glassCardStyle,
  background: 'rgba(30, 30, 30, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
}

function countDownCount(state: MonitorState, ids: string[]) {
  let downCount = 0
  for (let id of ids) {
    if (state.incident[id] === undefined || state.incident[id].length === 0) {
      continue
    }

    if (state.incident[id].slice(-1)[0].end === undefined) {
      downCount++
    }
  }
  return downCount
}

function getStatusTextColor(state: MonitorState, ids: string[]) {
  let downCount = countDownCount(state, ids)
  if (downCount === 0) {
    return '#059669'
  } else if (downCount === ids.length) {
    return '#df484a'
  } else {
    return '#f29030'
  }
}

export default function MonitorList({
  monitors,
  state,
}: {
  monitors: MonitorTarget[]
  state: MonitorState
}) {
  const { t } = useTranslation('common')
  const group = pageConfig.group
  const groupedMonitor = group && Object.keys(group).length > 0
  let content

  // Load expanded groups from localStorage
  const savedExpandedGroups = localStorage.getItem('expandedGroups')
  const expandedInitial = savedExpandedGroups
    ? JSON.parse(savedExpandedGroups)
    : Object.keys(group || {})
  const [expandedGroups, setExpandedGroups] = useState<string[]>(expandedInitial)
  useEffect(() => {
    localStorage.setItem('expandedGroups', JSON.stringify(expandedGroups))
  }, [expandedGroups])

  // 单个监控卡片组件
  const MonitorCard = ({ monitor }: { monitor: MonitorTarget }) => (
    <Box
      style={glassCardStyle}
      className="glass-card"
    >
      <MonitorDetail monitor={monitor} state={state} />
    </Box>
  )

  if (groupedMonitor) {
    // Grouped monitors
    content = (
      <Accordion
        multiple
        defaultValue={Object.keys(group)}
        variant="separated"
        value={expandedGroups}
        onChange={(values) => setExpandedGroups(values)}
        styles={{
          item: {
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            marginBottom: '12px',
          },
          control: {
            borderRadius: '12px',
          },
          panel: {
            padding: '8px',
          }
        }}
      >
        {Object.keys(group).map((groupName) => (
          <Accordion.Item key={groupName} value={groupName}>
            <Accordion.Control>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  alignItems: 'center',
                }}
              >
                <div>{groupName}</div>
                <Text
                  fw={500}
                  style={{
                    display: 'inline',
                    paddingRight: '5px',
                    color: getStatusTextColor(state, group[groupName]),
                  }}
                >
                  {group[groupName].length - countDownCount(state, group[groupName])}/
                  {group[groupName].length} {t('Operational')}
                </Text>
              </div>
            </Accordion.Control>
            <Accordion.Panel>
              {monitors
                .filter((monitor) => group[groupName].includes(monitor.id))
                .sort((a, b) => group[groupName].indexOf(a.id) - group[groupName].indexOf(b.id))
                .map((monitor) => (
                  <MonitorCard key={monitor.id} monitor={monitor} />
                ))}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    )
  } else {
    // Ungrouped monitors - 每个监控一个独立卡片
    content = monitors.map((monitor) => (
      <MonitorCard key={monitor.id} monitor={monitor} />
    ))
  }

  return (
    <Center>
      <Box
        px="sm"
        mt="xl"
        style={{ width: '100%', maxWidth: '865px' }}
      >
        {content}
      </Box>
    </Center>
  )
}
