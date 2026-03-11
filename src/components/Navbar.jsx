import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { notificationsAPI } from '../api'
import { getImgUrl } from '../utils'

export default function Navbar({ showToast }) {
  const { user, logout }  = useAuth()
  const { theme, toggle } = useTheme()
  const navigate   = useNavigate()
  const location   = useLocation()
  const menuRef    = useRef(null)
  const bellRef    = useRef(null)

  const [menuOpen,   setMenuOpen]   = useState(false)
  const [bellOpen,   setBellOpen]   = useState(false)
  const [scrolled,   setScrolled]   = useState(false)
  const [unread,     setUnread]     = useState(0)
  const [notifs,     setNotifs]     = useState([])
  const [notifsLoad, setNotifsLoad] = useState(false)

  const isActive = p => p==='/' ? location.pathname==='/' : location.pathname.startsWith(p)

  // Scroll effect
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive:true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Click outside
  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Poll unread count every 30s
  const fetchUnread = useCallback(async () => {
    if (!user) return
    try {
      const r = await notificationsAPI.unreadCount()
      setUnread(r.data.count || 0)
    } catch {}
  }, [user])

  useEffect(() => {
    fetchUnread()
    const t = setInterval(fetchUnread, 30000)
    return () => clearInterval(t)
  }, [fetchUnread])

  async function openBell() {
    setBellOpen(o => !o)
    if (!bellOpen) {
      setNotifsLoad(true)
      try {
        const r = await notificationsAPI.list({ limit:8 })
        setNotifs(r.data.results || r.data || [])
        setUnread(0)
      } catch {} finally { setNotifsLoad(false) }
    }
  }

  async function markRead(id) {
    try { await notificationsAPI.markRead(id) } catch {}
    setNotifs(n => n.map(x => x.id===id ? {...x, is_read:true} : x))
  }

  async function markAllRead() {
    try { await notificationsAPI.markAllRead() } catch {}
    setNotifs(n => n.map(x => ({...x, is_read:true})))
    setUnread(0)
  }

  async function deleteNotif(e, id) {
    e.stopPropagation()
    try { await notificationsAPI.delete(id) } catch {}
    setNotifs(n => n.filter(x => x.id !== id))
  }

  async function handleLogout() {
    await logout()
    showToast('تم تسجيل الخروج بنجاح', 'success')
    navigate('/')
    setMenuOpen(false)
  }

  const dashLink  = user?.role==='instructor' ? '/instructor/overview' : '/dashboard/overview'
  const avatarUrl = getImgUrl(user?.avatar)
  const initials  = (user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()

  const notifIcon = t => ({
    course_enrolled:'📚', course_completed:'🏆', exam_result:'📝',
    payment_success:'💳', payment_failed:'⚠️', new_course:'✨',
    announcement:'📢', system:'⚙️', reminder:'⏰'
  }[t] || '🔔')

  const timeAgo = d => {
    const diff = (Date.now() - new Date(d)) / 1000
    if (diff < 60)   return 'الآن'
    if (diff < 3600) return `${Math.floor(diff/60)} د`
    if (diff < 86400) return `${Math.floor(diff/3600)} س`
    return `${Math.floor(diff/86400)} ي`
  }

  return (
    <nav style={{
      position:'fixed', top:0, width:'100%', zIndex:1000,
      backdropFilter:'blur(20px)', padding:'0 2rem', height:64,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      background: scrolled ? 'var(--nav-bg)' : 'transparent',
      borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
      boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,.15)' : 'none',
      transition:'all 0.3s ease',
    }}>
      {/* Logo */}
      <Link to="/" style={{ display:'flex', alignItems:'center', gap:'.4rem', fontFamily:"'Tajawal',sans-serif", fontSize:'1.5rem', fontWeight:900, background:'var(--grad)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', textDecoration:'none', flexShrink:0 }}>
        ✦ EduVerse
      </Link>

      {/* Desktop Links */}
      <div style={{ display:'flex', gap:'.1rem', alignItems:'center' }}>
        <Link to="/"            className={`nav-link ${isActive('/') ? 'active' : ''}`}>الرئيسية</Link>
        <Link to="/courses"     className={`nav-link ${isActive('/courses') ? 'active' : ''}`}>الكورسات</Link>
        <Link to="/categories"  className={`nav-link ${isActive('/categories') ? 'active' : ''}`}>التصنيفات</Link>
        <Link to="/instructors" className={`nav-link ${isActive('/instructors') ? 'active' : ''}`}>المدربون</Link>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', gap:'.6rem', alignItems:'center' }}>
        <button className="theme-toggle" onClick={toggle} title={theme==='dark' ? 'وضع النهار' : 'وضع الليل'}>
          {theme==='dark' ? '☀️' : '🌙'}
        </button>

        {user ? (
          <>
            {/* Bell */}
            <div style={{ position:'relative' }} ref={bellRef}>
              <button onClick={openBell}
                style={{ position:'relative', background:'var(--surface)', border:'1px solid ' + (unread > 0 ? 'rgba(239,68,68,.4)' : 'var(--border)'), borderRadius:10, padding:'.5rem .7rem', color:'var(--text2)', fontSize:'1rem', cursor:'pointer', display:'flex', alignItems:'center', transition:'all .2s' }}>
                🔔
                {unread > 0 && (
                  <>
                    <span style={{ position:'absolute', top:-6, left:-6, background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'white', borderRadius:'50%', width:18, height:18, fontSize:'.65rem', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--bg)', boxShadow:'0 0 0 3px rgba(239,68,68,.2)', animation:'pulse-glow 1.5s ease infinite' }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                    <span className="notif-dot" style={{ top:-3, left:-3 }} />
                  </>
                )}
              </button>

              {/* Bell Dropdown */}
              {bellOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 10px)', left:0, background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:16, width:320, boxShadow:'0 20px 50px rgba(0,0,0,.4)', zIndex:200, overflow:'hidden' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 1.25rem', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ fontWeight:700, fontSize:'.9rem' }}>🔔 الإشعارات</span>
                    <div style={{ display:'flex', gap:'.5rem' }}>
                      <button onClick={markAllRead} style={{ background:'none', border:'none', color:'var(--accent)', fontSize:'.75rem', cursor:'pointer', fontFamily:"'Cairo',sans-serif" }}>قراءة الكل</button>
                      <span style={{ color:'var(--border2)' }}>|</span>
                      <button onClick={async () => { try { await notificationsAPI.markAllRead() } catch {} setNotifs([]); setUnread(0) }}
                        style={{ background:'none', border:'none', color:'var(--red)', fontSize:'.75rem', cursor:'pointer', fontFamily:"'Cairo',sans-serif" }}>مسح الكل</button>
                    </div>
                  </div>

                  <div style={{ maxHeight:360, overflowY:'auto' }}>
                    {notifsLoad ? (
                      <div style={{ padding:'2rem', textAlign:'center' }}><div className="spinner" /></div>
                    ) : notifs.length ? notifs.map(n => (
                      <div key={n.id}
                        onClick={() => { markRead(n.id); if(n.link) navigate(n.link); setBellOpen(false) }}
                        style={{ display:'flex', gap:'.75rem', padding:'.85rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,.05)', cursor:'pointer', background: n.is_read ? 'transparent' : 'rgba(79,140,255,.05)', transition:'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'rgba(79,140,255,.05)'}>
                        <div style={{ width:36, height:36, borderRadius:10, background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem', flexShrink:0 }}>
                          {notifIcon(n.notification_type)}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize:'.83rem', marginBottom:'.2rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{n.title}</div>
                          <div style={{ fontSize:'.75rem', color:'var(--text3)', lineHeight:1.4, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{n.message}</div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'.3rem', flexShrink:0 }}>
                          <span style={{ fontSize:'.68rem', color:'var(--text3)' }}>{timeAgo(n.created_at)}</span>
                          {!n.is_read && <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent)' }} />}
                          <button onClick={e => deleteNotif(e, n.id)}
                            style={{ background:'none', border:'none', color:'var(--text3)', fontSize:'.75rem', cursor:'pointer', padding:'2px 4px', borderRadius:4, lineHeight:1 }}
                            title="حذف الإشعار">✕</button>
                        </div>
                      </div>
                    )) : (
                      <div style={{ padding:'2.5rem', textAlign:'center', color:'var(--text3)', fontSize:'.85rem' }}>
                        <div style={{ fontSize:'2.5rem', marginBottom:'.5rem' }}>🔔</div>
                        لا يوجد إشعارات
                      </div>
                    )}
                  </div>

                  <div style={{ padding:'.75rem 1.25rem', borderTop:'1px solid var(--border)' }}>
                    <button onClick={() => { setBellOpen(false); navigate(user?.role==='instructor' ? '/instructor/settings' : '/dashboard/notifications') }}
                      style={{ display:'block', width:'100%', textAlign:'center', color:'var(--accent)', fontSize:'.8rem', background:'none', border:'none', cursor:'pointer', fontWeight:600, fontFamily:"'Cairo',sans-serif" }}>
                      عرض كل الإشعارات ←
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Avatar Menu */}
            <div style={{ position:'relative' }} ref={menuRef}>
              <button onClick={() => setMenuOpen(o => !o)}
                style={{ width:40, height:40, borderRadius:'50%', background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'.9rem', color:'white', cursor:'pointer', transition:'all .25s', overflow:'hidden', padding:0, outline:'none', border: menuOpen ? '2px solid var(--accent)' : '2px solid transparent', boxShadow: menuOpen ? '0 0 0 3px rgba(79,140,255,.25)' : '0 0 0 2px var(--border2)', transform: menuOpen ? 'scale(1.05)' : 'scale(1)' }}>
                {avatarUrl ? <img src={avatarUrl} alt={initials} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} /> : initials}
              </button>

              {menuOpen && (
                <div style={{ position:'absolute', top:'calc(100% + 10px)', left:0, background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:16, padding:'.75rem', width:240, boxShadow:'0 20px 50px rgba(0,0,0,.4)', animation:'slideUp .2s ease', zIndex:100 }}>
                  <div style={{ display:'flex', gap:'.75rem', alignItems:'flex-start', padding:'.25rem .25rem .75rem' }}>
                    <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'white', fontSize:'1.1rem', flexShrink:0, overflow:'hidden', boxShadow:'0 0 0 3px rgba(79,140,255,.2)', border:'2px solid var(--accent)' }}>
                      {avatarUrl ? <img src={avatarUrl} alt={initials} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} /> : initials}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'.9rem' }}>{user.first_name ? `${user.first_name} ${user.last_name||''}` : user.username}</div>
                      <div style={{ fontSize:'.72rem', color:'var(--text3)', marginTop:2 }}>{user.email}</div>
                      <div style={{ marginTop:4 }}>
                        <span className={`badge ${user.role==='instructor' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize:'.65rem' }}>
                          {user.role==='instructor' ? '🎓 مدرب' : '👨‍🎓 طالب'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ height:1, background:'var(--border)', margin:'.4rem 0' }} />
                  {[
                    { icon:'📊', label:'لوحة التحكم',   to: dashLink },
                    { icon:'👤', label:'ملفي الشخصي',   to: dashLink.includes('instructor') ? '/instructor/profile' : '/dashboard/profile' },
                    { icon:'⚙️', label:'الإعدادات',     to: dashLink.includes('instructor') ? '/instructor/settings' : '/dashboard/settings' },
                  ].map(item => (
                    <button key={item.to} onClick={() => { setMenuOpen(false); navigate(item.to) }}
                      style={{ display:'flex', alignItems:'center', gap:'.6rem', width:'100%', padding:'.55rem .75rem', borderRadius:8, border:'none', background:'transparent', color:'var(--text2)', fontSize:'.85rem', fontWeight:600, transition:'all .15s', cursor:'pointer', fontFamily:"'Cairo',sans-serif", textAlign:'right' }}
                      onMouseEnter={e => { e.currentTarget.style.background='var(--surface2)'; e.currentTarget.style.color='var(--text)' }}
                      onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text2)' }}>
                      <span>{item.icon}</span> {item.label}
                    </button>
                  ))}
                  <div style={{ height:1, background:'var(--border)', margin:'.4rem 0' }} />
                  <button onClick={handleLogout}
                    style={{ display:'flex', alignItems:'center', gap:'.6rem', width:'100%', padding:'.55rem .75rem', borderRadius:8, border:'none', background:'transparent', color:'var(--red)', fontSize:'.85rem', fontWeight:700, cursor:'pointer', fontFamily:"'Cairo',sans-serif" }}>
                    <span>🚪</span> تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <Link to="/login"              className="btn btn-outline btn-sm">تسجيل الدخول</Link>
            <Link to="/login?tab=register" className="btn btn-primary btn-sm">ابدأ مجاناً ✨</Link>
          </>
        )}
      </div>
    </nav>
  )
}
