import { useEffect, useState } from 'react'
import { getDistrict } from '../data/city'
import { useCityStore } from '../state/useCityStore'
import { Icon } from './Icons'

const TONE_COLOR = {
  calm: '#22e6ff',
  alarm: '#ff4f6d',
  trade: '#ffb347',
  culture: '#ff4fa3',
} as const

export function NewsTicker() {
  const news = useCityStore((s) => s.news)
  const setPanel = useCityStore((s) => s.setPanel)
  const photoMode = useCityStore((s) => s.photoMode)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (news.length <= 1) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % news.length), 9000)
    return () => window.clearInterval(timer)
  }, [news.length])

  useEffect(() => {
    if (index >= news.length) setIndex(0)
  }, [news.length, index])

  if (photoMode || news.length === 0) return null
  const item = news[index % news.length]
  const district = item.district ? getDistrict(item.district) : null
  const color = TONE_COLOR[item.tone]

  return (
    <button className="news-ticker" onClick={() => setPanel('messages')} title="Open the civic wire">
      <span className="news-ticker__tag" style={{ color, borderColor: `${color}55` }}>
        <span className="live-dot" style={{ background: color }} /> WIRE
      </span>
      <span className="news-ticker__time">{item.time}</span>
      <span className="news-ticker__head" style={{ color }}>{item.headline}</span>
      <span className="news-ticker__body">{item.body}</span>
      {district ? <span className="news-ticker__district" style={{ color: district.color }}>{district.code}</span> : null}
      <span className="news-ticker__count">{index + 1}/{news.length}</span>
      <Icon name="chevron" size={11} />
    </button>
  )
}
