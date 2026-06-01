import { useEffect, useMemo, useRef, useState } from 'react'

type ExtraFields = {
  location?: string | null
  duration?: number | string | null
  description?: string | null
  validityMonths?: number | string | null
  [key: string]: string | number | null | undefined
}

type Option = { id: string; name: string } & ExtraFields

type Props = {
  fetchUrl: string
  valueName: string
  valueId?: string | null
  placeholder?: string
  onChange: (payload: { name: string; id: string | null } & ExtraFields) => void
}

export default function SmartCombobox({ fetchUrl, valueName, valueId, placeholder, onChange }: Props) {
  const cacheKey = `smart-combobox:cache:${fetchUrl}`
  const initialOptions = (() => {
    if (typeof window === 'undefined') return [] as Option[]
    try {
      const raw = window.localStorage.getItem(cacheKey)
      if (!raw) return [] as Option[]
      const parsed = JSON.parse(raw) as Option[]
      if (Array.isArray(parsed) && parsed.length) return parsed
      return [] as Option[]
    } catch {
      return [] as Option[]
    }
  })()

  const [options, setOptions] = useState<Option[]>(initialOptions)
  const [input, setInput] = useState(valueName || '')
  const [isOpen, setIsOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const selectionCommittedRef = useRef(false)

  useEffect(() => {
    const cacheKey = `smart-combobox:cache:${fetchUrl}`
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(cacheKey)
        if (raw) {
          const parsed = JSON.parse(raw) as Option[]
          if (Array.isArray(parsed) && parsed.length) {
            setOptions(parsed)
          }
        }
      } catch {
        // ignore localStorage errors
      }
    }

    let cancelled = false
    void (async () => {
      try {
        const env = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env
        const base = env?.VITE_API_BASE_URL || 'https://eliazar.heliohost.us'
        const finalUrl = fetchUrl.startsWith('http') ? fetchUrl : `${base.replace(/\/$/, '')}${fetchUrl.startsWith('/') ? '' : '/'}${fetchUrl}`
        const res = await fetch(finalUrl)
        if (!res.ok) return
        const raw = await res.json()
        // Normalize incoming items
        type ReceivedItem = {
          id?: string
          certificateId?: string
          trainingId?: string
          companyId?: string
          schoolId?: string
          name?: string
          certificateName?: string
          trainingTitle?: string
          companyName?: string
          schoolName?: string
          location?: string
          companyAddress?: string
          schoolLocation?: string
          phone?: string
          companyPhone?: string
          description?: string
          trainingDescription?: string
          duration?: number
          trainingDurationHours?: number
          validityMonths?: number
        }
        const list: ReceivedItem[] = Array.isArray(raw) ? raw : raw?.data ?? []
        const mapped = list.map((item) => {
          const id = String(item.id || item.companyId || item.schoolId || item.certificateId || item.trainingId || '')
          const name = String(item.name || item.companyName || item.schoolName || item.certificateName || item.trainingTitle || '')
          const base = {
            id,
            name,
            location: item.location || item.companyAddress || item.schoolLocation || '',
          }
          const description = String(item.description || item.trainingDescription || '')
          const companyPhone = String(item.companyPhone || item.phone || '')
          const duration = item.duration ?? item.trainingDurationHours ?? undefined
          const extras = { ...item, description, companyPhone, duration }
          return { ...base, ...extras }
        })
        if (!cancelled) {
          setOptions(mapped)
          if (typeof window !== 'undefined') {
            try { window.localStorage.setItem(cacheKey, JSON.stringify(mapped)) } catch { /* ignore localStorage errors */ }
          }
        }
      } catch {
        // ignore fetch errors
      }
    })()

    return () => { cancelled = true }
  }, [fetchUrl])

  useEffect(() => {
    const selectedOption = valueId ? options.find((option) => option.id === valueId) : undefined
    const nextInput = selectedOption?.name ?? valueName ?? ''
    if (nextInput !== input) {
      setInput(nextInput)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueId, valueName, options])

  const filtered = useMemo(() => {
    const q = (input || '').trim().toLowerCase()
    if (!q) return options
    const exact: Option[] = []
    const prefix: Option[] = []
    const substring: Option[] = []
    for (const o of options) {
      const n = o.name.toLowerCase()
      if (n === q) {
        exact.push(o)
      } else if (n.startsWith(q)) {
        prefix.push(o)
      } else if (n.includes(q)) {
        substring.push(o)
      }
    }
    // Preserve order within groups, then concat: exact, prefix, substring
    return [...exact, ...prefix, ...substring]
  }, [input, options])

  const selectOption = (opt: Option) => {
    selectionCommittedRef.current = true
    setInput(opt.name)
    setIsOpen(false)
    onChange({ ...opt })
  }

  const truncateWords = (value: string, maxWords: number) => {
    const cleaned = value.trim().replace(/\s+/g, ' ')
    const words = cleaned.split(' ')
    if (words.length <= maxWords) return cleaned
    return `${words.slice(0, maxWords).join(' ')}...`
  }

  const onBlur = () => {
    // small delay to allow click
    setTimeout(() => {
      if (selectionCommittedRef.current) {
        selectionCommittedRef.current = false
        return
      }
      setIsOpen(false)
      const exact = options.find((o) => o.name.toLowerCase() === (input || '').trim().toLowerCase())
      if (exact) {
        onChange({ ...exact })
      } else {
        onChange({ name: (input || '').trim(), id: null })
      }
    }, 150)
  }

  return (
    <div className="smart-combobox" style={{ position: 'relative' }}>
      <input
        placeholder={placeholder}
        value={input}
        style={{ width: '100%' }}
        onFocus={() => { setIsOpen(true); setHighlight(0) }}
        onChange={(e) => { setInput(e.target.value); setIsOpen(true) }}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (!isOpen) return
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)) }
          if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlight]) selectOption(filtered[highlight]) }
        }}
      />
      {isOpen && filtered.length > 0 ? (
        <ul className="combobox-list" style={{ position: 'absolute', zIndex: 40, left: 0, right: 0, maxHeight: 220, overflow: 'auto', background: 'white', border: '1px solid #ddd', margin: 0, padding: 0, listStyle: 'none' }}>
          {filtered.map((opt, i) => {
            const showCompanyMeta = Boolean(opt.companyPhone)
            const showTrainingMeta = Boolean(opt.description || opt.duration)
            const showCertificateMeta = Boolean(opt.location || opt.validityMonths != null)
            const trainingDescription = typeof opt.description === 'string' ? opt.description : ''
            return (
              <li key={opt.id} onMouseDown={() => selectOption(opt)} style={{ padding: '8px 10px', background: i === highlight ? '#eef' : 'white', cursor: 'pointer' }}>
                <div style={{ fontWeight: 500 }}>{opt.name}</div>
                {showCompanyMeta ? (
                  <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {opt.location ? <div>{opt.location}</div> : null}
                    <div>{opt.companyPhone}</div>
                  </div>
                ) : showTrainingMeta ? (
                  <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {trainingDescription ? <div>{truncateWords(trainingDescription, 12)}</div> : null}
                    {opt.duration != null ? <div>{`${opt.duration}h`}</div> : null}
                  </div>
                ) : showCertificateMeta ? (
                  <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {opt.location ? <div>{opt.location}</div> : null}
                    {opt.validityMonths != null ? <div>{`Valid for ${opt.validityMonths} months`}</div> : null}
                  </div>
                ) : opt.location ? (
                  <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: 4 }}>{opt.location}</div>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
