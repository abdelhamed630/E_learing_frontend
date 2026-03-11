import { useState, useEffect, useRef } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

// ═══════════════════════════════════════════════════
//  PROTECTED VIDEO PLAYER
//  - يجيب signed token من الباك
//  - يمنع right-click, screenshot, download
//  - يحجب الـ controls الأصلية
//  - يمنع iframe embedding من بره
// ═══════════════════════════════════════════════════
export default function ProtectedVideoPlayer({ videoId, videoUrl, title, isEnrolled }) {
  const { user } = useAuth()
  const videoRef   = useRef(null)
  const overlayRef = useRef(null)
  const [streamUrl, setStreamUrl] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [playing,   setPlaying]   = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [duration,  setDuration]  = useState(0)
  const [volume,    setVolume]    = useState(1)
  const [muted,     setMuted]     = useState(false)
  const [showCtrl,  setShowCtrl]  = useState(true)
  const [speed,     setSpeed]      = useState(1)
  const [showSpeed, setShowSpeed]  = useState(false)
  const hideTimer = useRef(null)

  // ── تغيير سرعة الفيديو ──
  function changeSpeed(s) {
    setSpeed(s)
    setShowSpeed(false)
    if (videoRef.current) videoRef.current.playbackRate = s
  }

  // ── جيب الـ signed token ──
  useEffect(() => {
    if (!videoId) { setLoading(false); return }

    const endpoint = user
      ? `/courses/video-token/${videoId}/`
      : `/courses/video-token/${videoId}/free/`

    api.get(endpoint)
      .then(r => {
        const { token, expires, uid: tokenUid } = r.data
        const base = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || window.location.origin
        const uid  = tokenUid ?? (user?.id || 0)
        const url  = `${base}/api/courses/video-token/${videoId}/stream/?token=${token}&uid=${uid}&exp=${expires}`
        setStreamUrl(url)
      })
      .catch(() => {
        if (videoUrl && (videoUrl.includes('youtube') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo'))) {
          setStreamUrl(videoUrl)
        } else if (videoUrl) {
          setStreamUrl(videoUrl)
        } else {
          setError('غير مصرح بمشاهدة هذا الفيديو')
        }
      })
      .finally(() => setLoading(false))
  }, [videoId, user])

  // ── منع Right-Click ──
  useEffect(() => {
    const prevent = (e) => e.preventDefault()
    document.addEventListener('contextmenu', prevent)
    return () => document.removeEventListener('contextmenu', prevent)
  }, [])

  // ── إخفاء Controls تلقائياً ──
  function resetHideTimer() {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowCtrl(false), 3000)
  }

  // ── Controls ──
  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else          { v.pause(); setPlaying(false) }
  }

  function seek(e) {
    const v = videoRef.current
    if (!v) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    v.currentTime = pct * v.duration
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  function changeVolume(e) {
    const v = videoRef.current
    if (!v) return
    v.volume = e.target.value
    setVolume(e.target.value)
  }

  function toggleFullscreen() {
    const wrap = overlayRef.current
    if (!wrap) return
    if (document.fullscreenElement) document.exitFullscreen()
    else wrap.requestFullscreen()
  }

  function fmtTime(s) {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2,'0')}`
  }

  // ── Keyboard Shortcuts — فقط لما التركيز على المشغل مش على textarea ──
  useEffect(() => {
    function onKey(e) {
      if (!videoRef.current) return
      // تجاهل الضغط لو المستخدم بيكتب في input أو textarea
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.contentEditable === 'true') return
      if (e.code === 'Space') { e.preventDefault(); togglePlay() }
      if (e.code === 'ArrowRight') videoRef.current.currentTime += 5
      if (e.code === 'ArrowLeft')  videoRef.current.currentTime -= 5
      if (e.code === 'KeyM') toggleMute()
      if (e.code === 'KeyF') toggleFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (loading) return (
    <div style={S.wrap}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#fff' }}>
        <div className="spinner" />
      </div>
    </div>
  )

  if (error) return (
    <div style={S.wrap}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:'1rem' }}>
        <div style={{ fontSize:'3rem' }}>🔒</div>
        <p style={{ color:'#fff', textAlign:'center' }}>{error}</p>
      </div>
    </div>
  )

  // لو YouTube/Vimeo — نستخدم iframe مع منع controls
  const isExternal = streamUrl && (streamUrl.includes('youtube') || streamUrl.includes('youtu.be') || streamUrl.includes('vimeo'))

  if (isExternal) {
    // حول YouTube URL لـ embed
    let embedUrl = streamUrl
    if (streamUrl.includes('youtu.be/')) {
      const id = streamUrl.split('youtu.be/')[1]?.split('?')[0]
      embedUrl = `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0&controls=1&disablekb=0`
    } else if (streamUrl.includes('youtube.com/watch')) {
      const id = new URLSearchParams(streamUrl.split('?')[1]).get('v')
      embedUrl = `https://www.youtube.com/embed/${id}?modestbranding=1&rel=0&controls=1`
    } else if (streamUrl.includes('vimeo.com/')) {
      const id = streamUrl.split('vimeo.com/')[1]?.split('?')[0]
      embedUrl = `https://player.vimeo.com/video/${id}?byline=0&portrait=0&title=0`
    }

    return (
      <div style={S.wrap} onContextMenu={e => e.preventDefault()}>
        <iframe
          src={embedUrl}
          style={{ width:'100%', height:'100%', border:'none' }}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
        {/* طبقة شفافة تمنع right-click على الـ iframe */}
        <div style={S.iframeGuard} onContextMenu={e => e.preventDefault()} />
      </div>
    )
  }

  // الـ video player المحلي مع كل الحماية
  return (
    <div
      ref={overlayRef}
      style={S.wrap}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => setShowCtrl(false)}
      onContextMenu={e => e.preventDefault()}
    >
      {/* الفيديو نفسه — بدون controls أصلية */}
      <video
        ref={videoRef}
        src={streamUrl}
        style={S.video}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onTimeUpdate={() => {
          const v = videoRef.current
          if (v) setProgress((v.currentTime / v.duration) * 100)
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) setDuration(videoRef.current.duration)
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onContextMenu={e => e.preventDefault()}
        onClick={togglePlay}
      />

      {/* طبقة حماية شفافة فوق الفيديو تمنع drag و right-click */}
      <div style={S.protectLayer} onContextMenu={e => e.preventDefault()} />

      {/* Watermark - يُظهر إيميل المستخدم بشكل خفي */}
      {user && (
        <div style={S.watermark}>
          {user.email}
        </div>
      )}

      {/* Controls مخصصة */}
      <div style={{ ...S.controls, opacity: showCtrl ? 1 : 0 }}>
        {/* Progress Bar */}
        <div style={S.progressWrap} onClick={seek}>
          <div style={{ ...S.progressFill, width: `${progress}%` }} />
        </div>

        <div style={S.ctrlRow}>
          {/* Play/Pause */}
          <button style={S.btn} onClick={togglePlay}>
            {playing ? '⏸' : '▶️'}
          </button>

          {/* Volume */}
          <button style={S.btn} onClick={toggleMute}>
            {muted || volume == 0 ? '🔇' : '🔊'}
          </button>
          <input
            type="range" min="0" max="1" step="0.1"
            value={muted ? 0 : volume}
            onChange={changeVolume}
            style={{ width: 70, accentColor: '#4f8cff' }}
          />

          {/* Time */}
          <span style={{ color: '#fff', fontSize: '.78rem', marginLeft: 8 }}>
            {fmtTime(videoRef.current?.currentTime)} / {fmtTime(duration)}
          </span>

          <div style={{ flex: 1 }} />

          {/* Title */}
          <span style={{ color: 'rgba(255,255,255,.7)', fontSize: '.75rem' }}>{title}</span>

          {/* Speed Control */}
          <div style={{ position: 'relative' }}>
            <button style={{ ...S.btn, fontSize: '.72rem', fontWeight: 700, minWidth: 36 }}
              onClick={() => setShowSpeed(s => !s)}>
              {speed}x
            </button>
            {showSpeed && (
              <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(20,25,45,.95)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: '.35rem', marginBottom: '.3rem', zIndex: 20 }}>
                {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(s => (
                  <button key={s} onClick={() => changeSpeed(s)}
                    style={{ display: 'block', width: '100%', padding: '.3rem .6rem', background: speed === s ? 'rgba(79,140,255,.3)' : 'transparent', border: 'none', color: speed === s ? '#4f8cff' : 'rgba(255,255,255,.8)', borderRadius: 6, cursor: 'pointer', fontSize: '.75rem', fontWeight: 700, textAlign: 'center', fontFamily: 'Cairo,sans-serif' }}>
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button style={S.btn} onClick={toggleFullscreen}>⛶</button>
        </div>
      </div>

      {/* Center Play Button */}
      {!playing && (
        <div style={S.centerPlay} onClick={togglePlay}>
          <div style={S.centerBtn}>▶</div>
        </div>
      )}
    </div>
  )
}

const S = {
  wrap:         { position:'relative', width:'100%', aspectRatio:'16/9', background:'#000', borderRadius:12, overflow:'hidden', userSelect:'none' },
  video:        { width:'100%', height:'100%', objectFit:'contain', display:'block' },
  protectLayer: { position:'absolute', top:0, left:0, right:0, bottom:50, zIndex:2, cursor:'pointer' },
  iframeGuard:  { position:'absolute', top:0, left:0, right:0, bottom:0, zIndex:1, pointerEvents:'none' },
  controls:     { position:'absolute', bottom:0, left:0, right:0, zIndex:10, background:'linear-gradient(transparent,rgba(0,0,0,.8))', padding:'1rem .75rem .5rem', transition:'opacity .3s' },
  progressWrap: { height:4, background:'rgba(255,255,255,.3)', borderRadius:2, marginBottom:'.5rem', cursor:'pointer', position:'relative' },
  progressFill: { height:'100%', background:'#4f8cff', borderRadius:2, transition:'width .1s' },
  watermark: { position:'absolute', bottom:60, right:16, color:'rgba(255,255,255,.07)', fontSize:'.65rem', pointerEvents:'none', userSelect:'none', zIndex:3, fontFamily:'monospace' },
  ctrlRow:      { display:'flex', alignItems:'center', gap:'.4rem' },
  btn:          { background:'none', border:'none', color:'#fff', cursor:'pointer', fontSize:'1.1rem', padding:'0 .25rem', lineHeight:1 },
  centerPlay:   { position:'absolute', top:0, left:0, right:0, bottom:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:5, cursor:'pointer' },
  centerBtn:    { width:60, height:60, borderRadius:'50%', background:'rgba(79,140,255,.85)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', color:'#fff', backdropFilter:'blur(4px)' },
}
