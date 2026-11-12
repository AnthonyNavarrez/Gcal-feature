import { useState, useRef, useEffect } from 'react'
import styles from './DefaultScreen.module.css'
import CreatePollDialog from './CreatePollDialog'

// Column x-boundaries (original Figma coords) — one divider per gap
const DIVIDERS = [97.04, 283.66, 470.29, 656.91, 843.53, 1030.15, 1216.77, 1403.39]

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
  [658.77,  151.16,  26.873],  // Wed – Veterans Day
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
  [1218.64, 151.16,  26.873],  // Sat – PS Fall Retreat
  [1218.64, 846.51,  37.324],  // Sat – Big and little
]

function dayMs(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }

// Demo group availability slots shown when event poll is active.
// colIdx matches DIVIDERS columns (0=Sun…6=Sat).
// s/e are scroll-body y coords (12 AM = 0, each hour = 60.09px).
// Multiple overlapping blocks per column create the layered "more people" effect.
const GROUP_DEMO_SLOTS = [
  { colIdx:0, s:510, e:899 },
  { colIdx:0, s:721, e:963 },
  { colIdx:0, s:963, e:1214 },
  { colIdx:1, s:511, e:537 },
  { colIdx:1, s:640, e:920 },
  { colIdx:1, s:648, e:1077 },
  { colIdx:1, s:729, e:1002 },
  { colIdx:2, s:510, e:834 },
  { colIdx:2, s:1056, e:1212 },
  { colIdx:3, s:594, e:1135 },
  { colIdx:3, s:721, e:1202 },
  { colIdx:4, s:511, e:537 },
  { colIdx:4, s:594, e:838 },
  { colIdx:4, s:658, e:1139 },
  { colIdx:4, s:1043, e:1199 },
  { colIdx:5, s:595, e:722 },
  { colIdx:5, s:1082, e:1215 },
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
  const [checkedTimeOptions, setCheckedTimeOptions] = useState(new Set())
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
  const GRID_1AM = 9 * HOUR_H  // scroll-body y of 9 AM (9 hrs after midnight)
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
        <div style={{position:'absolute',left:'100.78px',top:'14.93px',width:'48.521px',height:'55.986px',overflow:'hidden'}}>
          <img src="/assets/calendar-mark.png" alt=""
            style={{position:'absolute',width:'3938.46%',height:'1779.01%',left:'-200%',top:'-26.67%',maxWidth:'none'}} />
        </div>
        <span className={styles.txt} style={{left:'167.96px',top:'26.13px',color:'#e3e3e3',fontSize:'32.099px'}}>Calendar</span>
        <div style={{position:'absolute',left:'380.71px',top:'14.93px',width:'134.367px',height:'63.451px',
          border:'1.493px solid #606462',borderRadius:'37.324px'}} />
        <span className={styles.txt} style={{left:'418.03px',top:'33.59px',color:'#e3e3e3',fontSize:'20.902px'}}>Today</span>
        <img src="/assets/previous-week.svg" alt="" style={{left:'556.13px',top:'29.86px',width:'26.127px',height:'26.127px'}} />
        <img src="/assets/next-week.svg"     alt="" style={{left:'604.65px',top:'29.86px',width:'26.127px',height:'26.127px'}} />
        <span className={styles.txt} style={{left:'668.1px',top:'27.99px',color:'#e3e3e3',fontSize:'31.352px'}}>November 2026</span>
        <img src="/assets/search.svg"   alt="" style={{left:'1067.47px',top:'29.86px',width:'29.859px',height:'29.859px'}} />
        <img src="/assets/help.svg"     alt="" style={{left:'1130.92px',top:'29.86px',width:'29.859px',height:'29.859px'}} />
        <img src="/assets/settings.svg" alt="" style={{left:'1198.11px',top:'29.86px',width:'29.859px',height:'29.859px'}} />
        <div style={{position:'absolute',left:'1265.29px',top:'14.93px',width:'149.297px',height:'63.451px',
          border:'1.493px solid #606462',borderRadius:'37.324px'}} />
        <span className={styles.txt} style={{left:'1298.88px',top:'33.59px',color:'#e3e3e3',fontSize:'21.275px'}}>Week</span>
        <img src="/assets/view-menu.svg" alt="" style={{left:'1369.8px',top:'33.59px',width:'18.662px',height:'18.662px'}} />
        <div style={{position:'absolute',left:'1433.25px',top:'14.93px',width:'156.762px',height:'63.451px',
          border:'1.493px solid #606462',borderRadius:'37.324px'}} />
        <div style={{position:'absolute',left:'1433.25px',top:'14.93px',width:'78.381px',height:'63.451px',
          background:'#235377',borderRadius:'37.324px'}} />
        <img src="/assets/calendar-view.svg" alt="" style={{left:'1459.38px',top:'29.86px',width:'26.127px',height:'26.127px'}} />
        <img src="/assets/task-view.svg"     alt="" style={{left:'1534.03px',top:'29.86px',width:'29.859px',height:'29.859px'}} />
        {[
          [1623.6,29.86],[1632.19,29.86],[1640.77,29.86],
          [1623.6,38.44],[1632.19,38.44],[1640.77,38.44],
          [1623.6,47.03],[1632.19,47.03],[1640.77,47.03],
        ].map(([l,t],i) => (
          <div key={i} style={{position:'absolute',background:'#e3e3e3',borderRadius:'2.239px',
            width:'4.479px',height:'4.479px',left:`${l}px`,top:`${t}px`}} />
        ))}
        <div style={{position:'absolute',left:'1679.59px',top:'11.2px',width:'212.748px',height:'70.916px',
          border:'1.493px solid #858886',borderRadius:'44.789px'}} />
        <div style={{position:'absolute',left:'1701.98px',top:'26.13px',width:'115.705px',height:'41.057px',overflow:'hidden'}}>
          <img src="/assets/ucla-brand.png" alt=""
            style={{position:'absolute',width:'1651.61%',height:'2436.36%',left:'-1470.97%',top:'-63.64%',maxWidth:'none'}} />
        </div>
        <div style={{position:'absolute',left:'1832.62px',top:'22.39px',width:'48.521px',height:'48.521px',
          background:'#285c9a',borderRadius:'24.261px'}} />
        <span className={styles.txt} style={{left:'1847.55px',top:'29.86px',color:'#e3e3e3',fontSize:'22.395px'}}>A</span>
      </div>

      {/* ── SIDEBAR ── */}
      <div className={styles.sidebar}>
        <div style={{position:'absolute',left:'22.39px',top:'22.39px',width:'205.283px',height:'82.113px',
          background:'#373b3d',borderRadius:'26.127px'}} />
        <img src="/assets/create.svg" alt="" style={{left:'44.79px',top:'44.79px',width:'33.592px',height:'33.592px'}} />
        <span className={styles.txt} style={{left:'100.78px',top:'52.25px',color:'#e3e3e3',fontSize:'20.155px'}}>Create</span>
        <img src="/assets/view-menu.svg" alt="" style={{left:'182.89px',top:'52.25px',width:'18.662px',height:'18.662px'}} />
        <span className={styles.txt} style={{left:'41.06px',top:'156.76px',color:'#e3e3e3',fontSize:'21.275px',fontWeight:700}}>November 2026</span>
        <img src="/assets/previous-month.svg" alt="" style={{left:'276.2px',top:'156.76px',width:'18.662px',height:'18.662px'}} />
        <img src="/assets/next-month.svg"     alt="" style={{left:'320.99px',top:'156.76px',width:'18.662px',height:'18.662px'}} />
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <span key={i} className={styles.txt}
            style={{left:`${44.79+i*46.28}px`,top:'201.55px',color:'#c4c7c5',fontSize:'16.423px'}}>{d}</span>
        ))}
        {[1,2,3,4,5,6,7].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${44.79+i*46.28}px`,top:'238.88px',color:'#e3e3e3',fontSize:'16.049px'}}>{n}</span>
        ))}
        <span className={styles.txt} style={{left:'44.79px',top:'277.69px',color:'#e3e3e3',fontSize:'16.049px'}}>8</span>
        <div style={{position:'absolute',left:'126.9px',top:'269.12px',width:'36.204px',height:'36.204px',
          background:'#a8c7fa',borderRadius:'18.102px'}} />
        <span className={styles.txt} style={{left:'91.07px',top:'277.69px',color:'#e3e3e3',fontSize:'16.049px'}}>9</span>
        <span className={styles.txt} style={{left:'133.62px',top:'277.69px',color:'#174176',fontSize:'16.049px'}}>10</span>
        {[11,12,13,14].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${179.9+i*46.28}px`,top:'277.69px',color:'#e3e3e3',fontSize:'16.049px'}}>{n}</span>
        ))}
        {[15,16,17,18,19,20,21].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${41.06+i*46.28}px`,top:'316.51px',color:'#e3e3e3',fontSize:'16.049px'}}>{n}</span>
        ))}
        {[22,23,24,25,26,27,28].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${41.06+i*46.28}px`,top:'355.33px',color:'#e3e3e3',fontSize:'16.049px'}}>{n}</span>
        ))}
        <span className={styles.txt} style={{left:'41.06px',top:'394.14px',color:'#e3e3e3',fontSize:'16.049px'}}>29</span>
        <span className={styles.txt} style={{left:'87.34px',top:'394.14px',color:'#e3e3e3',fontSize:'16.049px'}}>30</span>
        {[1,2,3,4,5].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${137.35+i*46.28}px`,top:'394.14px',color:'#949895',fontSize:'16.049px'}}>{n}</span>
        ))}
        {[6,7,8,9,10,11,12].map((n,i) => (
          <span key={n} className={styles.txt}
            style={{left:`${44.79+i*46.28}px`,top:'432.96px',color:'#949895',fontSize:'16.049px'}}>{n}</span>
        ))}
        <span className={styles.txt} style={{left:'41.06px',top:'462.82px',color:'#e3e3e3',fontSize:'21.648px',fontWeight:700}}>Meet with...</span>
        <div style={{position:'absolute',left:'41.06px',top:'496.41px',width:'298.594px',height:'59.719px',
          background:'#282c2d',borderRadius:'3.732px'}} />
        <img src="/assets/people.svg" alt="" style={{left:'63.45px',top:'511.34px',width:'26.127px',height:'26.127px'}} />
        <span className={styles.txt} style={{left:'111.97px',top:'515.07px',color:'#c4c7c5',fontSize:'20.528px'}}>Search for people</span>
        <span className={styles.txt} style={{left:'41.06px',top:'593.46px',color:'#e3e3e3',fontSize:'21.648px'}}>Booking pages</span>
        <img src="/assets/add-booking-page.svg"     alt="" style={{left:'265px',top:'589.72px',width:'26.127px',height:'26.127px'}} />
        <img src="/assets/expand-booking-pages.svg" alt="" style={{left:'313.52px',top:'593.46px',width:'26.127px',height:'26.127px'}} />
        <span className={styles.txt} style={{left:'41.06px',top:'671.84px',color:'#e3e3e3',fontSize:'21.648px'}}>Time insights</span>
        <img src="/assets/insights-chart.svg"       alt="" style={{left:'268.73px',top:'668.1px',width:'29.859px',height:'29.859px'}} />
        <img src="/assets/expand-booking-pages.svg" alt="" style={{left:'313.52px',top:'671.84px',width:'26.127px',height:'26.127px'}} />
        <span className={styles.txt} style={{left:'41.06px',top:'750.22px',color:'#e3e3e3',fontSize:'22.021px'}}>My calendars</span>
        <img src="/assets/collapse-calendars.svg" alt="" style={{left:'313.52px',top:'750.22px',width:'26.127px',height:'26.127px'}} />
        <div style={{position:'absolute',left:'41.06px',top:'802.47px',width:'25.007px',height:'25.007px',
          background:'#8eb5bd',borderRadius:'1.493px'}} />
        <img src="/assets/selected.svg" alt="" style={{left:'43.67px',top:'805.46px',width:'19.035px',height:'19.035px'}} />
        <span className={styles.txt} style={{left:'82.11px',top:'806.2px',color:'#e3e3e3',fontSize:'20.902px'}}>Ucla Events</span>
        <div style={{position:'absolute',left:'41.06px',top:'843.53px',width:'25.007px',height:'25.007px',
          border:'1.493px solid #51a377',borderRadius:'1.493px'}} />
        <span className={styles.txt} style={{left:'82.11px',top:'847.26px',color:'#e3e3e3',fontSize:'20.902px'}}>Birthdays</span>
        <div style={{position:'absolute',left:'41.06px',top:'884.58px',width:'25.007px',height:'25.007px',
          background:'#7a9bcd',borderRadius:'1.493px'}} />
        <img src="/assets/selected.svg" alt="" style={{left:'43.67px',top:'887.57px',width:'19.035px',height:'19.035px'}} />
        <span className={styles.txt} style={{left:'82.11px',top:'888.32px',color:'#e3e3e3',fontSize:'20.902px'}}>Classes</span>
        <div style={{position:'absolute',left:'369.51px',top:'126.9px',width:'11.197px',height:'466.553px',
          background:'#606060',borderRadius:'5.599px'}} />
      </div>

      {/* ── WEEK CALENDAR ── */}
      <div className={styles.weekCal} style={weekCalStyle}>

        {/* Fixed day header */}
        <div className={styles.weekCalHeader}>
          {[
            {label:'SUN', num:'8',  lx:173.18, nx:175.42, lc:'#c4c7c5', nc:'#e3e3e3'},
            {label:'MON', num:'9',  lx:359.81, nx:362.04, lc:'#c4c7c5', nc:'#e3e3e3'},
            {label:'TUE', num:'10', lx:546.43, nx:541.2,  lc:'#a8c7fa', nc:'#173769', sel:true},
            {label:'WED', num:'11', lx:733.05, nx:727.82, lc:'#c4c7c5', nc:'#e3e3e3'},
            {label:'THU', num:'12', lx:919.67, nx:914.44, lc:'#c4c7c5', nc:'#e3e3e3'},
            {label:'FRI', num:'13', lx:1106.29,nx:1101.06,lc:'#c4c7c5', nc:'#e3e3e3'},
            {label:'SAT', num:'14', lx:1292.91,nx:1287.69,lc:'#c4c7c5', nc:'#e3e3e3'},
          ].map(({label,num,lx,nx,lc,nc,sel}) => (
            <span key={label}>
              <span className={styles.txt} style={{left:`${nX(lx)}px`,top:'20.16px',color:lc,fontSize:'16.049px',fontWeight:700,lineHeight:'20.528px'}}>{label}</span>
              {sel && <div style={{position:'absolute',left:`${nX(528.14)}px`,top:'44.04px',width:'69.05px',height:'69.05px',
                background:'#a8c7fa',borderRadius:'37.324px'}} />}
              <span className={styles.txt} style={{left:`${nX(nx)}px`,top:'59.35px',color:nc,fontSize:'38.817px',lineHeight:'20.528px'}}>{num}</span>
            </span>
          ))}
          <span className={styles.txt} style={{left:'16.8px',top:'126.9px',color:'#e3e3e3',fontSize:'15.303px',lineHeight:'20.528px'}}>GMT-8</span>
        </div>

        {/* Scrollable time grid — 1 AM through 11 PM */}
        <div className={styles.weekCalBody} ref={scrollBodyRef}
          onMouseDown={handleBodyMouseDown}
          style={customizeOpen ? { cursor:'crosshair' } : undefined}>
          <div style={{position:'relative', height:`${25 * HOUR_H}px`}}>

            {/* Vertical day dividers */}
            {[97.04,283.66,470.29,656.91,843.53,1030.15,1216.77,1403.39].map((l,i) => (
              <div key={i} style={{position:'absolute',background:'#303031',width:'0.933px',height:`${25 * HOUR_H}px`,left:`${nX(l)}px`,top:'0'}} />
            ))}

            {/* Hour lines + labels — 12 AM to 11 PM (24 lines) */}
            {Array.from({length: 24}, (_,i) => {
              const h = i  // 0 = 12 AM, 1 = 1 AM … 23 = 11 PM
              const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h-12} PM`
              const g = i * HOUR_H
              return (
                <span key={label}>
                  <div style={{position:'absolute',background:'#303031',height:'0.933px',width:`${nW(1306.348)}px`,left:`${nX(97.04)}px`,top:`${g}px`}} />
                  <span className={styles.txt} style={{left:'26.13px',top:`${g-7.5}px`,color:'#c4c7c5',fontSize:'15.49px',lineHeight:'20.528px'}}>{label}</span>
                </span>
              )
            })}

            {/* Personal events — hidden when group event poll is active */}
            {!savedPoll && <>
              <Ev bg="#518e5e"  h={26.873} l={nX(658.77)}  t={tG(151.16)} w={nW(89.578)}  tc="#112719" s={16.049}>Veterans Day</Ev>
              <Ev bg="#5d9d8a"  h={26.873} l={nX(1032.01)} t={tG(151.16)} w={nW(167.959)} tc="#f1f3f4" s={16.796}>Coffee chat w mag</Ev>
              <Ev bg="#a47cb7"  h={26.873} l={nX(1218.64)} t={tG(151.16)} w={nW(173.558)} tc="#281a31" s={16.049}>PS FALL RETREAT</Ev>
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
              <Ev bg="#131314"  h={37.324}  l={nX(845.39)}  t={tG(846.51)} w={nW(167.212)} tc="#90b6c0" s={17.542} border="1.12px solid #90b6c0">PD Cohort Meeting</Ev>
              <Ev bg="#7796e8"  h={37.324}  l={nX(1218.64)} t={tG(846.51)} w={nW(167.212)} tc="#132e66" s={17.542}>Big and little</Ev>
              {/* Current time indicator */}
              <div style={{position:'absolute',background:'#f45b57',height:'2.053px',left:`${nX(470.29)}px`,top:`${tG(323.6)}px`,width:`${nW(186.621)}px`}} />
              <img src="/assets/current-time-dot.svg" alt="" style={{position:'absolute',left:`${nX(462.07)}px`,top:`${tG(316.51)}px`,width:'17.169px',height:'17.169px'}} />
              <img src="/assets/retreat-continuation-arrow.svg" alt=""
                style={{position:'absolute',left:`${nX(1391.19)}px`,top:`${tG(151.16)}px`,width:'9.331px',height:'26.873px'}} />
            </>}

            {/* Group availability demo — shown when event poll is active */}
            {savedPoll && GROUP_DEMO_SLOTS.map((sl, i) => {
              const GAP   = 5
              const left  = nX(DIVIDERS[sl.colIdx]) + GAP
              const width = nX(DIVIDERS[sl.colIdx + 1]) - nX(DIVIDERS[sl.colIdx]) - GAP * 2
              const h = sl.e - sl.s
              if (h < 2) return null
              return (
                <div key={i} style={{
                  position:'absolute', left:`${left}px`, top:`${sl.s}px`,
                  width:`${width}px`, height:`${h}px`,
                  background:'rgba(80,251,64,0.24)', borderRadius:'9px',
                  pointerEvents:'none',
                }} />
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
                  background:'rgba(80,251,64,0.24)', borderRadius:'6px',
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
          background:'#131314', borderRadius:'48.598px',
          overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{position:'absolute',display:'flex',gap:'8px',alignItems:'center',left:'22.43px',top:'33.64px'}}>
            <span style={{color:'#e3e3e3',fontSize:'23.925px',fontFamily:"'Arimo',sans-serif",whiteSpace:'nowrap'}}>
              {customizeOpen ? 'Customize availability' : selectGroupOpen ? 'Select Group' : savedPoll ? 'Event Poll' : 'Group Event Polling'}
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
            onClick={() => { setPollOpen(false); setCustomizeOpen(false); setSelectGroupOpen(false) }}
          />

          {/* Header divider */}
          <div style={{position:'absolute',background:'#373737',height:'1.121px',left:0,top:'82.24px',width:'478.5px'}} />

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
                        border: checked ? 'none' : '1.495px solid white',
                        borderRadius:'1.495px', boxSizing:'border-box', flexShrink:0,
                        background: checked ? '#1a73e8' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        cursor:'pointer',
                      }}>
                        {checked && <span style={{ color:'white', fontSize:'16px', lineHeight:1, marginTop:'-1px' }}>✓</span>}
                      </div>
                      <span style={{ color:'white', fontSize:'21.682px', fontFamily:"'Inter',sans-serif", width:'371px' }}>{name}</span>
                    </div>
                    <div style={{ position:'relative', width:'26.168px', height:'26.168px', flexShrink:0 }}>
                      {[5,12,19].map(t => (
                        <div key={t} style={{ position:'absolute', left:'11px', top:`${t}px`,
                          width:'4px', height:'4px', background:'white', borderRadius:'50%' }} />
                      ))}
                    </div>
                  </div>
                )})}
                {/* Add new Group */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%' }}>
                  <div style={{ display:'flex', gap:'13px', alignItems:'center' }}>
                    <div style={{ width:'26.916px', height:'26.916px', display:'flex', alignItems:'center',
                      justifyContent:'center', flexShrink:0 }}>
                      <span style={{ color:'#a8c7fa', fontSize:'22px', lineHeight:1 }}>+</span>
                    </div>
                    <span style={{ color:'#a8c7fa', fontSize:'21.682px', fontFamily:"'Inter',sans-serif", whiteSpace:'nowrap' }}>
                      Add new Group
                    </span>
                  </div>
                  <div style={{ position:'relative', width:'26.168px', height:'26.168px', flexShrink:0 }}>
                    {[5,12,19].map(t => (
                      <div key={t} style={{ position:'absolute', left:'11px', top:`${t}px`,
                        width:'4px', height:'4px', background:'white', borderRadius:'50%' }} />
                    ))}
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div style={{ position:'absolute', left:'216px', top:'751px', width:'239.93px', height:'62.878px' }}>
                <span style={{ position:'absolute', left:'16.55px', top:'21.51px', color:'#aecbfa',
                  fontSize:'17.043px', fontFamily:"'Arimo',sans-serif", cursor:'pointer' }}>More options</span>
                <div onClick={() => {
                  setConfirmedGroups(Array.from(checkedGroups))
                  setSelectGroupOpen(false)
                  setDialogOpen(true)
                }} style={{ position:'absolute', left:'145.61px', top:'8.27px', width:'94.317px', height:'47.986px',
                  background:'#aecbfa', borderRadius:'24.82px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                  <span style={{ color:'#18315d', fontSize:'17.043px', fontFamily:"'Arimo',sans-serif" }}>Save</span>
                </div>
              </div>
              {/* Bottom */}
              <div style={{position:'absolute',background:'#373737',height:'1.121px',left:0,top:'829.9px',width:'478.5px'}} />
              <img src="/assets/expand-completed.svg" alt="" style={{position:'absolute',left:'22.43px',top:'848.59px',width:'22.43px',height:'22.43px'}} />
              <span style={{position:'absolute',left:'56.07px',top:'846.72px',color:'#c4c7c5',fontSize:'20.934px',fontFamily:"'Arimo',sans-serif",whiteSpace:'nowrap'}}>All group events</span>
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
                fontFamily:"'Arimo',sans-serif",
              }}>
                <p style={{color:'#e3e3e3',fontSize:'24.299px',width:'100%',margin:0}}>Editing availability</p>
                <p style={{color:'#c4c7c5',fontSize:'20.561px',width:'100%',margin:0}}>
                  Drag the time slots that will be marked as available for your in your event poll
                </p>
              </div>
              {/* Save button */}
              <div onClick={() => { setSavedSlots(slots); setCustomizeOpen(false); setDialogOpen(true) }} style={{
                position:'absolute', left:'157px', top:'458px',
                width:'147px', height:'60px',
                background:'#aecbfa', borderRadius:'31.025px',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer',
              }}>
                <span style={{color:'#18315d',fontSize:'21.304px',fontFamily:"'Arimo',sans-serif"}}>Save</span>
              </div>
              {/* Discard */}
              <span style={{
                position:'absolute', left:'50%', top:'530px',
                transform:'translateX(-50%)',
                color:'#aecbfa', fontSize:'21.304px',
                fontFamily:"'Arimo',sans-serif", cursor:'pointer', whiteSpace:'nowrap',
              }} onClick={() => {
                setSlots(computeDefaultSlots(rangeStart, rangeEnd))
                setCustomizeOpen(false)
                setDialogOpen(true)
              }}>Discard</span>
              {/* Bottom */}
              <div style={{position:'absolute',background:'#373737',height:'1.121px',left:0,top:'800px',width:'478.5px'}} />
              <img src="/assets/expand-completed.svg" alt="" style={{position:'absolute',left:'22.43px',top:'818px',width:'22.43px',height:'22.43px'}} />
              <span style={{position:'absolute',left:'56.07px',top:'816px',color:'#c4c7c5',fontSize:'20.934px',fontFamily:"'Arimo',sans-serif",whiteSpace:'nowrap'}}>All group events</span>
            </div>
          ) : savedPoll ? (
            /* ── EVENT POLL CONTENT ── */
            <div className={styles.pollingPanelContent}>
              <div style={{position:'absolute',background:'#3d5576',borderRadius:'6px',width:'22px',height:'22px',left:'22px',top:'133px'}} />
              <span style={{position:'absolute',left:'55px',top:'126px',color:'#dedfdf',fontSize:'28px',
                fontFamily:"'Roboto',sans-serif",whiteSpace:'nowrap',maxWidth:'400px',overflow:'hidden',textOverflow:'ellipsis'}}>
                {savedPoll.title || 'Untitled'}
              </span>
              <div style={{position:'absolute',left:'22px',top:'185px',display:'flex',flexDirection:'column',gap:'30px',width:'440px'}}>
                {(savedPoll.options || []).map((opt, i) => {
                  const checked = checkedTimeOptions.has(i)
                  const displayN = opt.n + (checked ? 1 : 0)
                  return (
                  <div key={i} style={{display:'flex',gap:'20px',alignItems:'center'}}>
                    <div style={{display:'flex',flexDirection:'column',gap:'8px',width:'250px',flexShrink:0}}>
                      <div style={{display:'flex',gap:'15px',alignItems:'flex-start'}}>
                        <div onClick={() => setCheckedTimeOptions(prev => {
                          const next = new Set(prev)
                          if (next.has(i)) next.delete(i); else next.add(i)
                          return next
                        })} style={{
                          width:'22px', height:'22px',
                          border: checked ? 'none' : '1.495px solid white',
                          borderRadius:'2px', boxSizing:'border-box', flexShrink:0, marginTop:'2px',
                          background: checked ? '#1a73e8' : 'transparent',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          cursor:'pointer',
                        }}>
                          {checked && <span style={{color:'white',fontSize:'14px',lineHeight:1,marginTop:'-1px'}}>✓</span>}
                        </div>
                        <div style={{color:'white',fontSize:'18px',fontFamily:"'Inter',sans-serif",lineHeight:'1.3'}}>
                          <p style={{margin:0,fontWeight:500}}>{opt.date}</p>
                          <p style={{margin:0}}>{opt.time}</p>
                        </div>
                      </div>
                      <span style={{color:'#bec1bf',fontSize:'16px',fontFamily:"'Roboto',sans-serif",paddingLeft:'37px'}}>
                        ({opt.avail + (checked ? 1 : 0)}/{opt.total} available)
                      </span>
                    </div>
                    <div style={{display:'flex',gap:'16px',alignItems:'center',flexShrink:0}}>
                      <DonutChart numerator={displayN} denominator={opt.total} />
                      <div style={{position:'relative',width:'28px',height:'28px',flexShrink:0}}>
                        {[6,13,20].map(t=>(
                          <div key={t} style={{position:'absolute',left:'12px',top:`${t}px`,
                            width:'4px',height:'4px',background:'#c4c7c5',borderRadius:'50%'}} />
                        ))}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
              {/* Actions */}
              <div style={{position:'absolute',left:'216px',top:'751px',width:'239.93px',height:'62.878px'}}>
                <span style={{position:'absolute',left:'16.55px',top:'21.51px',color:'#aecbfa',
                  fontSize:'17.043px',fontFamily:"'Arimo',sans-serif",cursor:'pointer'}}>More options</span>
                <div onClick={() => setPollOpen(false)} style={{position:'absolute',left:'145.61px',top:'8.27px',
                  width:'94.317px',height:'47.986px',background:'#aecbfa',borderRadius:'24.82px',
                  display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                  <span style={{color:'#18315d',fontSize:'17.043px',fontFamily:"'Arimo',sans-serif"}}>done</span>
                </div>
              </div>
              <div style={{position:'absolute',background:'#373737',height:'1.121px',left:0,top:'829.9px',width:'478.5px'}} />
              <img src="/assets/expand-completed.svg" alt="" style={{position:'absolute',left:'22.43px',top:'848.59px',width:'22.43px',height:'22.43px'}} />
              <span style={{position:'absolute',left:'56.07px',top:'846.72px',color:'#c4c7c5',fontSize:'20.934px',fontFamily:"'Arimo',sans-serif",whiteSpace:'nowrap'}}>All group events</span>
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
                fontFamily:"'Arimo',sans-serif",
              }}>
                <p style={{color:'#e3e3e3',fontSize:'24.299px',width:'100%',margin:0}}>No active polls</p>
                <p style={{color:'#c4c7c5',fontSize:'20.561px',width:'100%',margin:0}}>
                  Create a poll and add people to decide when to schedule your events
                </p>
              </div>
              <div style={{
                position:'absolute', left:'131px', top:'410px',
                width:'195px', height:'40px',
                background:'#a8c7fa', borderRadius:'39px',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer',
              }} onClick={() => setDialogOpen(true)}>
                <span style={{color:'#0a3273',fontSize:'18px',fontWeight:500,fontFamily:"'Arimo',sans-serif"}}>Create poll</span>
              </div>
              <div style={{position:'absolute',background:'#373737',height:'1.121px',left:0,top:'800px',width:'478.5px'}} />
              <img src="/assets/expand-completed.svg" alt="" style={{position:'absolute',left:'22.43px',top:'818px',width:'22.43px',height:'22.43px'}} />
              <span style={{position:'absolute',left:'56.07px',top:'816px',color:'#c4c7c5',fontSize:'20.934px',fontFamily:"'Arimo',sans-serif",whiteSpace:'nowrap'}}>All group events</span>
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
              const days = []
              if (startDate && endDate) {
                const d = new Date(startDate)
                const mockTimes = ['12:00 – 1:00pm', '2:00 – 3:00pm', '4:00 – 5:00pm']
                const mockN    = [4, 3, 3]
                const mockAvail = [7, 7, 6]
                while (d <= endDate && days.length < 3) {
                  days.push({
                    date:  d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' }),
                    time:  mockTimes[days.length],
                    avail: mockAvail[days.length],
                    total: 9,
                    n:     mockN[days.length],
                  })
                  d.setDate(d.getDate() + 1)
                }
              }
              if (days.length === 0) days.push(
                { date:'Monday, November 9',    time:'12:00 – 1:00pm', avail:7, total:9, n:4 },
                { date:'Wednesday, November 11',time:'12:00 – 1:00pm', avail:7, total:9, n:3 },
                { date:'Thursday, November 12', time:'3:00 – 4:00pm',  avail:6, total:9, n:3 },
              )
              setSavedPoll({ title, options: days })
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
            onAddGroup={() => { setDialogOpen(false); setSelectGroupOpen(true) }}
          />
        </div>
      )}

      {/* ── GOOGLE APPS RAIL ── */}
      <div className={styles.googleApps} style={{left: googleAppsLeft}}>
        <img src="/assets/group3.svg"     alt="" style={{left:'27.77px',top:'26.54px',width:'22px',height:'29px'}} />
        <img src="/assets/group2.svg"     alt="" style={{left:'24.77px',top:'110.54px',width:'28px',height:'29px'}} />
        <img src="/assets/group4.svg"     alt="" style={{left:'27.77px',top:'195.54px',width:'22.001px',height:'26.014px'}} />
        <img src="/assets/mask-group.svg" alt="" style={{left:'27.76px',top:'278.54px',width:'22.027px',height:'28.21px'}} />

        {/* Poll icon highlight circle (shown when open) */}
        {pollOpen && (
          <img src="/assets/ellipse1.svg" alt=""
            style={{position:'absolute',left:'8.77px',top:'329.54px',width:'59px',height:'59px'}} />
        )}

        {/* Chart bars — clickable poll icon */}
        <div
          onClick={() => setPollOpen(p => !p)}
          style={{position:'absolute',left:'8px',top:'329px',width:'59px',height:'55px',cursor:'pointer'}}
          title="Group Event Polling"
        >
          <div style={{position:'absolute',background:'#678df2',width:'24.973px',height:'4.919px',left:'17.77px',top:'37.08px',
            borderBottomLeftRadius:'10px',borderBottomRightRadius:'10px'}} />
          <div style={{position:'absolute',display:'flex',width:'7.568px',height:'21.568px',alignItems:'center',justifyContent:'center',left:'35.17px',top:'14.54px'}}>
            <div style={{transform:'rotate(90deg)',background:'#2c59cd',width:'21.568px',height:'7.568px',borderTopLeftRadius:'10px',borderBottomLeftRadius:'10px'}} />
          </div>
          <div style={{position:'absolute',display:'flex',width:'7.568px',height:'17.784px',alignItems:'center',justifyContent:'center',left:'26.47px',top:'18.33px'}}>
            <div style={{transform:'rotate(90deg)',background:'#4e88ff',width:'17.784px',height:'7.568px',borderTopLeftRadius:'10px',borderBottomLeftRadius:'10px'}} />
          </div>
          <div style={{position:'absolute',display:'flex',width:'7.568px',height:'12.865px',alignItems:'center',justifyContent:'center',left:'17.77px',top:'23.25px'}}>
            <div style={{transform:'rotate(90deg)',background:'#8c9eff',width:'12.865px',height:'7.568px',borderTopLeftRadius:'10px',borderBottomLeftRadius:'10px'}} />
          </div>
        </div>

        {/* Blue selected indicator bar */}
        {pollOpen && (
          <div style={{position:'absolute',background:'#8ab4f8',width:'3.738px',height:'52.336px',left:'-4px',top:'335px'}} />
        )}

        <img src="/assets/add-addons.svg"  alt="" style={{left:'22.43px',top:'431.21px',width:'29.906px',height:'29.906px'}} />
        <img src="/assets/information.svg" alt="" style={{left:'18.69px',top:'844.85px',width:'29.906px',height:'29.906px'}} />
      </div>

    </div>
  )
}

function DonutChart({ numerator, denominator }) {
  const size = 84, r = 30, cx = 42, cy = 42
  const circ = 2 * Math.PI * r
  const filled = denominator > 0 ? (numerator / denominator) * circ : 0
  return (
    <svg width={size} height={size} style={{ flexShrink:0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#3c4043" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#a8c7fa" strokeWidth="10"
        strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
        fill="#a8c7fa" fontSize="20" fontFamily="'Roboto',sans-serif" fontWeight="500">
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
        <div style={{position:'absolute',left:'7.46px',top:'3.73px',color:tc,fontSize:`${s}px`,whiteSpace:'nowrap'}}>
          {lines.map((line,i) => (
            <p key={i} style={{lineHeight:'20.528px',margin:0,fontWeight:(bold||(firstBold&&i===0))?700:400}}>{line}</p>
          ))}
        </div>
      ) : (
        <span style={{position:'absolute',left:'7.46px',top:'3.73px',color:tc,fontSize:`${s}px`,
          whiteSpace:'nowrap',lineHeight:'20.528px',fontWeight:bold?700:400}}>{children}</span>
      )}
    </div>
  )
}
