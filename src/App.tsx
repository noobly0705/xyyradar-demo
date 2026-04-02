import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts'
import 'echarts-gl'

/** 省级边界 GeoJSON。曾用阿里云 DataV 在线地址，但带 `*.github.io` Referer 时 CDN 会 403，故随仓库放在 `public/geo/`。 */
function chinaGeoUrl(): string {
  return `${import.meta.env.BASE_URL}geo/china-100000_full.json`
}

/** 开发环境走 Vite 代理 /api/stats；静态部署读 public/stats.json */
function statsUrl(): string {
  if (import.meta.env.DEV) return '/api/stats'
  return `${import.meta.env.BASE_URL}stats.json`
}

type StatsPayload = {
  updated_at?: string
  source?: string
  note?: string
  categories?: string[]
  counts: Record<string, number>
}

export default function App() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const [status, setStatus] = useState<string>('加载中…')
  const [meta, setMeta] = useState<string>('')

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    let cancelled = false

    async function load() {
      setStatus('正在加载地图与数据…')
      try {
        const [geoRes, statRes] = await Promise.all([
          fetch(chinaGeoUrl()),
          fetch(statsUrl()),
        ])
        if (!geoRes.ok) throw new Error(`地图数据加载失败: ${geoRes.status}`)
        if (!statRes.ok)
          throw new Error(`统计数据加载失败 (${statRes.status}): ${statsUrl()}`)

        const geoJson = (await geoRes.json()) as {
          features?: { properties?: { name?: string } }[]
        }
        const stats = (await statRes.json()) as StatsPayload

        if (cancelled) return

        echarts.registerMap('china', geoJson as never)

        const counts = stats.counts ?? {}
        const features = geoJson.features
        const names =
          features?.map((f) => f.properties?.name).filter(Boolean) ?? []

        const data = names.map((name) => ({
          name: name as string,
          value: counts[name as string] ?? 0,
        }))

        const values = data.map((d) => d.value)
        const maxV = Math.max(1, ...values)
        const minV = Math.min(0, ...values)

        if (chartRef.current) {
          chartRef.current.dispose()
          chartRef.current = null
        }

        const chart = echarts.init(el, undefined, { renderer: 'canvas' })
        chartRef.current = chart

        chart.setOption({
          backgroundColor: '#0b1220',
          tooltip: {
            formatter: (p: { name?: string; value?: number }) =>
              `${p.name ?? ''}<br/>发帖量（演示）: <b>${p.value ?? 0}</b>`,
          },
          visualMap: {
            show: true,
            min: minV,
            max: maxV,
            calculable: true,
            realtime: true,
            inRange: {
              color: [
                '#fff5fb',
                '#ffcce0',
                '#f48fb1',
                '#e91e63',
                '#c2185b',
                '#880e4f',
              ],
            },
            text: ['高', '低'],
            textStyle: { color: '#cbd5e1' },
            left: 'left',
            bottom: '8%',
          },
          series: [
            {
              type: 'map3D',
              map: 'china',
              regionHeight: 2.8,
              shading: 'lambert',
              label: {
                show: true,
                distance: 4,
                textStyle: {
                  color: '#e2e8f0',
                  fontSize: 10,
                  backgroundColor: 'rgba(15,23,42,0.45)',
                  padding: [2, 4],
                  borderRadius: 3,
                },
              },
              itemStyle: {
                borderWidth: 1,
                borderColor: 'rgba(15,23,42,0.9)',
              },
              emphasis: {
                label: { show: true, textStyle: { color: '#fff' } },
                itemStyle: { color: '#ff5c9e' },
              },
              light: {
                main: { intensity: 1.1, shadow: true },
                ambient: { intensity: 0.35 },
              },
              viewControl: {
                projection: 'perspective',
                autoRotate: false,
                distance: 105,
                alpha: 38,
                beta: 2,
                minDistance: 60,
                maxDistance: 220,
                // 默认是中键旋转、左键平移；改为左键旋转更符合常见 3D 交互
                rotateMouseButton: 'left',
                panMouseButton: 'right',
                rotateSensitivity: 1.15,
                zoomSensitivity: 1.1,
              },
              data,
            },
          ],
        })

        setStatus('就绪')
        const parts = [
          stats.updated_at ? `更新: ${stats.updated_at}` : '',
          stats.source ? `来源: ${stats.source}` : '',
          stats.categories?.length
            ? `类别: ${stats.categories.join(' / ')}`
            : '',
        ].filter(Boolean)
        setMeta(parts.join(' · '))
      } catch (e) {
        if (!cancelled) {
          setStatus('加载失败')
          setMeta(e instanceof Error ? e.message : String(e))
        }
      }
    }

    void load()

    const onResize = () => chartRef.current?.resize()
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>XYyRadar · 地域发帖热力（3D）</h1>
          <p className="sub">
            省级边界来自公开 GeoJSON；数值越深表示该省性压抑发帖量越高（演示数据）。
            操作：左键拖拽旋转视角，右键拖拽平移，滚轮缩放。
          </p>
        </div>
        <div className="pill">
          <span className={status === '就绪' ? 'ok' : ''}>{status}</span>
          {meta ? <span className="meta">{meta}</span> : null}
        </div>
      </header>
      <div ref={wrapRef} className="map" />
      <footer className="footer">
        <p>
          数据管道：运行 <code>python3 scripts/mock_aggregate.py</code> 生成模拟统计；
          启动接口 <code>uvicorn server.main:app --reload --port 8000</code> 后，
          再执行 <code>npm run dev</code>。
        </p>
        <p className="warn">
          微博未授权爬取存在合规风险；请使用官方开放平台或自有导出数据，可用{' '}
          <code>scripts/ingest_csv_example.py</code> 写入同结构 JSON。
        </p>
      </footer>
    </div>
  )
}
