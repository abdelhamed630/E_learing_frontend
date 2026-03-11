import { useNavigate } from 'react-router-dom'
import { formatPrice, levelLabel, courseEmoji, getImgUrl } from '../utils'

export default function CourseCard({ course: c }) {
  const navigate   = useNavigate()
  const price      = c.discount_price || c.price
  const isFree     = !price || parseFloat(price) === 0
  const thumbUrl   = getImgUrl(c.thumbnail || c.image)

  // بيانات المدرب
  const instr      = c.instructor   // { id, full_name, username, avatar_url }
  const _fn        = instr?.full_name?.trim()
  const instrName  = (_fn && _fn !== '') ? _fn : (instr?.username || c.instructor_name || '—')
  const instrAvUrl = getImgUrl(instr?.avatar_url || instr?.avatar)
  const instrInit  = instrName.trim().charAt(0).toUpperCase()

  return (
    <div
      style={S.card}
      onClick={() => navigate(`/courses/${c.slug || c.id}`)}
      onMouseEnter={e => {
        e.currentTarget.style.transform    = 'translateY(-6px)'
        e.currentTarget.style.boxShadow   = '0 20px 50px rgba(0,0,0,.35), 0 0 0 1px rgba(79,140,255,.2)'
        e.currentTarget.style.borderColor = 'rgba(79,140,255,.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform    = ''
        e.currentTarget.style.boxShadow   = ''
        e.currentTarget.style.borderColor = 'var(--border)'
      }}
    >
      {/* ── Thumbnail ── */}
      <div style={S.thumb}>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={c.title}
            style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .4s ease', display:'block' }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = ''}
            onError={e => { e.target.style.display = 'none'; e.target.parentNode.querySelector('.thumb-fallback').style.display = 'flex' }}
          />
        ) : null}

        {/* Fallback emoji */}
        <div className="thumb-fallback" style={{ display: thumbUrl ? 'none' : 'flex', width:'100%', height:'100%', alignItems:'center', justifyContent:'center', fontSize:'3.5rem', background:'linear-gradient(135deg,var(--bg3),var(--surface3))' }}>
          {courseEmoji(c.category?.name || c.title)}
        </div>

        {/* Price badge */}
        <div style={{ position:'absolute', top:10, right:10, display:'flex', flexDirection:'column', gap:'.3rem', alignItems:'flex-end' }}>
          <span style={{ ...S.badge, background: isFree ? 'var(--accent3)' : 'rgba(8,12,24,.85)', color: isFree ? '#080c18' : 'white', backdropFilter:'blur(8px)' }}>
            {isFree ? '🆓 مجاني' : formatPrice(price)}
          </span>
          {c.level && (
            <span style={{ ...S.badge, background:'rgba(8,12,24,.7)', color:'rgba(255,255,255,.9)', backdropFilter:'blur(8px)' }}>
              {levelLabel(c.level)}
            </span>
          )}
        </div>

        {/* Enrolled badge */}
        {c.is_enrolled && (
          <div style={{ position:'absolute', bottom:10, right:10 }}>
            <span style={{ ...S.badge, background:'rgba(0,212,170,.92)', color:'#080c18' }}>✓ مسجل</span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={S.body}>
        {/* Category */}
        <div style={S.cat}>{c.category?.name || 'عام'}</div>

        {/* Title */}
        <div style={S.title} title={c.title}>{c.title}</div>

        {/* ── Instructor ── */}
        <div style={S.instr}>
          {/* Avatar */}
          <div style={S.instrAv}>
            {instrAvUrl ? (
              <img
                src={instrAvUrl}
                alt={instrName}
                style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}
                onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
              />
            ) : null}
            <span style={{ display: instrAvUrl ? 'none' : 'flex', width:'100%', height:'100%', alignItems:'center', justifyContent:'center', fontSize:'.62rem', fontWeight:800 }}>
              {instrInit}
            </span>
          </div>
          <span style={{ fontSize:'.78rem', color:'var(--text2)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {instrName}
          </span>
        </div>

        {/* Meta */}
        <div style={S.meta}>
          {c.duration_hours > 0 && <span>⏱️ {c.duration_hours}س</span>}
          {c.students_count > 0 && <span>👨‍🎓 {c.students_count.toLocaleString()}</span>}
          <span>🌐 {c.language === 'ar' ? 'عربي' : 'English'}</span>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <div style={{ display:'flex', alignItems:'center', gap:'.3rem' }}>
            <span style={{ color:'var(--gold)' }}>⭐</span>
            <span style={{ fontWeight:800, fontSize:'.88rem' }}>{parseFloat(c.rating || 0).toFixed(1)}</span>
            {c.reviews_count > 0 && <span style={{ color:'var(--text3)', fontSize:'.72rem' }}>({c.reviews_count})</span>}
          </div>
          <div>
            {isFree ? (
              <span style={{ fontWeight:900, color:'var(--accent3)', fontSize:'.95rem' }}>مجاني</span>
            ) : (
              <div style={{ display:'flex', alignItems:'baseline', gap:'.3rem' }}>
                {c.discount_price && c.price && parseFloat(c.discount_price) < parseFloat(c.price) && (
                  <span style={{ textDecoration:'line-through', color:'var(--text3)', fontSize:'.75rem' }}>{formatPrice(c.price)}</span>
                )}
                <span style={{ fontWeight:900, color:'var(--accent)', fontSize:'1rem' }}>{formatPrice(price)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  card:    { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:18, overflow:'hidden', cursor:'pointer', transition:'all .3s cubic-bezier(.2,1,.3,1)', display:'flex', flexDirection:'column', height:'100%' },
  thumb:   { height:180, background:'var(--bg3)', position:'relative', overflow:'hidden', flexShrink:0 },
  badge:   { borderRadius:7, padding:'.2rem .55rem', fontSize:'.7rem', fontWeight:800, display:'inline-block', whiteSpace:'nowrap' },
  body:    { padding:'1.1rem 1.25rem', flex:1, display:'flex', flexDirection:'column' },
  cat:     { fontSize:'.68rem', color:'var(--accent)', fontWeight:800, letterSpacing:'.8px', textTransform:'uppercase', marginBottom:'.4rem' },
  title:   { fontWeight:800, fontSize:'.95rem', lineHeight:1.4, marginBottom:'.6rem', flex:1, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' },
  instr:   { display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.55rem', overflow:'hidden' },
  instrAv: { width:24, height:24, borderRadius:'50%', background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.62rem', fontWeight:800, color:'white', flexShrink:0, overflow:'hidden', position:'relative' },
  meta:    { display:'flex', gap:'.6rem', color:'var(--text3)', fontSize:'.74rem', marginBottom:'.8rem', flexWrap:'wrap' },
  footer:  { display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'.75rem', borderTop:'1px solid var(--border)' },
}
