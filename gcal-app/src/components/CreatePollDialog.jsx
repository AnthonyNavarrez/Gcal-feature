import { useRef, useState, useEffect } from 'react'
import styles from './CreatePollDialog.module.css'

const TODAY = new Date(2026, 10, 10) // Nov 10 2026

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
      background: '#2d2f31',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      zIndex: 200,
      padding: '12px',
      boxSizing: 'border-box',
      fontFamily: "'Arimo',sans-serif",
    }} onClick={e => e.stopPropagation()}>
      {/* Month navigation */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px', paddingLeft:'4px' }}>
        <span style={{ color:'#e3e3e3', fontSize:'16px', fontWeight:500 }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div style={{ display:'flex', gap:'4px' }}>
          {['‹','›'].map((arrow, i) => (
            <button key={arrow} onClick={i === 0 ? prevMonth : nextMonth} style={{
              background:'none', border:'none', color:'#c4c7c5', fontSize:'20px',
              cursor:'pointer', width:'32px', height:'32px', borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center',
              lineHeight:1,
            }}
            onMouseEnter={e => e.currentTarget.style.background='#3c4043'}
            onMouseLeave={e => e.currentTarget.style.background='none'}
            >{arrow}</button>
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:'4px' }}>
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} style={{ textAlign:'center', color:'#9aa0a6', fontSize:'13px', paddingBottom:'4px' }}>{d}</div>
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

          let bg = 'none', color = '#e3e3e3', cursor = 'pointer'
          if (isSelected) { bg = '#1a73e8'; color = '#fff' }
          else if (isToday) { bg = '#aecbfa'; color = '#18315d' }
          if (isDisabled) { color = '#5f6368'; cursor = 'default' }

          return (
            <div key={i} style={{
              textAlign:'center', fontSize:'14px', color, cursor,
              height:`${cellSize}px`, display:'flex', alignItems:'center', justifyContent:'center',
            }}
            onClick={() => { if (!isDisabled) onSelect(thisDate) }}
            onMouseEnter={e => { if (!isDisabled && !isSelected) e.currentTarget.style.background='#3c4043'; e.currentTarget.style.borderRadius='50%' }}
            onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#1a73e8' : isToday ? '#aecbfa' : 'none' }}
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

export default function CreatePollDialog({ onClose, onCustomize, onAddGroup, onSave, addedGroups = [] }) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [timeFrameOpen, setTimeFrameOpen] = useState(false)
  const [guestsOpen, setGuestsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [titleFocused, setTitleFocused] = useState(false)
  const [startDate, setStartDate] = useState(new Date(2026, 10, 10))
  const [endDate, setEndDate] = useState(new Date(2026, 10, 10))
  const [openPicker, setOpenPicker] = useState(null) // 'start' | 'end' | null
  const [calendarPos, setCalendarPos] = useState({ left: 0, top: 0 })
  const [duration, setDuration] = useState('1 hr')
  const [durationOpen, setDurationOpen] = useState(false)
  const [durationCustom, setDurationCustom] = useState('')
  const [durationDropPos, setDurationDropPos] = useState({ left: 0, top: 0 })
  const titleRef = useRef(null)
  const startBoxRef = useRef(null)
  const endBoxRef = useRef(null)
  const durationBoxRef = useRef(null)
  const durationCustomRef = useRef(null)
  const dragging = useRef(false)
  const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 })

  const groupChipsH  = addedGroups.length > 0 ? 52 : 0
  const dialogHeight = guestsOpen ? 800 + groupChipsH : timeFrameOpen ? 846 : 750
  const actionsTop   = guestsOpen ? 721 + groupChipsH : timeFrameOpen ? 767 : 672.22

  useEffect(() => {
    setPos({
      x: (window.innerWidth  - 1048.658) / 2,
      y: (window.innerHeight - dialogHeight) / 2,
    })
  }, [])

  useEffect(() => {
    if (addedGroups.length > 0) setGuestsOpen(true)
  }, [addedGroups])

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
      <div className={styles.backdrop} onClick={() => { if (openPicker) setOpenPicker(null); else onClose() }} />

      {/* Close layer for all dropdowns */}
      {(openPicker || durationOpen) && (
        <div style={{ position:'fixed', inset:0, zIndex:149 }} onClick={() => { setOpenPicker(null); setDurationOpen(false) }} />
      )}

      {/* Duration dropdown */}
      {durationOpen && (
        <div style={{
          position:'fixed', left: durationDropPos.left, top: durationDropPos.top,
          width:'200px', background:'#1e1f20', borderRadius:'8px',
          boxShadow:'0 6px 24px rgba(0,0,0,0.7)', zIndex:200,
          fontFamily:"'Arimo',sans-serif", overflow:'hidden',
        }} onClick={e => e.stopPropagation()}>
          <div style={{ maxHeight:'260px', overflowY:'auto' }}>
            {/* Custom entry at top */}
            <div style={{
              padding:'14px 20px', cursor:'text',
              background: !DURATION_OPTIONS.includes(duration) ? '#333537' : 'transparent',
              borderBottom:'1px solid #2a2c2e',
            }}>
              <input
                ref={durationCustomRef}
                value={durationCustom}
                onChange={e => setDurationCustom(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitCustomDuration(durationCustom) }}
                placeholder="Custom (e.g. 1 hr 45 min)"
                style={{
                  width:'100%', background:'transparent', border:'none', outline:'none',
                  color:'#e3e3e3', fontSize:'16px', fontFamily:"'Arimo',sans-serif",
                  caretColor:'#aecbfa', padding:0,
                }}
              />
            </div>
            {DURATION_OPTIONS.map(opt => (
              <div key={opt} onClick={() => selectDuration(opt)} style={{
                padding:'14px 20px', cursor:'pointer', fontSize:'16px',
                color:'#e3e3e3',
                background: opt === duration ? '#333537' : 'transparent',
                transition:'background 80ms',
              }}
              onMouseEnter={e => { if (opt !== duration) e.currentTarget.style.background='#2a2c2e' }}
              onMouseLeave={e => { e.currentTarget.style.background = opt === duration ? '#333537' : 'transparent' }}
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
              color: title || titleFocused ? '#e3e3e3' : '#c4c7c5',
              fontSize:'34.128px', fontFamily:"'Arimo',sans-serif",
              caretColor:'#aecbfa', padding:0,
            }}
          />
          <div style={{ position:'absolute', background:'#3c4043', height:'1.241px', left:'2.07px', top:'49.64px', width:'922.488px' }} />
          <div style={{ position:'absolute', background:'#1e5079', height:'53.777px', left:'2.07px', top:'76.53px', width:'78.598px', borderRadius:'10.342px' }} />
          {[
            { label:'Event',                x:12.41  },
            { label:'Task',                 x:103.42 },
            { label:'Out of office',        x:186.15 },
            { label:'Focus time',           x:345.42 },
            { label:'Working location',     x:488.13 },
            { label:'Appointment schedule', x:690.83 },
          ].map(({ label, x }, i) => (
            <span key={label} style={{
              position:'absolute', left:`${x}px`, top:'91.01px',
              color: i === 0 ? '#c2e7ff' : '#c4c7c5',
              fontSize:'20.684px', fontFamily:"'Arimo',sans-serif", whiteSpace:'nowrap',
            }}>{label}</span>
          ))}
        </div>

        {/* ── FORM ROWS ── */}
        <div style={{ position:'absolute', left:'49px', top:'268px', display:'flex', flexDirection:'column', gap:'34px' }}>

          {/* Time Frame row */}
          <div style={{ display:'flex', gap:'25px', alignItems:'flex-start' }}
               onClick={() => setTimeFrameOpen(o => !o)}>
            <img src="/assets/event-time.svg" alt=""
              style={{ width:'31.025px', height:'31.025px', flexShrink:0, cursor:'pointer', marginTop:'4px' }} />

            {timeFrameOpen ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'18px' }}>
                {/* Date range row */}
                <div style={{ display:'flex', gap:'9px', alignItems:'center' }} onClick={e => e.stopPropagation()}>
                  {/* Start date box */}
                  <div ref={startBoxRef} onClick={e => togglePicker('start', e)} style={{
                    background: openPicker === 'start' ? '#3f4347' : '#333638',
                    height:'56.191px', borderRadius:'3.746px',
                    display:'inline-flex', alignItems:'center',
                    padding:'0 22px', cursor:'pointer',
                    outline: openPicker === 'start' ? '2px solid #aecbfa' : 'none',
                  }}>
                    <span style={{ color:'#e3e3e3', fontSize:'19.854px', fontFamily:"'Arimo',sans-serif", whiteSpace:'nowrap' }}>
                      {formatDate(startDate)}
                    </span>
                  </div>

                  <span style={{ color:'#e3e3e3', fontSize:'21.511px', fontFamily:"'Arimo',sans-serif" }}>-</span>

                  {/* End date box */}
                  <div ref={endBoxRef} onClick={e => togglePicker('end', e)} style={{
                    background: openPicker === 'end' ? '#3f4347' : '#333638',
                    height:'56.191px', borderRadius:'3.746px',
                    display:'inline-flex', alignItems:'center',
                    padding:'0 22px', cursor:'pointer',
                    outline: openPicker === 'end' ? '2px solid #aecbfa' : 'none',
                  }}>
                    <span style={{ color:'#e3e3e3', fontSize:'19.854px', fontFamily:"'Arimo',sans-serif", whiteSpace:'nowrap' }}>
                      {formatDate(endDate)}
                    </span>
                  </div>
                </div>

                {/* Duration + padding row */}
                <div style={{ display:'flex', gap:'19px', alignItems:'center' }}>
                  <div ref={durationBoxRef} onClick={openDurationDrop} style={{
                    background: durationOpen ? '#3f4347' : '#333638',
                    height:'56px', borderRadius:'3.746px', display:'inline-flex', alignItems:'center',
                    padding:'0 18px 0 22px', gap:'12px', cursor:'pointer',
                    outline: durationOpen ? '2px solid #aecbfa' : 'none',
                  }}>
                    <span style={{ color:'#c4c7c5', fontSize:'19.854px', fontFamily:"'Arimo',sans-serif", whiteSpace:'nowrap' }}>{duration}</span>
                    <img src="/assets/dropdown-arrow.svg" alt="" style={{ width:'13.111px', height:'7.492px', flexShrink:0 }} />
                  </div>
                  <div style={{ background:'#333638', height:'56px', width:'212px',
                    borderRadius:'3.746px', display:'flex', alignItems:'center',
                    paddingLeft:'22px', paddingRight:'26px', boxSizing:'border-box', gap:'27px' }}>
                    <span style={{ color:'#c4c7c5', fontSize:'19.854px', fontFamily:"'Arimo',sans-serif" }}>Time padding</span>
                    <img src="/assets/dropdown-arrow.svg" alt="" style={{ width:'13.111px', height:'7.492px', flexShrink:0 }} />
                  </div>
                  <span style={{ color:'#aecbfa', fontSize:'22px', fontFamily:"'Arimo',sans-serif", whiteSpace:'nowrap', cursor:'pointer' }}
                    onClick={e => { e.stopPropagation(); onCustomize && onCustomize({ startDate, endDate }) }}>
                    Customize availability
                  </span>
                </div>
              </div>
            ) : (
              <span style={{ color:'#c4c7c5', fontSize:'21.304px', fontFamily:"'Arimo',sans-serif",
                whiteSpace:'nowrap', cursor:'pointer', lineHeight:'39.269px' }}>
                Time Frame
              </span>
            )}
          </div>

          {/* Guests row */}
          <div style={{ display:'flex', gap:'35px', alignItems:'flex-start' }}>
            <img src="/assets/guests.svg" alt=""
              style={{ width:'31.025px', height:'31.025px', flexShrink:0, marginTop:'4px' }} />
            {guestsOpen ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'20px', width:'911px' }}>
                {addedGroups.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                    {addedGroups.map(g => (
                      <div key={g} style={{
                        background:'#3c4043', borderRadius:'20px',
                        padding:'7px 16px', display:'inline-flex', alignItems:'center',
                      }}>
                        <span style={{ color:'#e3e3e3', fontSize:'17px', fontFamily:"'Arimo',sans-serif", whiteSpace:'nowrap' }}>{g}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background:'#333638', height:'56px', borderRadius:'3.746px',
                  display:'flex', alignItems:'center', paddingLeft:'22px', boxSizing:'border-box' }}>
                  <span style={{ color:'#b7bab8', fontSize:'19.854px', fontFamily:"'Arimo',sans-serif" }}>Add guests</span>
                </div>
                <span style={{ color:'#aecbfa', fontSize:'22px', fontFamily:"'Arimo',sans-serif", cursor:'pointer' }}
                  onClick={() => onAddGroup && onAddGroup()}>
                  Add group
                </span>
              </div>
            ) : (
              <span style={{ color:'#c4c7c5', fontSize:'21.304px', fontFamily:"'Arimo',sans-serif",
                whiteSpace:'nowrap', cursor:'pointer', lineHeight:'31.025px' }}
                onClick={() => { setGuestsOpen(true); setTimeFrameOpen(false) }}>
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
            <div key={label} style={{ display:'flex', gap:'35px', alignItems:'center' }}>
              <img src={icon} alt="" style={{ width:'31.025px', height:'31.025px', flexShrink:0 }} />
              <span style={{ color:'#c4c7c5', fontSize:'21.304px', fontFamily:"'Arimo',sans-serif", whiteSpace:'nowrap' }}>
                {label}
              </span>
            </div>
          ))}

          {/* Calendar row */}
          <div style={{ display:'flex', gap:'35px', alignItems:'center' }}>
            <img src="/assets/calendar-icon.svg" alt="" style={{ width:'31.025px', height:'31.025px', flexShrink:0 }} />
            <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <span style={{ color:'#e3e3e3', fontSize:'21.304px', fontFamily:"'Arimo',sans-serif", whiteSpace:'nowrap' }}>Ucla Events</span>
                <img src="/assets/calendar-color.svg" alt="" style={{ width:'20.684px', height:'20.684px' }} />
              </div>
              <span style={{ color:'#c4c7c5', fontSize:'18.408px', fontFamily:"'Arimo',sans-serif" }}>
                Busy · Default visibility · Notify 10 minutes before
              </span>
            </div>
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div style={{ position:'absolute', left:'723.93px', top:`${actionsTop}px`, width:'299.912px', height:'78.598px',
          transition:'top 150ms ease' }}>
          <span style={{ position:'absolute', left:'20.68px', top:'26.89px', color:'#aecbfa', fontSize:'21.304px', fontFamily:"'Arimo',sans-serif", cursor:'pointer' }}>
            More options
          </span>
          <div onClick={() => onSave && onSave({ title, startDate, endDate })} style={{
            position:'absolute', left:'182.02px', top:'10.34px',
            width:'117.896px', height:'59.982px',
            background:'#aecbfa', borderRadius:'31.025px',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer',
          }}>
            <span style={{ color:'#18315d', fontSize:'21.304px', fontFamily:"'Arimo',sans-serif" }}>Save</span>
          </div>
        </div>
      </div>
    </>
  )
}
