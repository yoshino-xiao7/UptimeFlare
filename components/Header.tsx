import { Container, Group, Image, Text } from '@mantine/core'
import classes from '@/styles/Header.module.css'
import { pageConfig } from '@/uptime.config'
import { PageConfigLink } from '@/types/config'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'

export default function Header({ style }: { style?: React.CSSProperties }) {
  const { t } = useTranslation('common')
  const [isHomePage, setIsHomePage] = useState(true)

  // SSR 兼容：在客户端获取 pathname
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsHomePage(window.location.pathname === '/')
    }
  }, [])

  const linkToElement = (link: PageConfigLink, i: number) => {
    return (
      <a
        key={i}
        href={link.link}
        target={link.link.startsWith('/') ? undefined : '_blank'}
        className={classes.link}
        data-active={link.highlight}
      >
        {link.label}
      </a>
    )
  }

  const links = [{ label: t('Incidents'), link: '/incidents' }, ...(pageConfig.links || [])]

  return (
    <header className={classes.header} style={style}>
      <Container size="md" className={classes.inner}>
        <Group gap="sm">
          <a
            href={isHomePage ? 'https://github.com/lyc8503/UptimeFlare' : '/'}
            target={isHomePage ? '_blank' : undefined}
          >
            <Image
              src={pageConfig.logo ?? '/logo.svg'}
              h={48}
              w={48}
              fit="contain"
              alt="logo"
              style={{ borderRadius: '8px' }}
            />
          </a>
          <Text fw={700} size="lg" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {pageConfig.title}
          </Text>
        </Group>

        <Group gap={5} visibleFrom="sm">
          {links?.map(linkToElement)}
        </Group>

        <Group gap={5} hiddenFrom="sm">
          {links?.filter((link) => link.highlight || link.link.startsWith('/')).map(linkToElement)}
        </Group>
      </Container>
    </header>
  )
}
