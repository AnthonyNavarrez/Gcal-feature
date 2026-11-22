import { useState, useRef, useEffect } from 'react'
import styles from './DefaultScreen.module.css'
import CreatePollDialog from './CreatePollDialog'

// Column x-boundaries (original Figma coords) — one divider per gap
const DIVIDERS = [97.04, 283.66, 470.29, 656.91, 843.53, 1030.15, 1216.77, 1403.39]

const DEMO_PEOPLE = [
  { initial:'A', color:'#285c9a', email:'pnav6546@g.ucla.edu' },
  { initial:'J', color:'#d28045', email:'jasonyu29@g.ucla.edu' },
  { initial:'M', color:'#9e9e9e', email:'Muyitang@gmail.com' },
  { initial:'S', color:'#9e9e9e', email:'Shaktiwid@g.ucla.com' },
]

// Week dates: Sun Nov 8 → Sat Nov 14, 2026
const WEEK_DAYS = [
  new Date(2026,10, 8), new Date(2026,10, 9), new Date(2026,10,10),
  new Date(2026,10,11), new Date(2026,10,12), new Date(2026,10,13), new Date(2026,10,14),
]

// All calendar events: [origL, origT, h]  (original Figma coords, before nX / tG)
const EVENT_BLOCKS = [
  [ 98.91,  544.93,  55.986],  // Sun – BChat Design Meeting
  [285.53,  184.75,  46.655],  // Mon – Math 33A Lec
  [294.86,  230.66,  54.867],  // Mon – Doctors app
  [285.53,  725.96, 119.438],  // Mon – PS General Meeting
  [369.88,  725.96, 153.029],  // Mon – ACM Design
  [285.53,  846.51,  44.789],  // Mon – Enrollment
  [472.15,  485.21, 106.001],  // Tue – CS M51A Lec
  [472.15,  605.40, 106.001],  // Tue – CS 180 Lec
  [472.15,  725.96,  55.986],  // Tue – ACM Design Track
  [472.15,  785.67,  57.853],  // Tue – Big + Lit
  [555.38,  785.67,  57.853],  // Tue – DevX GB
  [658.77,  184.75,  46.655],  // Wed – Math 33A Lec
  [658.77,  785.67,  57.853],  // Wed – ACM Design Dev T
  [845.39,  184.75,  46.655],  // Thu – Math 33A Disc
  [845.39,  485.21, 106.001],  // Thu – CS M51A Lec
  [845.39,  605.40, 106.001],  // Thu – CS 180 Lec
  [845.39,  846.51,  37.324],  // Thu – PD Cohort Meeting
  [1032.01, 151.16,  26.873],  // Fri – Coffee chat
  [1032.01, 184.75,  46.655],  // Fri – Math 33A Lec
  [1032.01, 365.78, 106.001],  // Fri – CS M51A Disc
  [1032.01, 485.21, 106.001],  // Fri – CS 180 Disc
  [1032.01, 605.40, 117.571],  // Fri – Climbing Social
  [1218.64, 846.51,  37.324],  // Sat – Big and little
]

function dayMs(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }

// Demo group availability slots shown when event poll is active.
// colIdx matches DIVIDERS columns (0=Sun…6=Sat).
// s/e are scroll-body y coords (12 AM = 0, each hour = 60.09px).
// Multiple overlapping blocks per column create the layered "more people" effect.
const GROUP_DEMO_SLOTS = [
  { colIdx:0, s:300, e:899 },
  { colIdx:0, s:721, e:963 },
  { colIdx:0, s:963, e:1382 },
  { colIdx:1, s:421, e:537 },
  { colIdx:1, s:480, e:920 },
  { colIdx:1, s:648, e:1077 },
  { colIdx:1, s:729, e:1322 },
  { colIdx:2, s:360, e:834 },
  { colIdx:2, s:1056, e:1382 },
  { colIdx:3, s:421, e:1135 },
  { colIdx:3, s:601, e:841 },
  { colIdx:3, s:721, e:1382 },
  { colIdx:4, s:300, e:537 },
  { colIdx:4, s:480, e:838 },
  { colIdx:4, s:658, e:1262 },
  { colIdx:4, s:1043, e:1322 },
  { colIdx:5, s:360, e:722 },
  { colIdx:5, s:1082, e:1382 },
]

function mergeSlots(arr) {
  const byCol = {}
  for (const sl of arr) {
    if (sl.e - sl.s < 2) continue
    ;(byCol[sl.colIdx] = byCol[sl.colIdx] || []).push({ ...sl })
  }
  const result = []
  for (const ci of Object.keys(byCol)) {
    const sorted = byCol[ci].sort((a, b) => a.s - b.s)
    const merged = []
    for (const sl of sorted) {
      if (!merged.length || sl.s > merged[merged.length - 1].e + 1)
        merged.push({ ...sl })
      else
        merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, sl.e)
    }
    result.push(...merged)
  }
  return result
}

export default function DefaultScreen() {
  const [pollOpen, setPollOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [selectGroupOpen, setSelectGroupOpen] = useState(false)
  const [rangeStart, setRangeStart] = useState(null)
  const [savedSlots, setSavedSlots] = useState(null)
  const [rangeEnd,   setRangeEnd]   = useState(null)
  const [slots, setSlots] = useState([])
  const [checkedGroups, setCheckedGroups] = useState(new Set())
  const [confirmedGroups, setConfirmedGroups] = useState([])
  const [savedPoll, setSavedPoll] = useState(null) // { title }
  const [pollListOpen, setPollListOpen] = useState(false)
  const [createdPolls, setCreatedPolls] = useState([])
  const [hiddenPolls, setHiddenPolls] = useState(new Set())
  const [calendarPollEvents, setCalendarPollEvents] = useState([])
  const [checkedTimeOptions, setCheckedTimeOptions] = useState(new Set())
  const [availTooltip, setAvailTooltip] = useState(null)
  const [hoveredSlot, setHoveredSlot] = useState(null)
  const [hoveredPoll, setHoveredPoll] = useState(null)
  const [pendingEventPopup, setPendingEventPopup] = useState(null)
  const nextId = useRef(0)
  const dragRef = useRef({ active: false })
  const dragHandlersRef = useRef({})

  const weekCalStyle = pollOpen
    ? { left: '381.3px', width: '964.477px', height: '871.02px',
        borderRadius: '52.336px 52.336px 44.859px 44.859px' }
    : { left: '380.71px', width: '1433.25px', height: '877.119px',
        borderRadius: '52.254px' }

  const googleAppsLeft = pollOpen ? '1839.23px' : '1826px'

  const nX = (x) => pollOpen ? 0.6511 * x + 34.01 : x
  const nW = (w) => pollOpen ? 0.6511 * w : w

  // Grid: 12 AM at y=0, each hour = 60.09px; 9 AM is at y = 9 * 60.09
  const HOUR_H = 60.09
  const GRID_TOP = 149.3   // header height
  const GRID_1AM = 8.5 * HOUR_H  // scroll-body y of 9 AM (offset corrected -30 min)
  // convert original weekCal `top` values into scroll-body coordinates
  const tG = (t) => t - GRID_TOP + GRID_1AM

  // Returns free-time intervals for a day column, in tG (scroll-body) coordinates.
  // Each event gets a 5-minute buffer (HOUR_H/12) on both sides.
  function getFreeSlots(colIdx) {
    const PAD = HOUR_H / 12  // 5 min in px
    const xL = DIVIDERS[colIdx], xR = DIVIDERS[colIdx + 1]
    const busy = EVENT_BLOCKS
      .filter(([l]) => l > xL && l < xR)
      .map(([, t, h]) => ({ s: tG(t) - PAD, e: tG(t) + h + PAD }))
      .sort((a, b) => a.s - b.s)
    const merged = []
    for (const iv of busy) {
      if (!merged.length || iv.s > merged[merged.length - 1].e)
        merged.push({ s: iv.s, e: iv.e })
      else
        merged[merged.length - 1].e = Math.max(merged[merged.length - 1].e, iv.e)
    }
    const GRID_END = 24 * HOUR_H
    const free = []
    let cur = 0
    for (const { s, e } of merged) {
      const clampedS = Math.max(s, 0)
      if (clampedS > cur + 1) free.push({ s: cur, e: clampedS })
      cur = Math.max(cur, Math.min(e, GRID_END))
    }
    if (cur < GRID_END - 1) free.push({ s: cur, e: GRID_END })
    return free
  }

  function colInRange(ci) {
    if (!rangeStart || !rangeEnd) return false
    const dt = dayMs(WEEK_DAYS[ci])
    return dt >= dayMs(rangeStart) && dt <= dayMs(rangeEnd)
  }

  function getScrollY(clientY) {
    if (!scrollBodyRef.current) return 0
    const rect = scrollBodyRef.current.getBoundingClientRect()
    return (clientY - rect.top) / (window.innerWidth / 1911) + scrollBodyRef.current.scrollTop
  }

  function getColAtX(clientX) {
    if (!scrollBodyRef.current) return -1
    const rect = scrollBodyRef.current.getBoundingClientRect()
    const relX = (clientX - rect.left) / (window.innerWidth / 1911)
    for (let i = 0; i < DIVIDERS.length - 1; i++) {
      if (relX >= nX(DIVIDERS[i]) && relX < nX(DIVIDERS[i + 1])) return i
    }
    return -1
  }

  function computeDefaultSlots(startDate, endDate) {
    const result = []
    WEEK_DAYS.forEach((d, ci) => {
      if (dayMs(d) >= dayMs(startDate) && dayMs(d) <= dayMs(endDate))
        getFreeSlots(ci).forEach(({ s, e }) =>
          result.push({ id: nextId.current++, colIdx: ci, s, e })
        )
    })
    return result
  }

  function initSlots(startDate, endDate) {
    if (savedSlots) {
      setSlots(savedSlots.map(sl => ({ ...sl, id: nextId.current++ })))
    } else {
      setSlots(computeDefaultSlots(startDate, endDate))
    }
  }

  function startResizeDrag(e, slotId, mode) {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = { active: true, mode, slotId, startY: getScrollY(e.clientY) }
    const { handleMove, handleUp } = dragHandlersRef.current
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  function handleBodyMouseDown(e) {
    if (!customizeOpen) return
    const ci = getColAtX(e.clientX)
    if (ci < 0 || !colInRange(ci)) return
    e.preventDefault()
    const y = getScrollY(e.clientY)
    const id = nextId.current++
    setSlots(prev => [...prev, { id, colIdx: ci, s: y, e: y }])
    dragRef.current = { active: true, mode: 'create', slotId: id, startY: y }
    const { handleMove, handleUp } = dragHandlersRef.current
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const scrollBodyRef = useRef(null)
  useEffect(() => {
    if (scrollBodyRef.current) scrollBodyRef.current.scrollTop = 8 * HOUR_H
  }, [])

  useEffect(() => {
    const GRID_END = 24 * 60.09
    const handleMove = (e) => {
      const d = dragRef.current
      if (!d.active) return
      const rect = scrollBodyRef.current?.getBoundingClientRect()
      if (!rect) return
      const y = (e.clientY - rect.top) / (window.innerWidth / 1911) + scrollBodyRef.current.scrollTop
      setSlots(prev => prev.map(sl => {
        if (sl.id !== d.slotId) return sl
        if (d.mode === 'resize-top')
          return { ...sl, s: Math.max(0, Math.min(y, sl.e - 2)) }
        if (d.mode === 'resize-bottom')
          return { ...sl, e: Math.min(GRID_END, Math.max(y, sl.s + 2)) }
        if (d.mode === 'create')
          return { ...sl, s: Math.max(0, Math.min(y, d.startY)), e: Math.min(GRID_END, Math.max(y, d.startY)) }
        return sl
      }))
    }
    const handleUp = () => {
      if (!dragRef.current.active) return
      dragRef.current.active = false
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      setSlots(prev => mergeSlots(prev))
    }
    dragHandlersRef.current = { handleMove, handleUp }
  }, [])

  return (
    <div className={styles.root}>

      {/* ── TOP TOOLBAR ── */}
      <div className={styles.topToolbar}>
        <img src="/assets/main-menu.svg" alt="" style={{left:'37.32px',top:'29.86px',width:'29.859px',height:'29.859px'}} />
        <img src="/assets/calendar-mark-light.png" alt="" style={{left:'100.78px',top:'22.93px',width:'48px',height:'48px'}} />
        <span className={styles.txt} style={{left:'167.96px',top:'30.88px',color:'#202124',fontSize:'32.099px'}}>Calendar</span>
        <div style={{position:'absolute',left:'380.71px',top:'14.93px',width:'134.367px',height:'63.451px',
          border:'1.493px solid #dadce0',borderRadius:'37.324px'}} />
        <span className={styles.txt} style={{left:'418.03px',top:'33.59px',color:'#202124',fontSize:'20.902px'}}>Today</span>
        <img src="/assets/previous-week.svg" alt="" style={{left:'556.13px',top:'29.86px',width:'26.127px',height:'26.127px'}} />
        <img src="/assets/next-week.svg"     alt="" style={{left:'604.65px',top:'29.86px',width:'26.127px',height:'26.127px'}} />
        <span className={styles.txt} style={{left:'668.1px',top:'27.99px',color:'#202124',fontSize:'31.352px'}}>November 2026</span>
        <img src="/assets/search.svg"   alt="" style={{left:'1067.47px',top:'29.86px',width:'29.859px',height:'29.859px'}} />
        <img src="/assets/help.svg"     alt="" style={{left:'1130.92px',top:'29.86px',width:'29.859px',height:'29.859px'}} />
        <img src="/assets/settings.svg" alt="" style={{left:'1198.11px',top:'29.86px',width:'29.859px',height:'29.859px'}} />
        <div style={{position:'absolute',left:'1265.29px',top:'14.93px',width:'149.297px',height:'63.451px',
          border:'1.493px solid #dadce0',borderRadius:'37.324px'}} />
        <span className={styles.txt} style={{left:'1298.88px',top:'33.59px',color:'#202124',fontSize:'21.275px'}}>Week</span>
        <img src="/assets/view-menu.svg" alt="" style={{left:'1369.8px',top:'33.59px',width:'18.662px',height:'18.662px'}} />
        <div style={{position:'absolute',left:'1433.25px',top:'14.93px',width:'156.762px',height:'63.451px',
          border:'1.493px solid #dadce0',borderRadius:'37.324px'}} />
        <div style={{position:'absolute',left:'1433.25px',top:'14.93px',width:'78.381px',height:'63.451px',
          background:'#d3e3fd',borderRadius:'37.324px'}} />
        <img src="/assets/calendar-view.svg" alt="" style={{left:'1459.38px',top:'29.86px',width:'26.127px',height:'26.127px'}} />
        <img src="/assets/task-view.svg"     alt="" style={{left:'1534.03px',top:'29.86px',width:'29.859px',height:'29.859px'}} />
        {[
          [1623.6,29.86],[1632.19,29.86],[1640.77,29.86],
          [1623.6,38.44],[1632.19,38.44],[1640.77,38.44],
          [1623.6,47.03],[1632.19,47.03],[1640.77,47.03],
        ].map(([l,t],i) => (
          <div key={i} style={{position:'absolute',background:'#202124',borderRadius:'2.239px',
            width:'4.479px',height:'4.479px',left:`${l}px`,top:`${t}px`}} />
        ))}
        <div style={{position:'absolute',left:'1679.59px',top:'11.2px',width:'212.748px',height:'70.916px',
          border:'1.493px solid #dadce0',borderRadius:'44.789px'}} />
        <img src="/assets/ucla-brand-light.png" alt="" style={{left:'1701.98px',top:'25px',width:'101px',height:'43px'}} />
        <img src="/assets/pfp-avatar.png" alt="" style={{position:'absolute',left:'1832.62px',top:'22.39px',width:'48.521px',height:'48.521px',borderRadius:'24.261px',objectFit:'cover'}} />
      </div>

      {/* ── SIDEBAR ── */}
      <div className={styles.sidebar}>
        <div style={{position:'absolute',left:'22.39px',top:'22.39px',width:'205.283px',height:'82.113px',
          background:'#ffffff',borderRadius:'26.127px',boxShadow:'0 1px 3px rgba(60,64,67,0.3)'}} />
        <img src="/assets/create.svg" alt="" style={{left:'44.79px',top:'44.79px',width:'33.592px',height:'33.592px'}} />
        <span className={styles.txt} style={{left:'100.78px',top:'52.25px',color:'#202124',fontSize:'20.155px'}}>Create</span>
        <img src="/assets/view-menu.svg" alt="" style={{left:'182.89px',top:'52.25px',width:'18.662px',height:'18.662px'}} />
        <span className={styles.txt} style={{left:'41.06px',top:'156.76px',color:'#202124',fontSize:'21.275px',fontWeight:700}}>November 2026</span>
        <img src="/assets/previous-month.svg" alt="" style={{left:'276.2px',top:'156.76px',width:'18.662px',height:'18.662px'}} />
        <img src="/assets/next-month.svg"     alt="" style={{left:'320.99px',top:'156.76px',width:'18.662px',height:'18.662px'}} />
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <span key={i} className={styles.txt}
            style={{left:`${44.79+i*46.28}px`,top:'201.55px',color:'#5f6368',fontSize:'16.423px'}}>{d}</span>
        ))}
        {[1,2,3,4,5,6,7].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${44.79+i*46.28}px`,top:'238.88px',color:'#202124',fontSize:'16.049px'}}>{n}</span>
        ))}
        <div style={{position:'absolute',left:'31.7px',top:'269.12px',width:'36.204px',height:'36.204px',
          background:'#1a73e8',borderRadius:'18.102px'}} />
        <span className={styles.txt} style={{left:'44.79px',top:'277.69px',color:'#ffffff',fontSize:'16.049px'}}>8</span>
        <span className={styles.txt} style={{left:'91.07px',top:'277.69px',color:'#202124',fontSize:'16.049px'}}>9</span>
        <span className={styles.txt} style={{left:'133.62px',top:'277.69px',color:'#202124',fontSize:'16.049px'}}>10</span>
        {[11,12,13,14].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${179.9+i*46.28}px`,top:'277.69px',color:'#202124',fontSize:'16.049px'}}>{n}</span>
        ))}
        {[15,16,17,18,19,20,21].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${41.06+i*46.28}px`,top:'316.51px',color:'#202124',fontSize:'16.049px'}}>{n}</span>
        ))}
        {[22,23,24,25,26,27,28].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${41.06+i*46.28}px`,top:'355.33px',color:'#202124',fontSize:'16.049px'}}>{n}</span>
        ))}
        <span className={styles.txt} style={{left:'41.06px',top:'394.14px',color:'#202124',fontSize:'16.049px'}}>29</span>
        <span className={styles.txt} style={{left:'87.34px',top:'394.14px',color:'#202124',fontSize:'16.049px'}}>30</span>
        {[1,2,3,4,5].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${137.35+i*46.28}px`,top:'394.14px',color:'#70757a',fontSize:'16.049px'}}>{n}</span>
        ))}
        {[6,7,8,9,10,11,12].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${44.79+i*46.28}px`,top:'432.96px',color:'#70757a',fontSize:'16.049px'}}>{n}</span>
        ))}
        <span className={styles.txt} style={{left:'41.06px',top:'462.82px',color:'#202124',fontSize:'21.648px',fontWeight:700}}>Meet with...</span>
        <div style={{position:'absolute',left:'41.06px',top:'496.41px',width:'298.594px',height:'59.719px',
          background:'#e9eef6',borderRadius:'3.732px'}} />
        <img src="/assets/people.svg" alt="" style={{left:'63.45px',top:'511.34px',width:'26.127px',height:'26.127px'}} />
        <span className={styles.txt} style={{left:'111.97px',top:'515.07px',color:'#5f6368',fontSize:'20.528px'}}>Search for people</span>
        <span className={styles.txt} style={{left:'41.06px',top:'593.46px',color:'#202124',fontSize:'21.648px'}}>Booking pages</span>
        <img src="/assets/add-booking-page.svg"     alt="" style={{left:'265px',top:'589.72px',width:'26.127px',height:'26.127px'}} />
        <img src="/assets/expand-booking-pages.svg" alt="" style={{left:'313.52px',top:'593.46px',width:'26.127px',height:'26.127px'}} />
        <span className={styles.txt} style={{left:'41.06px',top:'671.84px',color:'#202124',fontSize:'21.648px'}}>Time insights</span>
        <img src="/assets/insights-chart.svg"       alt="" style={{left:'268.73px',top:'668.1px',width:'29.859px',height:'29.859px'}} />
        <img src="/assets/expand-booking-pages.svg" alt="" style={{left:'313.52px',top:'671.84px',width:'26.127px',height:'26.127px'}} />
        <span className={styles.txt} style={{left:'41.06px',top:'750.22px',color:'#202124',fontSize:'22.021px'}}>My calendars</span>
        <img src="/assets/collapse-calendars.svg" alt="" style={{left:'313.52px',top:'750.22px',width:'26.127px',height:'26.127px'}} />
        <div style={{position:'absolute',left:'41.06px',top:'802.47px',width:'25.007px',height:'25.007px',
          background:'#8eb5bd',borderRadius:'1.493px'}} />
        <img src="/assets/selected.svg" alt="" style={{left:'43.67px',top:'805.46px',width:'19.035px',height:'19.035px'}} />
        <span className={styles.txt} style={{left:'82.11px',top:'806.2px',color:'#202124',fontSize:'20.902px'}}>Ucla Events</span>
        <div style={{position:'absolute',left:'41.06px',top:'843.53px',width:'25.007px',height:'25.007px',
          border:'1.493px solid #51a377',borderRadius:'1.493px'}} />
        <span className={styles.txt} style={{left:'82.11px',top:'847.26px',color:'#202124',fontSize:'20.902px'}}>Birthdays</span>
        <div style={{position:'absolute',left:'41.06px',top:'884.58px',width:'25.007px',height:'25.007px',
          background:'#7a9bcd',borderRadius:'1.493px'}} />
        <img src="/assets/selected.svg" alt="" style={{left:'43.67px',top:'887.57px',width:'19.035px',height:'19.035px'}} />
        <span className={styles.txt} style={{left:'82.11px',top:'888.32px',color:'#202124',fontSize:'20.902px'}}>Classes</span>
        <div style={{position:'absolute',left:'369.51px',top:'126.9px',width:'11.197px',height:'466.553px',
          background:'#bdc1c6',borderRadius:'5.599px'}} />
      </div>

      {/* ── WEEK CALENDAR ── */}
      <div className={styles.weekCal} style={weekCalStyle}>

        {/* Fixed day header */}
        <div className={styles.weekCalHeader}>
          {[
            {label:'SUN', num:'8',  lx:173.18, nx:175.42, cx:155.83, lc:'#1967d2', nc:'#ffffff', sel:true},
            {label:'MON', num:'9',  lx:359.81, nx:362.04, cx:342.45, lc:'#5f6368', nc:'#202124'},
            {label:'TUE', num:'10', lx:546.43, nx:541.2,  cx:523.9,  lc:'#5f6368', nc:'#202124'},
            {label:'WED', num:'11', lx:733.05, nx:727.82, cx:710.57, lc:'#5f6368', nc:'#202124'},
            {label:'THU', num:'12', lx:919.67, nx:914.44, cx:897.19, lc:'#5f6368', nc:'#202124'},
            {label:'FRI', num:'13', lx:1106.29,nx:1101.06,cx:1083.81,lc:'#5f6368', nc:'#202124'},
            {label:'SAT', num:'14', lx:1292.91,nx:1287.69,cx:1270.44,lc:'#5f6368', nc:'#202124'},
          ].map(({label,num,lx,nx,cx,lc,nc,sel}) => (
            <span key={label}>
              {sel
                ? <span style={{position:'absolute',left:`${nX(cx)}px`,top:'20.16px',width:'69.05px',textAlign:'center',color:lc,fontSize:'16.049px',fontWeight:600,letterSpacing:'0.06em',lineHeight:'20.528px'}}>{label}</span>
                : <span style={{position:'absolute',left:`${nX(cx)}px`,top:'20.16px',width:'69.05px',textAlign:'center',color:lc,fontSize:'16.049px',fontWeight:600,letterSpacing:'0.06em',lineHeight:'20.528px'}}>{label}</span>
              }
              {sel && <div style={{position:'absolute',left:`${nX(cx)}px`,top:'38.69px',width:'69.05px',height:'69.05px',
                background:'#1a73e8',borderRadius:'37.324px'}} />}
              {sel
                ? <span style={{position:'absolute',left:`${nX(cx)}px`,top:'59.35px',width:'69.05px',textAlign:'center',color:nc,fontSize:'38.817px',lineHeight:'20.528px'}}>{num}</span>
                : <span style={{position:'absolute',left:`${nX(cx)}px`,top:'59.35px',width:'69.05px',textAlign:'center',color:nc,fontSize:'38.817px',lineHeight:'20.528px'}}>{num}</span>
              }
            </span>
          ))}
          <span className={styles.txt} style={{left:'16.8px',top:'130px',color:'#202124',fontSize:'15.303px',lineHeight:'20.528px'}}>GMT-8</span>

          {/* All-day events — anchored just above bottom border */}
          {!savedPoll && <>
            {/* Veterans Day — full Wed column */}
            <div style={{
              position:'absolute',
              left:`${nX(DIVIDERS[3])}px`, top:'158px',
              width:`${nX(DIVIDERS[4]) - nX(DIVIDERS[3])}px`, height:'26px',
              background:'#518e5e', borderRadius:'12px',
              display:'flex', alignItems:'center', paddingLeft:'8px', overflow:'hidden',
            }}>
              <span style={{color:'#ffffff',fontSize:'17px',fontWeight:600,fontFamily:"'Google Sans','Arimo',sans-serif",whiteSpace:'nowrap'}}>Veterans Day</span>
            </div>
            {/* PS Fall Retreat — full Sat column */}
            <div style={{
              position:'absolute',
              left:`${nX(DIVIDERS[6])}px`, top:'158px',
              width:`${nX(DIVIDERS[7]) - nX(DIVIDERS[6])}px`, height:'26px',
              background:'#a47cb7', borderRadius:'12px',
              display:'flex', alignItems:'center', paddingLeft:'8px', overflow:'hidden',
            }}>
              <span style={{color:'#ffffff',fontSize:'17px',fontWeight:600,fontFamily:"'Google Sans','Arimo',sans-serif",whiteSpace:'nowrap'}}>PS FALL RETREAT</span>
            </div>
            <img src="/assets/retreat-continuation-arrow.svg" alt=""
              style={{position:'absolute',left:`${nX(DIVIDERS[7])}px`,top:'158px',width:'9.331px',height:'26px'}} />
          </>}

          {/* Bottom border + column tick lines */}
          <div style={{position:'absolute',left:'0',bottom:'0',width:'100%',height:'0',borderTop:'0.933px solid #e3e7ed'}}>
            {DIVIDERS.map((l,i) => (
              <div key={i} style={{position:'absolute',left:`${nX(l)}px`,bottom:'0',width:'0.933px',height:'10px',background:'#e3e7ed'}} />
            ))}
          </div>
        </div>

        {/* Scrollable time grid — 1 AM through 11 PM */}
        <div className={styles.weekCalBody} ref={scrollBodyRef}
          onMouseDown={handleBodyMouseDown}
          style={customizeOpen ? { cursor:'crosshair' } : undefined}>
          <div style={{position:'relative', height:`${25 * HOUR_H}px`}}>

            {/* Vertical day dividers */}
            {[97.04,283.66,470.29,656.91,843.53,1030.15,1216.77,1403.39].map((l,i) => (
              <div key={i} style={{position:'absolute',background:'#e3e7ed',width:'0.933px',height:`${25 * HOUR_H}px`,left:`${nX(l)}px`,top:'0'}} />
            ))}

            {/* Hour lines + labels — 12 AM to 11 PM (24 lines) */}
            {Array.from({length: 24}, (_,i) => {
              const h = i  // 0 = 12 AM, 1 = 1 AM … 23 = 11 PM
              const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`
              const g = i * HOUR_H
              return (
                <span key={label}>
                  <div style={{position:'absolute',background:'#e3e7ed',height:'0.933px',width:`${nW(1306.348)}px`,left:`${nX(97.04)}px`,top:`${g}px`}} />
                  <span className={styles.txt} style={{left:'26.13px',top:`${g-7.5}px`,color:'#5f6368',fontSize:'15.49px',lineHeight:'20.528px'}}>{label}</span>
                </span>
              )
            })}

            {/* Personal events — hidden when group event poll is active */}
            {!savedPoll && <>
              <Ev bg="#5d9d8a"  h={26.873} l={nX(1032.01)} t={tG(151.16)} w={nW(167.959)} tc="#f1f3f4" s={16.796}>Coffee chat w mag</Ev>
              <Ev bg="#3d5273"  h={46.655} l={nX(285.53)}  t={tG(184.75)} w={nW(167.212)} tc="#f1f3f4" s={16.983} bold>Math 33A Lec, 9am</Ev>
              <Ev bg="#3d5273"  h={46.655} l={nX(658.77)}  t={tG(184.75)} w={nW(167.212)} tc="#f1f3f4" s={16.983} bold>Math 33A Lec, 9am</Ev>
              <Ev bg="#3d5273"  h={46.655} l={nX(845.39)}  t={tG(184.75)} w={nW(167.212)} tc="#f1f3f4" s={16.983} bold>Math 33A Disc, 9am</Ev>
              <Ev bg="#3d5273"  h={46.655} l={nX(1032.01)} t={tG(184.75)} w={nW(167.212)} tc="#f1f3f4" s={16.983} bold>Math 33A Lec, 9am</Ev>
              <Ev bg="#7fa4b4"  h={54.867} l={nX(294.86)}  t={tG(230.66)} w={nW(157.881)} tc="#17313b" s={17.542} lines={['Doctors app','9:45 – 10:45am']} />
              <Ev bg="#3d5273"  h={106.001} l={nX(1032.01)} t={tG(365.78)} w={nW(167.212)} tc="#f1f3f4" s={17.729} lines={['CS M51A Disc','12 – 1:50pm','Geology Building','4660']} firstBold />
              <Ev bg="#7fa4b4"  h={55.986}  l={nX(98.91)}  t={tG(544.93)} w={nW(167.212)} tc="#17313b" s={17.729} lines={['BChat Design Mee','3pm, TBD']} />
              <Ev bg="#3d5273"  h={106.001} l={nX(472.15)}  t={tG(485.21)} w={nW(167.212)} tc="#f1f3f4" s={17.729} lines={['CS M51A Lec','2 – 3:50pm','Dodd Hall 147']} firstBold />
              <Ev bg="#3d5273"  h={106.001} l={nX(472.15)}  t={tG(605.4)}  w={nW(167.212)} tc="#f1f3f4" s={17.729} lines={['CS 180 Lec','4 – 5:50pm','Young Hall CS24']} firstBold />
              <Ev bg="#3d5273"  h={106.001} l={nX(845.39)}  t={tG(485.21)} w={nW(167.212)} tc="#f1f3f4" s={17.729} lines={['CS M51A Lec','2 – 3:50pm','Dodd Hall 147']} firstBold />
              <Ev bg="#3d5273"  h={106.001} l={nX(845.39)}  t={tG(605.4)}  w={nW(167.212)} tc="#f1f3f4" s={17.729} lines={['CS 180 Lec','4 – 5:50pm','Young Hall CS24']} firstBold />
              <Ev bg="#3d5273"  h={106.001} l={nX(1032.01)} t={tG(485.21)} w={nW(167.212)} tc="#f1f3f4" s={17.729} lines={['CS 180 Disc','2 – 3:50pm','dodd hall 147']} firstBold />
              <Ev bg="#a47bb7"  h={117.571} l={nX(1032.01)} t={tG(605.4)}  w={nW(167.212)} tc="#281832" s={17.729} lines={['Climbing Social','🧗 🧗','4 – 6pm','Sender One','Climbing -']} />
              <Ev bg="#ab7db9"  h={119.438} l={nX(285.53)}  t={tG(725.96)} w={nW(83.233)}  tc="#291730" s={17.542} lines={['PS General','Meeting','6 – 8pm','Mathematical','Sciences 7…']} />
              <Ev bg="#e58b38"  h={153.029} l={nX(369.88)}  t={tG(725.96)} w={nW(82.86)}   tc="#492708" s={17.542} lines={['ACM Design','6pm, Ack…','','dinner social','7 – 8:30pm','XIBEI','EATERY']} />
              <Ev bg="#e58b38"  h={55.986}  l={nX(472.15)}  t={tG(725.96)} w={nW(167.212)} tc="#492708" s={17.729} lines={['ACM Design Track','6pm, Boelter 4760']} />
              <Ev bg="#7796e8"  h={57.853}  l={nX(472.15)}  t={tG(785.67)} w={nW(81.367)}  tc="#132e66" s={17.729} lines={['Big + Lit','7 – 8pm']} />
              <Ev bg="#7796e8"  h={57.853}  l={nX(555.38)}  t={tG(785.67)} w={nW(83.979)}  tc="#132e66" s={17.729} lines={['DevX GB…','7 – 8pm']} />
              <Ev bg="#e58b38"  h={57.853}  l={nX(658.77)}  t={tG(785.67)} w={nW(167.212)} tc="#492708" s={17.729} lines={['ACM Design Dev T…','7pm, E6 289']} />
              <Ev bg="#5d9d8a"  h={44.789}  l={nX(285.53)}  t={tG(846.51)} w={nW(167.212)} tc="#f1f3f4" s={17.729}>Enrollment…</Ev>
              <Ev bg="#ffffff"  h={37.324}  l={nX(845.39)}  t={tG(846.51)} w={nW(167.212)} tc="#90b6c0" s={17.542} border="1.12px solid #90b6c0">PD Cohort Meeting</Ev>
              <Ev bg="#7796e8"  h={37.324}  l={nX(1218.64)} t={tG(846.51)} w={nW(167.212)} tc="#132e66" s={17.542}>Big and little</Ev>
              {/* Current time indicator */}
              <div style={{position:'absolute',background:'#f45b57',height:'2.053px',left:`${nX(97.04)}px`,top:`${tG(323.6)}px`,width:`${nW(186.621)}px`}} />
              <img src="/assets/current-time-dot.svg" alt="" style={{position:'absolute',left:`${nX(88.82)}px`,top:`${tG(316.51)}px`,width:'17.169px',height:'17.169px'}} />
            </>}

            {/* Group availability demo — shown when event poll is active */}
            {savedPoll && (() => {
              const WEEK_START = new Date(2026, 10, 8)
              const toColIdx = d => d ? Math.round((new Date(d) - WEEK_START) / 86400000) : 0
              const startCol = savedPoll.startDate ? toColIdx(savedPoll.startDate) : 0
              const endCol   = savedPoll.endDate   ? toColIdx(savedPoll.endDate)   : 6
              const filtered = GROUP_DEMO_SLOTS.filter(sl => sl.colIdx >= startCol && sl.colIdx <= endCol)
              return filtered.map((sl, i) => {
                const GAP   = 5
                const left  = nX(DIVIDERS[sl.colIdx]) + GAP
                const width = nX(DIVIDERS[sl.colIdx + 1]) - nX(DIVIDERS[sl.colIdx]) - GAP * 2
                const h = sl.e - sl.s
                if (h < 2) return null
                return (
                  <div key={i} style={{
                    position:'absolute', left:`${left}px`, top:`${sl.s}px`,
                    width:`${width}px`, height:`${h}px`,
                    background:'rgba(45,184,31,0.60)', borderRadius:'9px',
                    animation: `growDown 400ms ease-out ${i * 40}ms both`,
                    cursor:'pointer',
                  }}
                  onMouseMove={e => {
                    const scale = window.innerWidth / 1911
                    const scrollTop = scrollBodyRef.current?.scrollTop || 0
                    const bodyRect = scrollBodyRef.current?.getBoundingClientRect()
                    const relY = bodyRect ? (e.clientY - bodyRect.top) / scale + scrollTop : 0
                    const overlapping = filtered.filter(s => s.colIdx === sl.colIdx && relY >= s.s && relY <= s.e).length
                    setAvailTooltip({
                      x: e.clientX / scale + 18,
                      y: e.clientY / scale - 60,
                      available: Math.min(overlapping, DEMO_PEOPLE.length),
                      total: DEMO_PEOPLE.length,
                    })
                  }}
                  onMouseLeave={() => setAvailTooltip(null)}
                  />
                )
              })
            })()}

            {/* Poll slot highlights on calendar (checked=fill, hovered=outline) */}
            {savedPoll && (() => {
              const HOUR_H = 60.09
              const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
              function slotCoords(opt) {
                const colIdx = DAY_NAMES.findIndex(d => opt.date.startsWith(d))
                const m = opt.time.match(/^(\d+):(\d+)\s*[–-]\s*(\d+):(\d+)(am|pm)/i)
                if (!m || colIdx < 0) return null
                const isPM = m[5].toLowerCase() === 'pm'
                let endH = parseInt(m[3]); if (isPM && endH !== 12) endH += 12
                let startH = parseInt(m[1])
                if (startH === 12 && isPM) startH = 12
                else if (isPM && startH < 12 && startH + 12 <= endH) startH += 12
                const s = startH * HOUR_H + parseInt(m[2]) * HOUR_H / 60
                const e = endH   * HOUR_H + parseInt(m[4]) * HOUR_H / 60
                const GAP = 5
                return { colIdx, s, e, left: nX(DIVIDERS[colIdx]) + GAP, width: nX(DIVIDERS[colIdx+1]) - nX(DIVIDERS[colIdx]) - GAP*2 }
              }
              return (savedPoll.options || []).map((opt, i) => {
                const coords = slotCoords(opt)
                if (!coords) return null
                const checked = checkedTimeOptions.has(i)
                const hovered = hoveredSlot === i
                if (!checked && !hovered) return null
                return (
                  <div key={i} style={{
                    position:'absolute', left:`${coords.left}px`, top:`${coords.s}px`,
                    width:`${coords.width}px`, height:`${coords.e - coords.s}px`,
                    background: checked ? '#D3E3FD' : 'transparent',
                    border: hovered || checked ? '2.5px solid #1a73e8' : 'none',
                    borderRadius:'9px', pointerEvents:'none', boxSizing:'border-box',
                  }} />
                )
              })
            })()}

            {/* Pending event cards — shown once poll editing is done (incl. squished view) */}
            {!savedPoll && calendarPollEvents.filter(evt => !hiddenPolls.has(evt.title)).map((evt, i) => {
              const HOUR_H = 60.09
              const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
              const colIdx = DAY_NAMES.findIndex(d => evt.date.startsWith(d))
              const m = evt.time.match(/^(\d+):(\d+)\s*[–-]\s*(\d+):(\d+)(am|pm)/i)
              if (!m || colIdx < 0) return null
              const isPM = m[5].toLowerCase() === 'pm'
              let endH = parseInt(m[3]); if (isPM && endH !== 12) endH += 12
              let startH = parseInt(m[1])
              if (startH === 12 && isPM) startH = 12
              else if (isPM && startH < 12 && startH + 12 <= endH) startH += 12
              const s = startH * HOUR_H + parseInt(m[2]) * HOUR_H / 60
              const e = endH   * HOUR_H + parseInt(m[4]) * HOUR_H / 60
              const GAP = 5
              const left  = nX(DIVIDERS[colIdx]) + GAP
              const width = nX(DIVIDERS[colIdx+1]) - nX(DIVIDERS[colIdx]) - GAP * 2
              const poll = createdPolls.find(p => p.title === evt.title)
              const isActive = pendingEventPopup?.poll?.title === evt.title && pendingEventPopup?.colIdx === colIdx
              return (
                <div key={i} onClick={() => poll && setPendingEventPopup({ poll, colIdx })} style={{
                  position:'absolute', left:`${left}px`, top:`${s}px`,
                  width:`${width}px`, height:`${e - s}px`,
                  background:'#f1f3f4', border:'1.5px dashed #aecbfa',
                  borderRadius:'7.465px', boxSizing:'border-box', overflow:'hidden',
                  cursor: poll ? 'pointer' : 'default',
                  boxShadow: isActive ? '0 4px 14px rgba(0,0,0,0.18)' : 'none',
                }}>
                  <div style={{position:'absolute',left:'7.46px',top:'3.73px',fontFamily:"'Google Sans','Arimo',sans-serif",whiteSpace:'nowrap'}}>
                    <p style={{margin:0,lineHeight:'20.528px',fontWeight:400,fontSize:'19px',color:'#bababa',overflow:'hidden',textOverflow:'ellipsis',maxWidth:`${width - 20}px`}}>
                      {evt.title || 'Untitled'}
                    </p>
                    <p style={{margin:0,lineHeight:'20.528px',fontWeight:400,fontSize:'19px',color:'#bababa'}}>
                      {evt.time}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* ── GREEN AVAILABILITY SLOTS (editable) ── */}
            {customizeOpen && slots.map(sl => {
              const GAP   = 5
              const left  = nX(DIVIDERS[sl.colIdx]) + GAP
              const width = nX(DIVIDERS[sl.colIdx + 1]) - nX(DIVIDERS[sl.colIdx]) - GAP * 2
              const h = sl.e - sl.s
              if (h < 2) return null
              return (
                <div key={sl.id} onMouseDown={e => e.stopPropagation()} style={{
                  position:'absolute', left:`${left}px`, top:`${sl.s}px`,
                  width:`${width}px`, height:`${h}px`,
                  background:'rgba(45,184,31,0.60)', borderRadius:'6px',
                  userSelect:'none',
                }}>
                  <div onMouseDown={e => startResizeDrag(e, sl.id, 'resize-top')} style={{
                    position:'absolute', top:0, left:0, right:0, height:'8px', cursor:'n-resize',
                  }} />
                  <div onMouseDown={e => startResizeDrag(e, sl.id, 'resize-bottom')} style={{
                    position:'absolute', bottom:0, left:0, right:0, height:'8px', cursor:'s-resize',
                  }} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── POLLING PANEL ── */}
      {pollOpen && (
        <div className={styles.pollingPanel} style={{
          position:'absolute', left:'1357px', top:'93.31px',
          width:'478.5px', height:'871.02px',
          background:'#ffffff', borderRadius:'48.598px', boxShadow:'0 2px 10px rgba(0,0,0,0.12)',
          overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{position:'absolute',display:'flex',gap:'8px',alignItems:'center',left:'22.43px',top:'33.64px'}}>
            <span style={{color:'#3c4043',fontSize:'23.925px',fontFamily:"'Google Sans','Arimo',sans-serif",whiteSpace:'nowrap'}}>
              {customizeOpen ? 'Customize availability' : selectGroupOpen ? 'Select Group' : (pollListOpen || createdPolls.length > 0) ? 'Event Polls' : savedPoll ? 'Event Poll' : 'Group Event Polling'}
            </span>
            <div style={{position:'relative',width:'7.788px',height:'3.894px',flexShrink:0}}>
              <img src="/assets/vector.svg" alt=""
                style={{position:'absolute',inset:'-23.11% -11.56%',display:'block',maxWidth:'none',width:'100%',height:'100%'}} />
            </div>
          </div>

          {/* Close / open icons */}
          <img src="/assets/open-tasks.svg" alt="" style={{position:'absolute',left:'366.35px',top:'22.43px',width:'26.168px',height:'26.168px'}} />
          <img src="/assets/close-tasks.svg" alt=""
            style={{position:'absolute',left:'429.9px',top:'22.43px',width:'26.168px',height:'26.168px',cursor:'pointer'}}
            onClick={() => { setPollOpen(false); setCustomizeOpen(false); setSelectGroupOpen(false); setPollListOpen(false) }}
          />

          {/* Header divider */}
          <div style={{position:'absolute',background:'#dadce0',height:'1.121px',left:0,top:'82.24px',width:'478.5px'}} />

          {selectGroupOpen ? (
            /* ── SELECT GROUP CONTENT ── */
            <div className={styles.pollingPanelContent}>
              {/* Group list */}
              <div style={{ position:'absolute', left:'31px', top:'125px', display:'flex', flexDirection:'column', gap:'27px', width:'416px' }}>
                {['Product Space Fellows','Product Designers','Besties','cs33 Podmates'].map(name => {
                  const checked = checkedGroups.has(name)
                  return (
                  <div key={name} style={{ display:'flex', alignItems:'center', width:'100%' }}>
                    <div style={{ display:'flex', gap:'13px', alignItems:'center', flex:1 }}>
                      <div onClick={() => setCheckedGroups(prev => {
                        const next = new Set(prev)
                        if (next.has(name)) next.delete(name); else next.add(name)
                        return next
                      })} style={{
                        width:'26.916px', height:'26.916px',
                        border: checked ? 'none' : '1.495px solid #dadce0',
                        borderRadius:'1.495px', boxSizing:'border-box', flexShrink:0,
                        background: checked ? '#1a73e8' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        cursor:'pointer',
                      }}>
                        {checked && <span style={{ color:'white', fontSize:'16px', lineHeight:1, marginTop:'-1px' }}>✓</span>}
                      </div>
                      <span style={{ color:'#202124', fontSize:'21.682px', fontFamily:"'Google Sans','Arimo',sans-serif", width:'371px' }}>{name}</span>
                    </div>
                    <div style={{ position:'relative', width:'26.168px', height:'26.168px', flexShrink:0 }}>
                      {[5,12,19].map(t => (
                        <div key={t} style={{ position:'absolute', left:'11px', top:`${t}px`,
                          width:'4px', height:'4px', background:'#5f6368', borderRadius:'50%' }} />
                      ))}
                    </div>
                  </div>
                )})}
                {/* Add new group */}
                <div style={{ display:'flex', alignItems:'center', width:'100%' }}>
                  <div style={{ display:'flex', gap:'13px', alignItems:'center' }}>
                    <div style={{ width:'26.916px', height:'26.916px', display:'flex', alignItems:'center',
                      justifyContent:'center', flexShrink:0 }}>
                      <span style={{ color:'#1a73e8', fontSize:'22px', lineHeight:1 }}>+</span>
                    </div>
                    <span style={{ color:'#1a73e8', fontSize:'21.682px', fontFamily:"'Google Sans','Arimo',sans-serif", whiteSpace:'nowrap' }}>
                      Add new group
                    </span>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div style={{ position:'absolute', left:'200px', top:'745px', width:'260px', height:'75px' }}>
                <span style={{ position:'absolute', left:'16px', top:'26px', color:'#1a73e8',
                  fontSize:'20px', fontFamily:"'Google Sans','Arimo',sans-serif", cursor:'pointer' }}>More options</span>
                <div onClick={() => {
                  setConfirmedGroups(Array.from(checkedGroups))
                  setSelectGroupOpen(false)
                  setDialogOpen(true)
                }} style={{ position:'absolute', left:'148px', top:'10px', width:'112px', height:'55px',
                  background:'#1a73e8', borderRadius:'28px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <span style={{ color:'#ffffff', fontSize:'20px', fontFamily:"'Google Sans','Arimo',sans-serif" }}>Save</span>
                </div>
              </div>
            </div>
          ) : customizeOpen ? (
            /* ── CUSTOMIZE AVAILABILITY CONTENT ── */
            <div className={styles.pollingPanelContent}>
              <div style={{
                position:'absolute', left:'50%', top:'306px',
                transform:'translateX(-50%)',
                width:'369px',
                display:'flex', flexDirection:'column',
                gap:'10px', alignItems:'center', textAlign:'center',
                fontFamily:"'Google Sans','Arimo',sans-serif",
              }}>
                <p style={{color:'#202124',fontSize:'24.299px',width:'100%',margin:0}}>Editing availability</p>
                <p style={{color:'#5f6368',fontSize:'20.561px',width:'100%',margin:0}}>
                  Drag the time slots that will be marked as available for your in your event poll
                </p>
              </div>
              {/* Save button */}
              <div onClick={() => { setSavedSlots(slots); setCustomizeOpen(false); setDialogOpen(true) }} style={{
                position:'absolute', left:'157px', top:'458px',
                width:'147px', height:'60px',
                background:'#1a73e8', borderRadius:'31.025px',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer',
              }}>
                <span style={{color:'#ffffff',fontSize:'21.304px',fontFamily:"'Google Sans','Arimo',sans-serif"}}>Save</span>
              </div>
              {/* Discard */}
              <span style={{
                position:'absolute', left:'50%', top:'530px',
                transform:'translateX(-50%)',
                color:'#1a73e8', fontSize:'21.304px',
                fontFamily:"'Google Sans','Arimo',sans-serif", cursor:'pointer', whiteSpace:'nowrap',
              }} onClick={() => {
                setSlots(computeDefaultSlots(rangeStart, rangeEnd))
                setCustomizeOpen(false)
                setDialogOpen(true)
              }}>Discard</span>
              {/* Bottom */}
              <div style={{position:'absolute',background:'#dadce0',height:'1.121px',left:0,top:'800px',width:'478.5px'}} />
              <img src="/assets/expand-completed.svg" alt="" style={{position:'absolute',left:'22.43px',top:'818px',width:'22.43px',height:'22.43px'}} />
              <span style={{position:'absolute',left:'56.07px',top:'816px',color:'#5f6368',fontSize:'20.934px',fontFamily:"'Google Sans','Arimo',sans-serif",whiteSpace:'nowrap'}}>All group events</span>
            </div>
          ) : savedPoll ? (
            /* ── EVENT POLL CONTENT ── */
            <div className={styles.pollingPanelContent}>
              <div style={{position:'absolute',background:'#3d5576',borderRadius:'6px',width:'22px',height:'22px',left:'38px',top:'133px'}} />
              <span style={{position:'absolute',left:'71px',top:'126px',color:'#202124',fontSize:'28px',
                fontFamily:"'Google Sans','Arimo',sans-serif",whiteSpace:'nowrap',maxWidth:'400px',overflow:'hidden',textOverflow:'ellipsis'}}>
                {savedPoll.title || 'Untitled'}
              </span>
              <div style={{position:'absolute',left:'38px',top:'185px',display:'flex',flexDirection:'column',gap:'40px',width:'424px'}}>
                {(savedPoll.options || []).map((opt, i) => {
                  const checked = checkedTimeOptions.has(i)
                  const displayN = opt.n + (checked ? 1 : 0)
                  return (
                  <div key={i}
                    onMouseEnter={() => setHoveredSlot(i)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    style={{display:'flex',gap:'48px',alignItems:'center'}}>
                    <div style={{display:'flex',flexDirection:'column',gap:'8px',width:'250px',flexShrink:0}}>
                      <div style={{display:'flex',gap:'15px',alignItems:'flex-start'}}>
                        <div onClick={() => setCheckedTimeOptions(prev => {
                          const next = new Set(prev)
                          if (next.has(i)) next.delete(i); else next.add(i)
                          return next
                        })} style={{
                          width:'26px', height:'26px',
                          border: checked ? 'none' : '1.495px solid #dadce0',
                          borderRadius:'3px', boxSizing:'border-box', flexShrink:0, marginTop:'2px',
                          background: checked ? '#1a73e8' : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          cursor:'pointer',
                        }}>
                          {checked && <span style={{color:'white',fontSize:'14px',lineHeight:1,marginTop:'-1px'}}>✓</span>}
                        </div>
                        <div style={{color:'#202124',fontSize:'20px',fontFamily:"'Google Sans','Arimo',sans-serif",lineHeight:'1.3'}}>
                          <p style={{margin:0,fontWeight:500,whiteSpace:'nowrap'}}>{opt.date}</p>
                          <p style={{margin:0}}>{opt.time}</p>
                        </div>
                      </div>
                      <span style={{color:'#5f6368',fontSize:'17px',fontFamily:"'Google Sans','Arimo',sans-serif",paddingLeft:'37px'}}>
                        ({opt.avail}/{opt.total} available)
                      </span>
                    </div>
                    <div style={{display:'flex',gap:'16px',alignItems:'center',flexShrink:0}}>
                      <DonutChart numerator={displayN} denominator={opt.total} />
                      <div style={{position:'relative',width:'28px',height:'28px',flexShrink:0}}>
                        {[6,13,20].map(t=>(
                          <div key={t} style={{position:'absolute',left:'12px',top:`${t}px`,
                            width:'4px',height:'4px',background:'#5f6368',borderRadius:'50%'}} />
                        ))}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
              {/* Add custom time button */}
              <div style={{position:'absolute',left:'38px',top:'580px',display:'flex',gap:'8px',alignItems:'center',cursor:'pointer'}}>
                <img src="/assets/add-addons.svg" alt="" style={{width:'26.916px',height:'26.916px',filter:'invert(28%) sepia(99%) saturate(1234%) hue-rotate(199deg) brightness(96%) contrast(94%)'}} />
                <span style={{color:'#1967d2',fontSize:'19px',fontFamily:"'Google Sans','Arimo',sans-serif"}}>Add custom time</span>
              </div>
              {/* Actions */}
              <div style={{position:'absolute',left:'200px',top:'784px',width:'260px',height:'75px'}}>
                <span style={{position:'absolute',left:'16px',top:'26px',color:'#1a73e8',
                  fontSize:'20px',fontFamily:"'Google Sans','Arimo',sans-serif",cursor:'pointer'}}>More options</span>
                <div onClick={() => {
                  const checked = (savedPoll.options || []).filter((_, i) => checkedTimeOptions.has(i))
                  if (checked.length) setCalendarPollEvents(p => [...p, ...checked.map(opt => ({ ...opt, title: savedPoll.title }))])
                  const pollWithVotes = { ...savedPoll, savedChecked: [...checkedTimeOptions] }
                  setCreatedPolls(p => { const idx = p.findIndex(x => x.title === savedPoll.title); return idx >= 0 ? p.map((x,i) => i===idx ? pollWithVotes : x) : [...p, pollWithVotes] })
                  setSavedPoll(null); setPollListOpen(true)
                }} style={{position:'absolute',left:'148px',top:'10px',
                  width:'112px',height:'55px',background:'#1a73e8',borderRadius:'28px',
                  display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                  <span style={{color:'#ffffff',fontSize:'20px',fontFamily:"'Google Sans','Arimo',sans-serif"}}>done</span>
                </div>
              </div>
            </div>
          ) : (pollListOpen || createdPolls.length > 0) ? (
            /* ── EVENT POLLS LIST VIEW (node 92-2) ── */
            <div className={styles.pollingPanelContent}>
              {/* Divider below header */}
              <div style={{position:'absolute',background:'#e3e5e8',height:'1.121px',left:0,top:'82.24px',width:'478.5px'}} />
              {/* Poll entries + Create poll button */}
              <div style={{position:'absolute',left:'22px',top:'140px',width:'440px',display:'flex',flexDirection:'column',gap:'20px'}}>
                {createdPolls.map((poll, i) => (
                  <div key={i}
                    onMouseEnter={() => setHoveredPoll(i)}
                    onMouseLeave={() => setHoveredPoll(null)}
                    onClick={() => { setSavedPoll(poll); setCheckedTimeOptions(new Set(poll.savedChecked || [])); setPollListOpen(false); setHoveredPoll(null) }}
                    style={{
                      display:'flex', gap:'13px', alignItems:'center',
                      borderRadius:'12px', padding:'8px 10px', margin:'-8px -10px',
                      background: hoveredPoll === i ? '#f1f3f4' : 'transparent',
                      cursor:'pointer', transition:'background 120ms ease',
                    }}>
                    <div style={{width:'26px',height:'26px',background:'#3d5576',borderRadius:'6px',flexShrink:0,marginTop:'2px'}} />
                    <div style={{display:'flex',flexDirection:'column',gap:'2px',flex:1,minWidth:0}}>
                      <span style={{color:'#202124',fontSize:'25px',fontFamily:"'Google Sans','Arimo',sans-serif",lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:'310px'}}>{poll.title || 'Untitled'}</span>
                      <span style={{color:'#5f6368',fontSize:'19px',fontFamily:"'Google Sans','Arimo',sans-serif"}}>Created By Anthony</span>
                      <span style={{color:'#1967d2',fontSize:'19px',fontFamily:"'Google Sans','Arimo',sans-serif"}}>4 members</span>
                    </div>
                    <img
                      src={hiddenPolls.has(poll.title) ? '/assets/poll-hidden.svg' : '/assets/poll-visible.svg'}
                      alt="toggle visibility"
                      onClick={e => {
                        e.stopPropagation()
                        setHiddenPolls(prev => {
                          const n = new Set(prev)
                          if (n.has(poll.title)) n.delete(poll.title); else n.add(poll.title)
                          return n
                        })
                      }}
                      style={{width:'32px',height:'32px',flexShrink:0,alignSelf:'center',marginRight:'8px',cursor:'pointer',opacity:0.75}}
                    />
                  </div>
                ))}
                {/* Create poll button — below existing polls */}
                <div onClick={() => { setPollListOpen(false); setDialogOpen(true) }}
                  style={{display:'flex',gap:'8px',alignItems:'center',cursor:'pointer',alignSelf:'flex-start',marginTop:'4px'}}>
                  <img src="/assets/add-addons.svg" alt="" style={{width:'26.916px',height:'26.916px',filter:'invert(28%) sepia(99%) saturate(1234%) hue-rotate(199deg) brightness(96%) contrast(94%)'}} />
                  <span style={{color:'#1967d2',fontSize:'19px',fontFamily:"'Google Sans','Arimo',sans-serif"}}>Create new poll</span>
                </div>
              </div>
              {/* Actions */}
              <div style={{position:'absolute',left:'200px',top:'784px',width:'260px',height:'75px'}}>
                <span style={{position:'absolute',left:'16px',top:'26px',color:'#0b57d0',
                  fontSize:'20px',fontFamily:"'Google Sans','Arimo',sans-serif",cursor:'pointer'}}>More options</span>
                <div onClick={() => { setPollListOpen(false); setPollOpen(false) }} style={{position:'absolute',left:'148px',top:'10px',
                  width:'112px',height:'55px',background:'#0b57d0',borderRadius:'28px',
                  display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                  <span style={{color:'#ffffff',fontSize:'20px',fontFamily:"'Google Sans','Arimo',sans-serif"}}>done</span>
                </div>
              </div>
            </div>
          ) : (
            /* ── EMPTY STATE CONTENT ── */
            <div className={styles.pollingPanelContent}>
              <div style={{
                position:'absolute', left:'50%', top:'270px',
                transform:'translateX(-50%)',
                width:'369px',
                display:'flex', flexDirection:'column',
                gap:'10px', alignItems:'center', textAlign:'center',
                fontFamily:"'Google Sans','Arimo',sans-serif",
              }}>
                <p style={{color:'#202124',fontSize:'24.299px',width:'100%',margin:0}}>No active polls</p>
                <p style={{color:'#5f6368',fontSize:'20.561px',width:'100%',margin:0}}>
                  Create a poll and add people to decide when to schedule your events
                </p>
              </div>
              <div style={{
                position:'absolute', left:'131px', top:'410px',
                width:'195px', height:'40px',
                background:'#1a73e8', borderRadius:'39px',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer',
              }} onClick={() => setDialogOpen(true)}>
                <span style={{color:'#ffffff',fontSize:'18px',fontWeight:500,fontFamily:"'Google Sans','Arimo',sans-serif"}}>Create poll</span>
              </div>
              <div style={{position:'absolute',background:'#dadce0',height:'1.121px',left:0,top:'800px',width:'478.5px'}} />
              <img src="/assets/expand-completed.svg" alt="" style={{position:'absolute',left:'22.43px',top:'818px',width:'22.43px',height:'22.43px'}} />
              <span style={{position:'absolute',left:'56.07px',top:'816px',color:'#5f6368',fontSize:'20.934px',fontFamily:"'Google Sans','Arimo',sans-serif",whiteSpace:'nowrap'}}>All group events</span>
            </div>
          )}
        </div>
      )}

      {(dialogOpen || customizeOpen || selectGroupOpen) && (
        <div style={{ display: dialogOpen ? 'block' : 'none' }}>
          <CreatePollDialog
            addedGroups={confirmedGroups}
            onClose={() => setDialogOpen(false)}
            onSave={({ title, startDate, endDate }) => {
              const days = [
                { date:'Monday, November 9',    time:'12:00 – 1:00pm', avail:3, total:4, n:0 },
                { date:'Wednesday, November 11',time:'12:00 – 1:00pm', avail:3, total:4, n:0 },
                { date:'Thursday, November 12', time:'8:00 – 9:00am',  avail:2, total:4, n:0 },
              ]
              setSavedPoll({ title, options: days, startDate, endDate })
              setCheckedTimeOptions(new Set())
              setDialogOpen(false)
            }}
            onCustomize={({ startDate, endDate }) => {
              setDialogOpen(false)
              setCustomizeOpen(true)
              setRangeStart(startDate)
              setRangeEnd(endDate)
              initSlots(startDate, endDate)
            }}

          />
        </div>
      )}

      {/* ── GOOGLE APPS RAIL ── */}
      <div className={styles.googleApps} style={{left: googleAppsLeft}}>
        <img src="/assets/group3.svg"     alt="" style={{left:'27.77px',top:'26.54px',width:'22px',height:'29px'}} />
        <img src="/assets/group2.svg"     alt="" style={{left:'24.77px',top:'110.54px',width:'28px',height:'29px'}} />
        <img src="/assets/group4.svg"     alt="" style={{left:'27.77px',top:'195.54px',width:'22.001px',height:'26.014px'}} />
        <img src="/assets/mask-group.svg" alt="" style={{left:'27.76px',top:'278.54px',width:'22.027px',height:'28.21px'}} />

        {/* Poll icon — clickable, with selected bg */}
        <div
          onClick={() => setPollOpen(p => !p)}
          style={{
            position:'absolute', left:'8px', top:'329px',
            width:'59px', height:'59px', cursor:'pointer',
            borderRadius:'50%',
            background: pollOpen ? '#E8EAED' : 'transparent',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
          title="Group Event Polling"
        >
          <svg width="25" height="28" viewBox="0 0 25 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'block',flexShrink:0}}>
            <path d="M0 23.0811H24.973C24.973 25.7977 22.7707 28 20.0541 28H4.91892C2.20227 28 0 25.7977 0 23.0811Z" fill="#678DF2"/>
            <path d="M21.1889 0C23.2786 0 24.9727 1.69406 24.9727 3.78378V21.5676H17.4051V3.78379C17.4051 1.69406 19.0991 0 21.1889 0Z" fill="#2C59CD"/>
            <path d="M12.4867 3.78381C14.5764 3.78381 16.2705 5.47787 16.2705 7.5676V21.5676H8.70293V7.5676C8.70293 5.47787 10.397 3.78381 12.4867 3.78381Z" fill="#4E88FF"/>
            <path d="M3.7836 8.70276C5.87332 8.70276 7.56738 10.3968 7.56738 12.4865V21.5676H-0.000190258V12.4865C-0.000190258 10.3968 1.69387 8.70276 3.7836 8.70276Z" fill="#8C9EFF"/>
          </svg>
        </div>

        {/* Blue selected indicator bar */}
        {pollOpen && (
          <div style={{position:'absolute',background:'#1a73e8',width:'3.738px',height:'52.336px',left:'-4px',top:'335px'}} />
        )}

        <img src="/assets/add-addons.svg"  alt="" style={{left:'22.43px',top:'431.21px',width:'29.906px',height:'29.906px'}} />
        <img src="/assets/information.svg" alt="" style={{left:'18.69px',top:'844.85px',width:'29.906px',height:'29.906px'}} />
      </div>

      {/* ── PENDING EVENT DETAIL POPUP ── */}
      {pendingEventPopup && (() => {
        const { poll, colIdx: evtColIdx } = pendingEventPopup
        const opts = poll.options || []
        const checked = new Set(poll.savedChecked || [])
        const popW = 620, popH = 220 + opts.length * 110 + Math.max(0, opts.length - 1) * 35 + 70
        const weekCalLeft = pollOpen ? 381.3 : 380.71
        const cardRight = weekCalLeft + nX(DIVIDERS[evtColIdx + 1])
        const spaceRight = 1911 - cardRight - 20
        const popX = spaceRight >= popW ? cardRight + 15 : weekCalLeft + nX(DIVIDERS[evtColIdx]) - popW - 15
        const popY = Math.max(20, (1000.29 - popH) / 2)

        function DonutChart({ avail, total }) {
          const size = 92, cx = 46, r = 36, sw = 10
          const circ = 2 * Math.PI * r
          const filled = total > 0 ? (avail / total) * circ : 0
          return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle cx={cx} cy={cx} r={r} fill="none" stroke="#DEE3EA" strokeWidth={sw} />
              <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1A73E8" strokeWidth={sw}
                strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cx})`} />
              <text x={cx} y={cx} textAnchor="middle" dominantBaseline="central"
                fill="#1967d2" fontSize="19" fontFamily="'Google Sans','Arimo',sans-serif" fontWeight="500">
                {avail}/{total}
              </text>
            </svg>
          )
        }

        return (
          <>
            <div onClick={() => setPendingEventPopup(null)}
              style={{position:'fixed',inset:0,zIndex:300,background:'transparent'}} />
            <div style={{
              position:'fixed', left:`${popX}px`, top:`${popY}px`,
              width:`${popW}px`, height:`${popH}px`, background:'#f1f4f9', borderRadius:'40px',
              boxShadow:'0 2px 3.5px rgba(0,0,0,0.25)', zIndex:301,
              fontFamily:"'Google Sans','Arimo',sans-serif",
            }} onClick={e => e.stopPropagation()}>
              {/* Top-right action icons */}
              {[
                {src:'/assets/edit-event.svg',       x:368},
                {src:'/assets/delete-event.svg',     x:418},
                {src:'/assets/email-guests.svg',     x:468},
                {src:'/assets/more-event-options.svg',x:518},
              ].map(({src,x}) => (
                <img key={x} src={src} alt="" style={{position:'absolute',left:`${x}px`,top:'30px',width:'26px',height:'26px'}} />
              ))}
              <img src="/assets/close-event.svg" alt="" onClick={() => setPendingEventPopup(null)}
                style={{position:'absolute',left:'568px',top:'30px',width:'26px',height:'26px',cursor:'pointer'}} />

              {/* Color square + title */}
              <div style={{position:'absolute',left:'62px',top:'100px',width:'21px',height:'21px',background:'#3d5372',borderRadius:'5px'}} />
              <p style={{position:'absolute',left:'98px',top:'91px',margin:0,fontSize:'34px',color:'#303432',whiteSpace:'nowrap'}}>{poll.title || 'Untitled'}</p>
              <p style={{position:'absolute',left:'98px',top:'137px',margin:0,fontSize:'20.5px',color:'#303432'}}>Created by Anthony</p>

              {/* Members row */}
              <div style={{position:'absolute',left:'98px',top:'167px',display:'flex',gap:'7px',alignItems:'center'}}>
                <img src="/assets/people-group.svg" alt="" style={{width:'23px',height:'19px'}} />
                <span style={{fontSize:'19px',color:'#5f6368'}}>4 members</span>
              </div>

              {/* Options */}
              <div style={{position:'absolute',left:'62px',top:'220px',display:'flex',flexDirection:'column',gap:'35px',width:'429px'}}>
                {opts.map((opt, i) => (
                  <div key={i} style={{display:'flex',gap:'43px',alignItems:'center',width:'100%'}}>
                    {/* Left: checkbox + date/time + available */}
                    <div style={{display:'flex',flexDirection:'column',gap:'8px',width:'253px',flexShrink:0}}>
                      <div style={{display:'flex',gap:'15px',alignItems:'center'}}>
                        <div style={{
                          width:'26.916px',height:'26.916px',flexShrink:0,boxSizing:'border-box',
                          border: checked.has(i) ? 'none' : '1.495px solid #5f6368',
                          borderRadius:'1.495px',
                          background: checked.has(i) ? '#1a73e8' : 'transparent',
                          display:'flex',alignItems:'center',justifyContent:'center',
                        }}>
                          {checked.has(i) && (
                            <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
                              <path d="M0.900391 6.46069L4.87231 10.4326L13.6105 0.900002" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div style={{fontSize:'20px',color:'#202124',lineHeight:'1.22'}}>
                          <p style={{margin:0}}>{opt.date}</p>
                          <p style={{margin:0}}>{opt.time}</p>
                        </div>
                      </div>
                      <div style={{textAlign:'center',paddingRight:'50px'}}>
                        <span style={{fontSize:'19px',color:'#5f6368'}}>({opt.avail}/{opt.total} available)</span>
                      </div>
                    </div>

                    {/* Right: donut + fraction + three dots */}
                    {(() => {
                      const votes = checked.has(i) ? 1 : 0
                      return (
                        <div style={{display:'flex',gap:'21px',alignItems:'center',flexShrink:0}}>
                          <div style={{flexShrink:0}}>
                            <DonutChart avail={votes} total={opt.total} />
                          </div>
                          <img src="/assets/meeting-notes-options.svg" alt="" style={{width:'28px',height:'28px',flexShrink:0}} />
                        </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      })()}

      {/* Availability tooltip */}
      {availTooltip && (() => {
        const avail  = DEMO_PEOPLE.slice(0, availTooltip.available)
        const await_ = DEMO_PEOPLE.slice(availTooltip.available)
        return (
          <div style={{
            position:'fixed', left:`${availTooltip.x}px`, top:`${availTooltip.y}px`,
            background:'#f0f4f9', borderRadius:'24px',
            boxShadow:'0px 4px 11.7px 0px rgba(0,0,0,0.19)',
            padding:'26px 32px', width:'330px', zIndex:300, pointerEvents:'none',
            fontFamily:"'Google Sans','Arimo',sans-serif",
          }}>
            {/* Header */}
            <div style={{display:'flex',gap:'9px',alignItems:'center',marginBottom:'18px'}}>
              <img src="/assets/people-available.svg" alt="" style={{width:'28px',height:'23px'}} />
              <span style={{color:'#5f6368',fontSize:'23px'}}>Available</span>
              <span style={{color:'#1967d2',fontSize:'21px'}}>{availTooltip.available}/{availTooltip.total}</span>
            </div>
            {/* Available people */}
            <div style={{display:'flex',flexDirection:'column',gap:'13px',marginBottom: await_.length ? '20px' : 0}}>
              {avail.map((p,i) => (
                <div key={i} style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <div style={{width:'34px',height:'34px',borderRadius:'17px',background:p.color,
                    display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <span style={{color:'#fff',fontSize:'18px'}}>{p.initial}</span>
                  </div>
                  <span style={{color:'#5f6368',fontSize:'18px',whiteSpace:'nowrap'}}>{p.email}</span>
                </div>
              ))}
            </div>
            {/* Awaiting section */}
            {await_.length > 0 && (
              <>
                <div style={{color:'#5f6368',fontSize:'23px',marginBottom:'13px'}}>Unavailable</div>
                <div style={{display:'flex',flexDirection:'column',gap:'13px'}}>
                  {await_.map((p,i) => (
                    <div key={i} style={{display:'flex',gap:'8px',alignItems:'center'}}>
                      <div style={{width:'34px',height:'34px',borderRadius:'17px',background:'#9e9e9e',
                        display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <span style={{color:'#fff',fontSize:'18px'}}>{p.initial}</span>
                      </div>
                      <span style={{color:'#afb2b6',fontSize:'16px',whiteSpace:'nowrap'}}>{p.email}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })()}

    </div>
  )
}

function DonutChart({ numerator, denominator }) {
  const size = 84, r = 30, cx = 42, cy = 42
  const circ = 2 * Math.PI * r
  const filled = denominator > 0 ? (numerator / denominator) * circ : 0
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8eaed" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a73e8" strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={circ - filled} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)' }} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fill="#1a73e8" fontSize="20" fontFamily="'Google Sans','Arimo',sans-serif" fontWeight="500">
        {numerator}/{denominator}
      </text>
    </svg>
  )
}

function Ev({ bg, h, l, t, w, tc, s, bold, firstBold, lines, border, children }) {
  return (
    <div style={{
      position:'absolute', background:bg,
      height:`${h}px`, left:`${l}px`, top:`${t}px`, width:`${w}px`,
      borderRadius:'7.465px', overflow:'hidden',
      ...(border ? {border} : {}),
    }}>
      {lines ? (
        <div style={{position:'absolute',left:'7.46px',top:'3.73px',color:tc,fontSize:`${s * 1.1}px`,whiteSpace:'nowrap'}}>
          {lines.map((line,i) => (
            <p key={i} style={{lineHeight:'20.528px',margin:0,fontWeight:(bold||(firstBold&&i===0))?600:400}}>{line}</p>
          ))}
        </div>
      ) : (
        <span style={{position:'absolute',left:'7.46px',top:'3.73px',color:tc,fontSize:`${s * 1.1}px`,
          whiteSpace:'nowrap',lineHeight:'20.528px',fontWeight:bold?600:400}}>{children}</span>
      )}
    </div>
  )
}
