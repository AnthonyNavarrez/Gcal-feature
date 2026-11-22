import { useRef, useState, useEffect } from 'react'
import styles from './CreatePollDialog.module.css'

const TODAY = new Date(2026, 10, 8) // Nov 8 2026

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function MiniCalendar({ selected, minDate, onSelect, anchorLeft, anchorTop }) {
  const [viewYear, setViewYear] = useState(selected.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected.getMonth())

  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const cellSize = 40

  return (
    <div style={{
      position: 'fixed',
      left: anchorLeft,
      top: anchorTop,
      width: '320px',
      background: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      zIndex: 200,
      padding: '12px',
      boxSizing: 'border-box',
      fontFamily: "'Google Sans','Arimo',sans-serif",
    }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
      {/* Month navigation */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', paddingLeft:'4px' }}>
        <span style={{ color:'#444746', fontSize:'16px', fontWeight:500 }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div style={{ display:'flex', gap:'4px' }}>
          {['‹','›'].map((arrow, i) => (
            <button key={arrow} onClick={i === 0 ? prevMonth : nextMonth} style={{
              background:'none', border:'none', color:'#444746', fontSize:'20px',
              cursor:'pointer', width:'32px', height:'32px', borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              lineHeight:1,
            }}
            onMouseEnter={e => e.currentTarget.style.background='#f1f3f4'}
            onMouseLeave={e => e.currentTarget.style.background='none'}
            >{arrow}</button>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:'4px' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign:'center', color:'#444746', fontSize:'13px', paddingBottom:'4px' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', rowGap:'2px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const thisDate = new Date(viewYear, viewMonth, day)
          const isSelected = isSameDay(thisDate, selected)
          const isToday = isSameDay(thisDate, TODAY)
          const isDisabled = minDate && thisDate < minDate && !isSameDay(thisDate, minDate)

          let bg = 'none', color = '#444746', cursor = 'pointer'
          if (isSelected) { bg = '#1a73e8'; color = '#fff' }
          else if (isToday) { bg = '#e8f0fe'; color = '#1a73e8' }
          if (isDisabled) { color = '#444746'; cursor = 'default' }

          return (
            <div key={i} style={{
              textAlign:'center', fontSize:'14px', color, cursor,
              height:`${cellSize}px`, display:'flex', alignItems:'center', justifyContent:'center',
            }}
            onClick={() => { if (!isDisabled) onSelect(thisDate) }}
            onMouseEnter={e => { if (!isDisabled && !isSelected) e.currentTarget.style.background='#f1f3f4'; e.currentTarget.style.borderRadius='50%' }}
            onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#1a73e8' : isToday ? '#e8f0fe' : 'none' }}
            >
              <div style={{
                width:`${cellSize}px`, height:`${cellSize}px`, borderRadius:'50%',
                background: bg, display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:'14px',
              }}>{day}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const GROUP_OPTIONS = ['Product Space Fellows', 'cs33 pod', 'Besties']

export default function CreatePollDialog({ onClose, onCustomize, onSave, addedGroups = [] }) {
  const [pos, setPos] = useState({ x: (1911 - 1048.658) / 2, y: 125 })
  const [timeFrameOpen, setTimeFrameOpen] = useState(false)
  const [guestsOpen, setGuestsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [titleFocused, setTitleFocused] = useState(false)
  const [startDate, setStartDate] = useState(new Date(2026, 10, 8))
  const [endDate, setEndDate] = useState(new Date(2026, 10, 8))
  const [openPicker, setOpenPicker] = useState(null) // 'start' | 'end' | null
  const [calendarPos, setCalendarPos] = useState({ left: 0, top: 0 })
  const [duration, setDuration] = useState('1 hr')
  const [durationOpen, setDurationOpen] = useState(false)
  const [durationCustom, setDurationCustom] = useState('')
  const [durationDropPos, setDurationDropPos] = useState({ left: 0, top: 0 })
  const [guests, setGuests] = useState([])
  const [guestInput, setGuestInput] = useState('')
  const [guestFocused, setGuestFocused] = useState(false)
  const [selectedTab, setSelectedTab] = useState(0)
  const [hoveredTab, setHoveredTab] = useState(null)
  const [votingOpen, setVotingOpen] = useState(false)
  const [autoSchedule, setAutoSchedule] = useState(true)
  const [enableNotifications, setEnableNotifications] = useState(true)
  const [suggestions, setSuggestions] = useState('3 suggestions')
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [groupDropOpen, setGroupDropOpen] = useState(false)
  const [groupDropPos, setGroupDropPos] = useState({ left: 0, top: 0 })
  const [votingDate, setVotingDate] = useState(new Date(2026, 10, 8))
  const [votingDatePickerOpen, setVotingDatePickerOpen] = useState(false)
  const [votingDatePickerPos, setVotingDatePickerPos] = useState({ left: 0, top: 0 })
  const votingDateBtnRef = useRef(null)
  const [votingTime, setVotingTime] = useState('7:00pm')
  const [votingTimePickerOpen, setVotingTimePickerOpen] = useState(false)
  const [votingTimePickerPos, setVotingTimePickerPos] = useState({ left: 0, top: 0 })
  const votingTimeBtnRef = useRef(null)
  const votingTimeListRef = useRef(null)
  const addGroupBtnRef = useRef(null)
  const [selectedGroups, setSelectedGroups] = useState(new Set())
  const titleRef = useRef(null)
  const startBoxRef = useRef(null)
  const endBoxRef = useRef(null)
  const durationBoxRef = useRef(null)
  const durationCustomRef = useRef(null)
  const guestInputRef = useRef(null)
  const groupDropRef = useRef(null)
  const votingRowRef = useRef(null)
  const formRowsRef = useRef(null)
  const [showBottomShadow, setShowBottomShadow] = useState(false)
  const timeFrameRowRef = useRef(null)
  const guestsRowRef = useRef(null)
  const dragging = useRef(false)
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const groupChipsH  = selectedGroups.size > 0 ? 52 : 0
  const guestChipsH  = guests.length > 0 ? Math.ceil(guests.length / 3) * 44 : 0
  const extraH       = groupChipsH + guestChipsH
  const dialogHeight = guestsOpen ? 800 + extraH : timeFrameOpen ? 846 : votingOpen ? 876 : 750
  const actionsTop   = guestsOpen ? 721 + extraH : timeFrameOpen ? 767 : votingOpen ? 797 : 672.22

  useEffect(() => {
    setPos({
      x: (1911 - 1048.658) / 2,
      y: Math.max(20, (1000.29 - dialogHeight) / 2),
    })
  }, [])

  useEffect(() => {
    if (!groupDropOpen) return
    function handleOutside(e) {
      if (groupDropRef.current && !groupDropRef.current.contains(e.target)) {
        setGroupDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [groupDropOpen])

  useEffect(() => {
    const el = formRowsRef.current
    if (!el) return
    function update() {
      setShowBottomShadow(el.scrollHeight > el.clientHeight + el.scrollTop + 2)
    }
    update()
    el.addEventListener('scroll', update)
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [dialogHeight, timeFrameOpen, votingOpen, guestsOpen])

  useEffect(() => {
    const anyOpen = timeFrameOpen || votingOpen || guestsOpen
    if (!anyOpen) return
    function handleOutside(e) {
      if (timeFrameOpen && timeFrameRowRef.current && !timeFrameRowRef.current.contains(e.target))
        setTimeFrameOpen(false)
      if (votingOpen && votingRowRef.current && !votingRowRef.current.contains(e.target))
        setVotingOpen(false)
      if (guestsOpen && guestsRowRef.current && !guestsRowRef.current.contains(e.target))
        setGuestsOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [timeFrameOpen, votingOpen, guestsOpen])

  function onMouseDown(e) {
    dragging.current = true
    origin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    e.preventDefault()
  }

  function onMouseMove(e) {
    if (!dragging.current) return
    setPos({
      x: origin.current.px + (e.clientX - origin.current.mx),
      y: origin.current.py + (e.clientY - origin.current.my),
    })
  }

  function onMouseUp() {
    dragging.current = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup',   onMouseUp)
  }

  function handleSelectStart(d) {
    setStartDate(d)
    if (d > endDate) setEndDate(d)
    setOpenPicker(null)
  }

  function handleSelectEnd(d) {
    setEndDate(d)
    setOpenPicker(null)
  }

  const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const h = Math.floor(i / 2), m = i % 2 === 0 ? '00' : '30'
    const ampm = h < 12 ? 'am' : 'pm'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${m}${ampm}`
  })

  const DURATION_OPTIONS = [
    '15 min','30 min','45 min',
    '1 hr','1 hr 30 min',
    '2 hr','2 hr 30 min',
    '3 hr','3 hr 30 min',
    '4 hr','5 hr','6 hr','8 hr','10 hr','12 hr','24 hr',
  ]

  function openDurationDrop(e) {
    e.stopPropagation()
    if (durationOpen) { setDurationOpen(false); return }
    if (durationBoxRef.current) {
      const r = durationBoxRef.current.getBoundingClientRect()
      setDurationDropPos({ left: r.left, top: r.bottom + 4 })
    }
    setDurationCustom('')
    setDurationOpen(true)
  }

  function selectDuration(opt) {
    setDuration(opt)
    setDurationOpen(false)
  }

  function commitGuest(raw) {
    const name = raw.trim().replace(/,+$/, '').trim()
    if (name && !guests.includes(name)) setGuests(prev => [...prev, name])
    setGuestInput('')
  }

  function commitCustomDuration(raw) {
    const trimmed = raw.trim()
    if (trimmed) setDuration(trimmed)
    setDurationOpen(false)
  }

  function togglePicker(which, e) {
    e.stopPropagation()
    if (openPicker === which) { setOpenPicker(null); return }
    const ref = which === 'start' ? startBoxRef : endBoxRef
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setCalendarPos({ left: r.left, top: r.bottom + 6 })
    }
    setOpenPicker(which)
  }

  return (
    <>
      <div className={styles.backdrop} onClick={() => { if (openPicker) setOpenPicker(null); else if (groupDropOpen) setGroupDropOpen(false); else onClose() }} />

      {/* Close layer for all dropdowns */}
      {(openPicker || durationOpen || votingDatePickerOpen || votingTimePickerOpen) && (
        <div style={{ position:'fixed', inset:0, zIndex:149 }} onClick={() => { setOpenPicker(null); setDurationOpen(false); setVotingDatePickerOpen(false); setVotingTimePickerOpen(false) }} />
      )}

      {/* Duration dropdown */}
      {durationOpen && (
        <div style={{
          position:'fixed', left: durationDropPos.left, top: durationDropPos.top,
          width:'200px', background:'#ffffff', borderRadius:'8px', border:'1px solid #dadce0',
          boxShadow:'0 6px 24px rgba(0,0,0,0.7)', zIndex:200,
          fontFamily:"'Google Sans','Arimo',sans-serif", overflow:'hidden',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ maxHeight:'260px', overflowY:'auto' }}>
            {/* Custom entry at top */}
            <div style={{
              padding:'14px 20px', cursor:'text',
              background: !DURATION_OPTIONS.includes(duration) ? '#e8eaed' : 'transparent',
              borderBottom:'1px solid #e8eaed',
            }}>
              <input
                ref={durationCustomRef}
                value={durationCustom}
                onChange={e => setDurationCustom(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitCustomDuration(durationCustom) }}
                placeholder="Custom (e.g. 1 hr 45 min)"
                style={{
                  width:'100%', background:'transparent', border:'none', outline:'none',
                  color:'#444746', fontSize:'16px', fontFamily:"'Google Sans','Arimo',sans-serif",
                  caretColor:'#1a73e8', padding:0,
                }}
              />
            </div>
            {DURATION_OPTIONS.map(opt => (
              <div key={opt} onClick={() => selectDuration(opt)} style={{
                padding:'14px 20px', cursor:'pointer', fontSize:'16px',
                color:'#444746',
                background: opt === duration ? '#e8eaed' : 'transparent',
                transition:'background 80ms',
              }}
              onMouseEnter={e => { if (opt !== duration) e.currentTarget.style.background='#f1f3f4' }}
              onMouseLeave={e => { e.currentTarget.style.background = opt === duration ? '#e8eaed' : 'transparent' }}
              >{opt}</div>
            ))}
          </div>
        </div>
      )}

      {openPicker === 'start' && (
        <MiniCalendar
          selected={startDate}
          minDate={null}
          onSelect={handleSelectStart}
          anchorLeft={calendarPos.left}
          anchorTop={calendarPos.top}
        />
      )}
      {openPicker === 'end' && (
        <MiniCalendar
          selected={endDate}
          minDate={startDate}
          onSelect={handleSelectEnd}
          anchorLeft={calendarPos.left}
          anchorTop={calendarPos.top}
        />
      )}
      {votingDatePickerOpen && (
        <MiniCalendar
          selected={votingDate}
          minDate={null}
          onSelect={d => { setVotingDate(d); setVotingDatePickerOpen(false) }}
          anchorLeft={votingDatePickerPos.left}
          anchorTop={votingDatePickerPos.top}
        />
      )}
      {votingTimePickerOpen && (
        <div style={{
          position:'fixed', left: votingTimePickerPos.left, top: votingTimePickerPos.top,
          width:'520px', background:'#ffffff', borderRadius:'5px',
          boxShadow:'0px 0px 10px 2px rgba(0,0,0,0.1)', zIndex:200,
          fontFamily:"'Google Sans','Arimo',sans-serif", overflow:'hidden',
        }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <div ref={votingTimeListRef} className="time-picker-scroll" style={{ maxHeight:'340px', overflowY:'auto',
            display:'flex', flexDirection:'column', gap:'26px',
            padding:'16px 24px', boxSizing:'border-box' }}>
            {TIME_OPTIONS.map(opt => (
              <div key={opt} onClick={() => { setVotingTime(opt); setVotingTimePickerOpen(false) }}
                style={{
                  cursor:'pointer', fontSize:'22px', lineHeight:'normal',
                  color: opt === votingTime ? '#1a73e8' : '#202124',
                  fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap',
                  borderRadius:'4px', padding:'4px 8px', margin:'-4px -8px',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='#f1f3f4' }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent' }}
              >{opt}</div>
            ))}
          </div>
        </div>
      )}

      <div
        className={styles.dialog}
        style={{ left: pos.x, top: pos.y, height: dialogHeight }}
      >
        {/* ── HEADER (drag zone) ── */}
        <div className={styles.header} onMouseDown={onMouseDown}>
          <img src="/assets/drag-handle.svg" alt="drag"
            style={{ position:'absolute', left:'33.09px', top:'26.89px', width:'24.82px', height:'24.82px', pointerEvents:'none' }} />
          <img src="/assets/close-dialog.svg" alt="close"
            onClick={e => { e.stopPropagation(); onClose() }}
            style={{ position:'absolute', right:'33.09px', top:'22.75px', width:'26.889px', height:'26.889px', cursor:'pointer', pointerEvents:'all' }} />
        </div>

        {/* ── TITLE + TABS ── */}
        <div style={{ position:'absolute', left:'99.28px', top:'91.01px', width:'924.557px', height:'136.512px' }}>
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onFocus={() => setTitleFocused(true)}
            onBlur={() => setTitleFocused(false)}
            placeholder="Add title"
            style={{
              position:'absolute', left:'2.07px', top:'6.21px',
              width:'920px', background:'transparent', border:'none', outline:'none',
              color: title || titleFocused ? '#444746' : '#80868b',
              fontSize:'34.128px', fontFamily:"'Google Sans','Arimo',sans-serif",
              caretColor:'#1a73e8', padding:0,
            }}
          />
          <div style={{ position:'absolute', background:'#dadce0', height:'1.241px', left:'2.07px', top:'49.64px', width:'922.488px' }} />
          {[
            { label:'Event',                x:12.41  },
            { label:'Task',                 x:103.42 },
            { label:'Out of office',        x:186.15 },
            { label:'Focus time',           x:345.42 },
            { label:'Working location',     x:488.13 },
            { label:'Appointment schedule', x:690.83 },
          ].map(({ label, x }, i) => {
            const isSelected = i === selectedTab
            const isHovered  = i === hoveredTab
            const bg = isSelected ? '#C7E7FF' : isHovered ? '#DEE3EA' : 'transparent'
            const color = isSelected ? '#1B4B78' : '#444746'
            return (
              <div key={label}
                onClick={() => setSelectedTab(i)}
                onMouseEnter={() => setHoveredTab(i)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  position:'absolute', left:`${x - 10.34}px`, top:'76.53px',
                  height:'53.777px', paddingLeft:'10.34px', paddingRight:'10.34px',
                  borderRadius:'10.342px', cursor:'pointer',
                  display:'flex', alignItems:'center', background: bg,
                }}>
                <span style={{ color, fontSize:'20.684px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>{label}</span>
              </div>
            )
          })}
        </div>

        {/* ── FORM ROWS ── */}
        <div ref={formRowsRef} style={{
          position:'absolute', left:'33px', top:'255px', width:'982.658px',
          maxHeight:`${dialogHeight - 255 - 110}px`,
          overflowY:'auto', overflowX:'hidden',
          display:'flex', flexDirection:'column', gap:'34px',
          paddingLeft:'16px', paddingRight:'16px', paddingTop:'13px', paddingBottom:'8px',
          boxShadow: showBottomShadow ? 'inset 0 -18px 12px -10px rgba(0,0,0,0.07)' : 'none',
          transition: 'box-shadow 150ms ease',
        }}
          className="dialog-form-rows"
          onWheel={e => e.stopPropagation()}
        >

          {/* Time Frame row */}
          <div ref={timeFrameRowRef}
            onMouseEnter={e => { if (!timeFrameOpen) e.currentTarget.style.background='#DEE3EA' }}
            onMouseLeave={e => { if (!timeFrameOpen) e.currentTarget.style.background='transparent' }}
            style={{ display:'flex', gap:'25px', alignItems: timeFrameOpen ? 'flex-start' : 'center', borderRadius:'10px', padding:'13px 16px', margin:'-13px -16px', cursor:'pointer', background: timeFrameOpen ? '#F1F4F9' : 'transparent' }}
            onMouseDown={e => { if (!timeFrameOpen) { e.stopPropagation(); setTimeFrameOpen(true); setVotingOpen(false); setGuestsOpen(false) } }}>
            <img src="/assets/event-time.svg" alt=""
              style={{ width:'31.025px', height:'31.025px', flexShrink:0, cursor:'pointer', marginTop: timeFrameOpen ? '4px' : '0' }} />

            {timeFrameOpen ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'18px' }} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                {/* Date range row */}
                <div style={{ display:'flex', gap:'9px', alignItems:'center' }} onClick={e => e.stopPropagation()}>
                  {/* Start date box */}
                  <div ref={startBoxRef} onClick={e => togglePicker('start', e)}
                    onMouseEnter={e => { if (openPicker !== 'start') e.currentTarget.style.background='#C0C4CA' }}
                    onMouseLeave={e => { if (openPicker !== 'start') e.currentTarget.style.background='#DEE3EA' }}
                    style={{
                      background: openPicker === 'start' ? '#e8f0fe' : '#DEE3EA',
                      height:'56.191px', borderRadius:'3.746px',
                      display:'inline-flex', alignItems:'center',
                      padding:'0 22px', cursor:'pointer',
                      outline: openPicker === 'start' ? '2px solid #1a73e8' : 'none',
                    }}>
                    <span style={{ color:'#444746', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>
                      {formatDate(startDate)}
                    </span>
                  </div>

                  <span style={{ color:'#444746', fontSize:'21.511px', fontFamily:"'Google Sans','Arimo',sans-serif" }}>-</span>

                  {/* End date box */}
                  <div ref={endBoxRef} onClick={e => togglePicker('end', e)}
                    onMouseEnter={e => { if (openPicker !== 'end') e.currentTarget.style.background='#C0C4CA' }}
                    onMouseLeave={e => { if (openPicker !== 'end') e.currentTarget.style.background='#DEE3EA' }}
                    style={{
                      background: openPicker === 'end' ? '#e8f0fe' : '#DEE3EA',
                      height:'56.191px', borderRadius:'3.746px',
                      display:'inline-flex', alignItems:'center',
                      padding:'0 22px', cursor:'pointer',
                      outline: openPicker === 'end' ? '2px solid #1a73e8' : 'none',
                    }}>
                    <span style={{ color:'#444746', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>
                      {formatDate(endDate)}
                    </span>
                  </div>
                </div>

                {/* Duration + padding row */}
                <div style={{ display:'flex', gap:'19px', alignItems:'center' }}>
                  <div ref={durationBoxRef} onClick={openDurationDrop}
                    onMouseEnter={e => { if (!durationOpen) e.currentTarget.style.background='#C0C4CA' }}
                    onMouseLeave={e => { if (!durationOpen) e.currentTarget.style.background='#DEE3EA' }}
                    style={{
                      background: durationOpen ? '#e8f0fe' : '#DEE3EA',
                      height:'56px', borderRadius:'3.746px', display:'inline-flex', alignItems:'center',
                      padding:'0 18px 0 22px', gap:'12px', cursor:'pointer',
                      outline: durationOpen ? '2px solid #1a73e8' : 'none',
                    }}>
                    <span style={{ color:'#444746', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>{duration}</span>
                    <img src="/assets/dropdown-arrow.svg" alt="" style={{ width:'13.111px', height:'7.492px', flexShrink:0 }} />
                  </div>
                  <div
                    onMouseEnter={e => e.currentTarget.style.background='#C0C4CA'}
                    onMouseLeave={e => e.currentTarget.style.background='#DEE3EA'}
                    style={{ background:'#DEE3EA', height:'56px', width:'212px',
                      borderRadius:'3.746px', display:'flex', alignItems:'center',
                      paddingLeft:'22px', paddingRight:'26px', boxSizing:'border-box', gap:'27px', cursor:'pointer' }}>
                    <span style={{ color:'#444746', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif" }}>Time padding</span>
                    <img src="/assets/dropdown-arrow.svg" alt="" style={{ width:'13.111px', height:'7.492px', flexShrink:0 }} />
                  </div>
                  <span style={{ color:'#1a73e8', fontSize:'22px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap', cursor:'pointer' }}
                    onClick={e => { e.stopPropagation(); onCustomize && onCustomize({ startDate, endDate }) }}>
                    Customize availability
                  </span>
                </div>
              </div>
            ) : (
              <span style={{ color:'#444746', fontSize:'21.304px', fontFamily:"'Google Sans','Arimo',sans-serif",
                whiteSpace:'nowrap', cursor:'pointer', lineHeight:'39.269px' }}>
                Time Frame
              </span>
            )}
          </div>

          {/* Voting row */}
          <div ref={votingRowRef}
            onMouseEnter={e => { if (!votingOpen) e.currentTarget.style.background='#DEE3EA' }}
            onMouseLeave={e => { if (!votingOpen) e.currentTarget.style.background='transparent' }}
            onMouseDown={e => { if (!votingOpen) { e.stopPropagation(); setVotingOpen(true); setTimeFrameOpen(false); setGuestsOpen(false) } }}
            style={{ display:'flex', gap:'35px', alignItems: votingOpen ? 'flex-start' : 'center', borderRadius:'10px', padding:'13px 16px', margin:'-13px -16px', cursor:'pointer', background: votingOpen ? '#F1F4F9' : 'transparent' }}>
            <img src="/assets/voting.svg" alt="" style={{ width:'26.4px', height:'26.4px', flexShrink:0, marginTop: votingOpen ? '4px' : '0' }} />

            {votingOpen ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'13px' }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                {/* Row 1: date, time, auto-schedule */}
                <div style={{ display:'flex', gap:'17px', alignItems:'center' }}>
                  <div ref={votingDateBtnRef}
                    onClick={e => {
                      e.stopPropagation()
                      if (votingDatePickerOpen) { setVotingDatePickerOpen(false); return }
                      if (votingDateBtnRef.current) {
                        const r = votingDateBtnRef.current.getBoundingClientRect()
                        setVotingDatePickerPos({ left: r.left, top: r.bottom + 6 })
                      }
                      setVotingDatePickerOpen(true)
                    }}
                    style={{
                      background: votingDatePickerOpen ? '#e8f0fe' : '#DEE3EA', height:'50px', borderRadius:'3.746px',
                      display:'inline-flex', alignItems:'center', padding:'0 20px', cursor:'pointer',
                      outline: votingDatePickerOpen ? '2px solid #1a73e8' : 'none',
                    }}
                    onMouseEnter={e => { if (!votingDatePickerOpen) e.currentTarget.style.background='#C0C4CA' }}
                    onMouseLeave={e => { if (!votingDatePickerOpen) e.currentTarget.style.background='#DEE3EA' }}>
                    <span style={{ color:'#444746', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>
                      {votingDate.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
                    </span>
                  </div>
                  <div ref={votingTimeBtnRef}
                    onClick={e => {
                      e.stopPropagation()
                      if (votingTimePickerOpen) { setVotingTimePickerOpen(false); return }
                      if (votingTimeBtnRef.current) {
                        const r = votingTimeBtnRef.current.getBoundingClientRect()
                        setVotingTimePickerPos({ left: r.left, top: r.bottom + 4 })
                        setTimeout(() => {
                          if (votingTimeListRef.current) {
                            const idx = TIME_OPTIONS.indexOf(votingTime)
                            votingTimeListRef.current.scrollTop = Math.max(0, idx - 2) * 44
                          }
                        }, 0)
                      }
                      setVotingTimePickerOpen(true)
                    }}
                    style={{
                      background: votingTimePickerOpen ? '#e8f0fe' : '#DEE3EA', height:'50px', borderRadius:'3.746px',
                      display:'inline-flex', alignItems:'center', padding:'0 20px', cursor:'pointer',
                      outline: votingTimePickerOpen ? '2px solid #1a73e8' : 'none',
                    }}
                    onMouseEnter={e => { if (!votingTimePickerOpen) e.currentTarget.style.background='#C0C4CA' }}
                    onMouseLeave={e => { if (!votingTimePickerOpen) e.currentTarget.style.background='#DEE3EA' }}>
                    <span style={{ color:'#444746', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>{votingTime}</span>
                  </div>
                  {/* Auto schedule checkbox */}
                  <div style={{ display:'flex', gap:'14px', alignItems:'center', cursor:'pointer' }}
                    onClick={() => setAutoSchedule(v => !v)}>
                    <div style={{
                      width:'25px', height:'25px', flexShrink:0, boxSizing:'border-box',
                      border: autoSchedule ? 'none' : '2px solid #444746', borderRadius:'2px',
                      background: autoSchedule ? '#1a73e8' : 'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {autoSchedule && <svg width="14" height="11" viewBox="0 0 15 12" fill="none"><path d="M0.900391 6.46069L4.87231 10.4326L13.6105 0.900002" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ color:'#444746', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>Auto schedule</span>
                  </div>
                </div>

                {/* Row 2: suggestions dropdown, enable notifications */}
                <div style={{ display:'flex', gap:'28px', alignItems:'center' }}>
                  <div style={{
                    background:'#DEE3EA', height:'50px', width:'185px', borderRadius:'3.746px',
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    gap:'10px', cursor:'pointer',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background='#C0C4CA'}
                    onMouseLeave={e => e.currentTarget.style.background='#DEE3EA'}>
                    <span style={{ color:'#444746', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>{suggestions}</span>
                    <img src="/assets/dropdown-arrow.svg" alt="" style={{ width:'13.111px', height:'7.492px', flexShrink:0 }} />
                  </div>
                  {/* Enable notifications checkbox */}
                  <div style={{ display:'flex', gap:'14px', alignItems:'center', cursor:'pointer' }}
                    onClick={() => setEnableNotifications(v => !v)}>
                    <div style={{
                      width:'25px', height:'25px', flexShrink:0, boxSizing:'border-box',
                      border: enableNotifications ? 'none' : '2px solid #444746', borderRadius:'2px',
                      background: enableNotifications ? '#1a73e8' : 'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {enableNotifications && <svg width="14" height="11" viewBox="0 0 15 12" fill="none"><path d="M0.900391 6.46069L4.87231 10.4326L13.6105 0.900002" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ color:'#444746', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>Enable notifications</span>
                  </div>
                </div>
              </div>
            ) : (
              <span style={{ color:'#444746', fontSize:'21.304px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap', lineHeight:'39.269px' }}>
                Voting
              </span>
            )}
          </div>

          {/* Guests row */}
          <div ref={guestsRowRef}
            onMouseEnter={e => { if (!guestsOpen) e.currentTarget.style.background='#DEE3EA' }}
            onMouseLeave={e => { if (!guestsOpen) e.currentTarget.style.background='transparent' }}
            onMouseDown={e => { if (!guestsOpen) { e.stopPropagation(); e.currentTarget.style.background='transparent'; setGuestsOpen(true); setTimeFrameOpen(false); setVotingOpen(false) } }}
            style={{ display:'flex', gap:'35px', alignItems: guestsOpen ? 'flex-start' : 'center', borderRadius:'10px', padding:'13px 16px', margin:'-13px -16px', cursor:'pointer', background:'transparent' }}>
            <img src="/assets/guests.svg" alt=""
              style={{ width:'31.025px', height:'31.025px', flexShrink:0, marginTop: guestsOpen ? '4px' : '0' }} />
            {guestsOpen ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                {/* Guest + group chips */}
                {(guests.length > 0 || selectedGroups.size > 0) && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                    {guests.map(g => (
                      <div key={g} style={{
                        background:'#e8eaed', borderRadius:'20px',
                        padding:'7px 16px', display:'inline-flex', alignItems:'center', gap:'10px',
                      }}>
                        <span style={{ color:'#444746', fontSize:'17px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>{g}</span>
                        <span onClick={() => setGuests(prev => prev.filter(x => x !== g))}
                          style={{ color:'#444746', fontSize:'16px', cursor:'pointer', lineHeight:1, marginTop:'-1px' }}>✕</span>
                      </div>
                    ))}
                    {[...selectedGroups].map(g => (
                      <div key={g} style={{
                        background:'#e8eaed', borderRadius:'20px',
                        padding:'7px 16px', display:'inline-flex', alignItems:'center', gap:'10px',
                      }}>
                        <span style={{ color:'#444746', fontSize:'17px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>{g}</span>
                        <span onClick={() => setSelectedGroups(prev => { const n = new Set(prev); n.delete(g); return n })}
                          style={{ color:'#444746', fontSize:'16px', cursor:'pointer', lineHeight:1, marginTop:'-1px' }}>✕</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Two boxes: Add guests input + Add group */}
                <div style={{ display:'flex', gap:'17px', alignItems:'center' }}>
                  {/* Add guests input box */}
                  <div onClick={() => guestInputRef.current?.focus()}
                    style={{
                      background:'#DEE3EA', height:'56px', width:'281px', borderRadius:'3.746px',
                      display:'flex', alignItems:'center', paddingLeft:'22px', paddingRight:'14px',
                      boxSizing:'border-box', cursor:'text', flexShrink:0,
                    }}>
                    <input
                      ref={guestInputRef}
                      value={guestInput}
                      onChange={e => {
                        const v = e.target.value
                        if (v.endsWith(',')) { commitGuest(v); return }
                        setGuestInput(v)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { commitGuest(guestInput); e.preventDefault() }
                        if (e.key === 'Backspace' && guestInput === '' && guests.length > 0)
                          setGuests(prev => prev.slice(0, -1))
                      }}
                      onFocus={() => setGuestFocused(true)}
                      onBlur={() => setGuestFocused(false)}
                      placeholder="Add guests"
                      style={{
                        flex:1, background:'transparent', border:'none', outline:'none',
                        color:'#5f6368', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif",
                        caretColor:'#1a73e8', padding:0,
                      }}
                    />
                  </div>
                  {/* Add group box */}
                  <div ref={addGroupBtnRef}
                    onClick={() => {
                      if (!groupDropOpen && addGroupBtnRef.current) {
                        const r = addGroupBtnRef.current.getBoundingClientRect()
                        setGroupDropPos({ left: r.left, top: r.bottom + 8 })
                      }
                      setGroupDropOpen(o => !o)
                    }}
                    style={{
                      background:'#DEE3EA', height:'56px', width:'281px', borderRadius:'3.746px',
                      display:'flex', alignItems:'center', paddingLeft:'22px',
                      cursor:'pointer', flexShrink:0,
                    }}>
                    <span style={{ color:'#5f6368', fontSize:'19.854px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>Add group</span>
                  </div>
                </div>
                {/* Group dropdown */}
                {groupDropOpen && (
                  <div ref={groupDropRef} style={{
                    position:'fixed', left:`${groupDropPos.left}px`, top:`${groupDropPos.top}px`, zIndex:400,
                    width:'440px', background:'#ffffff', borderRadius:'8px',
                    boxShadow:'0 0 10px 2px rgba(0,0,0,0.1)',
                    overflow:'hidden', display:'flex', flexDirection:'column',
                  }}>
                    {GROUP_OPTIONS.map((name, idx) => {
                      const checked = selectedGroups.has(name)
                      const isFirst = idx === 0
                      return (
                        <div key={name}
                          style={{ display:'flex', gap:'16px', alignItems:'center', cursor:'pointer',
                            padding: isFirst ? '18px 24px 12px' : '12px 24px',
                            borderRadius: isFirst ? '8px 8px 0 0' : '0' }}
                          onClick={() => setSelectedGroups(prev => {
                            const n = new Set(prev)
                            if (n.has(name)) n.delete(name); else n.add(name)
                            return n
                          })}
                          onMouseEnter={e => e.currentTarget.style.background='#DEE3EA'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <div style={{
                            width:'28px', height:'28px', flexShrink:0, boxSizing:'border-box',
                            border: checked ? 'none' : '2px solid #444746', borderRadius:'2px',
                            background: checked ? '#1a73e8' : 'transparent',
                            display:'flex', alignItems:'center', justifyContent:'center',
                          }}>
                            {checked && <svg width="15" height="12" viewBox="0 0 15 12" fill="none"><path d="M0.900391 6.46069L4.87231 10.4326L13.6105 0.900002" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{ color:'#444746', fontSize:'21px', fontFamily:"'Google Sans','Arimo',sans-serif" }}>{name}</span>
                        </div>
                      )
                    })}
                    <div style={{ display:'flex', gap:'16px', alignItems:'center', cursor:'pointer', padding:'12px 24px 18px' }}
                      onMouseEnter={e => e.currentTarget.style.background='#DEE3EA'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <div style={{ width:'28px', height:'28px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ color:'#1a73e8', fontSize:'24px', lineHeight:1 }}>+</span>
                      </div>
                      <span style={{ color:'#1967d2', fontSize:'19px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>Add new group</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span style={{ color:'#444746', fontSize:'21.304px', fontFamily:"'Google Sans','Arimo',sans-serif",
                whiteSpace:'nowrap', cursor:'pointer', lineHeight:'31.025px' }}>
                Add guests
              </span>
            )}
          </div>

          {/* Other rows */}
          {[
            { icon:'/assets/google-meet.svg', label:'Add Google Meet video conferencing' },
            { icon:'/assets/location.svg',    label:'Add location' },
            { icon:'/assets/description.svg', label:'Add description or a Google Drive attachment' },
          ].map(({ icon, label }) => (
            <div key={label}
              onMouseEnter={e => e.currentTarget.style.background='#DEE3EA'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}
              style={{ display:'flex', gap:'35px', alignItems:'center', borderRadius:'8px', padding:'10px 12px', margin:'-10px -12px', cursor:'pointer' }}>
              <img src={icon} alt="" style={{ width:'31.025px', height:'31.025px', flexShrink:0 }} />
              <span style={{ color:'#444746', fontSize:'21.304px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>
                {label}
              </span>
            </div>
          ))}

          {/* Calendar row */}
          <div
            onMouseEnter={e => e.currentTarget.style.background='#DEE3EA'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}
            style={{ display:'flex', gap:'35px', alignItems:'center', borderRadius:'8px', padding:'10px 12px', margin:'-10px -12px', cursor:'pointer' }}>
            <img src="/assets/calendar-icon.svg" alt="" style={{ width:'31.025px', height:'31.025px', flexShrink:0 }} />
            <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <span style={{ color:'#444746', fontSize:'21.304px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>Ucla Events</span>
                <img src="/assets/calendar-color.svg" alt="" style={{ width:'20.684px', height:'20.684px' }} />
              </div>
              <span style={{ color:'#444746', fontSize:'18.408px', fontFamily:"'Google Sans','Arimo',sans-serif" }}>
                Busy · Default visibility · Notify 10 minutes before
              </span>
            </div>
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div style={{ position:'absolute', left:'723.93px', top:`${actionsTop}px`, width:'299.912px', height:'78.598px',
          transition:'top 150ms ease' }}>
          <span style={{ position:'absolute', left:'20.68px', top:'26.89px', color:'#1a73e8', fontSize:'21.304px', fontFamily:"'Google Sans','Arimo',sans-serif", cursor:'pointer' }}>
            More options
</span>
          <div onClick={() => onSave && onSave({ title, startDate, endDate })} style={{
            position:'absolute', left:'182.02px', top:'10.34px',
            width:'117.896px', height:'59.982px',
            background:'#1a73e8', borderRadius:'31.025px',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer',
          }}>
            <span style={{ color:'#ffffff', fontSize:'21.304px', fontFamily:"'Google Sans','Arimo',sans-serif" }}>Save</span>
          </div>
        </div>
      </div>
    </>
  )
}
