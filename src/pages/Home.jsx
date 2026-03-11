import { useState, useEffect, useRef, useCallback } from 'react'

// Hook for scroll reveal animation
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect() }
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}
import { useNavigate } from 'react-router-dom'
import { coursesAPI } from '../api'
import CourseCard from '../components/CourseCard'
import { MOCK_COURSES, MOCK_CATS } from '../utils'

function useCountUp(target, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start = Math.min(start + step, target)
      setCount(start)
      if (start >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [target])
  return count
}

export default function Home() {
  const [courses, setCourses] = useState([])
  const [cats, setCats]       = useState([])
  const [loading, setLoading] = useState(true)
  const [heroVis, setHeroVis] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setTimeout(() => setHeroVis(true), 100)
    Promise.all([
      coursesAPI.list({ is_published: true, limit: 6 }).catch(() => null),
      coursesAPI.categories({ is_active: true }).catch(() => null),
    ]).then(([cr, catr]) => {
      setCourses(cr?.data?.results || MOCK_COURSES)
      setCats(catr?.data?.results || MOCK_CATS)
      setLoading(false)
    })
  }, [])

  const statsCount = useCountUp(500)
  const usersCount = useCountUp(5000)
  const [coursesRef, coursesVisible] = useInView()
  const [catsRef, catsVisible] = useInView()
  const [statsRef, statsVisible] = useInView()

  return (
    <div>
      {/* ══ HERO ══ */}
      <div style={hero.wrap}>
        <div style={hero.orb1} />
        <div style={hero.orb2} />
        <div style={hero.orb3} />
        <div style={hero.grid} />

        <div style={{ ...hero.content, opacity: heroVis ? 1 : 0, transform: heroVis ? 'none' : 'translateY(30px)', transition: 'all 0.8s cubic-bezier(.2,1,.3,1)' }}>
          <div style={hero.badge}>
            <span style={{ color: 'var(--gold)' }}>⚡</span>
            منصة تعليمية متكاملة للعرب
          </div>

          <h1 style={hero.h1}>
            تعلّم بلا حدود
            <span style={hero.h1Grad}><br />مع أفضل المدربين</span>
          </h1>

          <p style={hero.p}>
            منصة EduVerse تجمع أقوى الكورسات التقنية والإبداعية.
            <br />محتوى محمي، فيديوهات عالية الجودة، شهادات معتمدة.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/courses')}
              style={{ padding: '1rem 2.5rem', fontSize: '1.05rem' }}>
              استكشف الكورسات →
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/login?tab=register')}
              style={{ padding: '1rem 2rem', fontSize: '1.05rem' }}>
              ابدأ مجاناً ✨
            </button>
          </div>

          {/* Stats */}
          <div style={hero.statsRow}>
            <div style={hero.statItem}>
              <div style={hero.statNum}>{statsCount}+</div>
              <div style={hero.statLabel}>كورس متاح</div>
            </div>
            <div style={hero.statDivider} />
            <div style={hero.statItem}>
              <div style={hero.statNum}>{usersCount.toLocaleString()}+</div>
              <div style={hero.statLabel}>طالب مسجل</div>
            </div>
            <div style={hero.statDivider} />
            <div style={hero.statItem}>
              <div style={hero.statNum}>4.9 ⭐</div>
              <div style={hero.statLabel}>متوسط التقييم</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ FEATURES BAR ══ */}
      <div style={{ background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.2rem 2rem', display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: '🔒', text: 'فيديوهات محمية 100%' },
            { icon: '📱', text: 'متاح على كل الأجهزة' },
            { icon: '🎓', text: 'شهادات معتمدة' },
            { icon: '🚀', text: 'تحديثات مستمرة' },
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', fontWeight: 600, color: 'var(--text2)' }}>
              <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* ══ COURSES ══ */}
      <div className={`section reveal-section${coursesVisible ? " visible" : ""}`} ref={coursesRef}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="section-tag">⚡ المميزة</div>
            <div className="section-title">أحدث الكورسات</div>
            <div className="section-sub" style={{ margin: 0 }}>اختر من بين أفضل الكورسات المتاحة</div>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/courses')}>
            عرض الكل ←
          </button>
        </div>

        {loading ? (
          <div className="courses-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="shimmer" style={{ height: 180 }} />
                <div style={{ padding: '1rem' }}>
                  <div className="shimmer" style={{ height: 16, marginBottom: 8, borderRadius: 6 }} />
                  <div className="shimmer" style={{ height: 12, width: '60%', borderRadius: 6 }} />
                  <div className="shimmer" style={{ height: 10, width: '40%', marginTop: 8, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="courses-grid">
            {courses.map((c, i) => (
              <div key={c.id} className="animate-fade-up" style={{ animationDelay: `${i * 0.07}s` }}>
                <CourseCard course={c} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ CATEGORIES ══ */}
      <div ref={catsRef} style={{ background: 'var(--bg2)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div className="section-tag">📂 التصنيفات</div>
          <div className="section-title">استكشف حسب التخصص</div>
          <div className="cats-grid" style={{ marginTop: '2.5rem' }}>
            {cats.map((cat, i) => (
              <div key={cat.id} style={{ ...catCard, animationDelay: `${i * .05}s` }}
                onClick={() => navigate(`/courses?category=${cat.slug || cat.id}`)}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'rgba(79,140,255,.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = 'var(--border)'; }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '.6rem' }}>{cat.icon || '📂'}</div>
                <div style={{ fontWeight: 800, fontSize: '.9rem', marginBottom: '.25rem' }}>{cat.name}</div>
                {cat.courses_count > 0 && (
                  <div style={{ fontSize: '.72rem', color: 'var(--text3)', fontWeight: 600 }}>
                    {cat.courses_count} كورس
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ WHY US ══ */}
      <div className="section">
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="section-tag">💡 مميزاتنا</div>
          <div className="section-title">لماذا EduVerse؟</div>
          <p style={{ color: 'var(--text2)', maxWidth: 480, margin: '0 auto' }}>
            نوفر تجربة تعليمية احترافية مع أعلى معايير الأمان وجودة المحتوى
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1.5rem' }}>
          {[
            { icon: '🔐', title: 'محتوى آمن 100%', desc: 'فيديوهاتك محمية بتوقيع رقمي. لا يمكن تحميلها أو مشاركتها خارج المنصة', color: 'var(--accent)' },
            { icon: '👨‍🏫', title: 'مدربون خبراء', desc: 'كل مدرب يمر بمراجعة صارمة من الإدارة قبل النشر', color: 'var(--accent2)' },
            { icon: '📊', title: 'تتبع التقدم', desc: 'راقب تقدمك وأداءك في الكورسات والامتحانات بشكل تفصيلي', color: 'var(--accent3)' },
            { icon: '🔔', title: 'إشعارات فورية', desc: 'احصل على إشعارات فور إضافة فيديو جديد أو امتحان في كورساتك', color: 'var(--gold)' },
          ].map((item, i) => (
            <div key={i} style={featureCard}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1.25rem', border: `1px solid ${item.color}30` }}>
                {item.icon}
              </div>
              <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: '1.05rem', marginBottom: '.5rem' }}>{item.title}</div>
              <div style={{ color: 'var(--text2)', fontSize: '.85rem', lineHeight: 1.65 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ CTA ══ */}
      <div style={{ background: 'linear-gradient(135deg, rgba(79,140,255,.15) 0%, rgba(124,92,252,.15) 100%)', border: '1px solid rgba(79,140,255,.2)', margin: '0 2rem 5rem', borderRadius: 24, padding: '4rem 2rem', textAlign: 'center', maxWidth: 1280, marginLeft: 'auto', marginRight: 'auto' }}>
        <h2 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, marginBottom: '.75rem' }}>
          مستعد تبدأ رحلة التعلم؟ 🚀
        </h2>
        <p style={{ color: 'var(--text2)', marginBottom: '2rem', fontSize: '.95rem' }}>
          انضم لآلاف الطلاب وابدأ مجاناً اليوم
        </p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/login?tab=register')}
          style={{ padding: '1rem 3rem', fontSize: '1.05rem' }}>
          ابدأ رحلتك الآن ✨
        </button>
      </div>
    </div>
  )
}

const hero = {
  wrap: {
    minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden', paddingTop: 64,
  },
  content: { position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 720, padding: '0 2rem' },
  orb1: { position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'var(--accent)', filter: 'blur(90px)', opacity: 0.09, top: '-10%', right: '-10%', animation: 'float 10s ease-in-out infinite' },
  orb2: { position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'var(--accent2)', filter: 'blur(90px)', opacity: 0.09, bottom: '-10%', left: '-10%', animation: 'float 12s ease-in-out infinite reverse' },
  orb3: { position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'var(--accent3)', filter: 'blur(90px)', opacity: 0.06, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(79,140,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,140,255,.03) 1px, transparent 1px)',
    backgroundSize: '60px 60px',
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: '.5rem',
    background: 'rgba(79,140,255,.1)', border: '1px solid rgba(79,140,255,.25)',
    borderRadius: 50, padding: '.4rem 1.2rem', fontSize: '.82rem', color: 'var(--accent)',
    fontWeight: 700, marginBottom: '1.75rem',
  },
  h1: { fontFamily: "'Tajawal',sans-serif", fontSize: 'clamp(2.4rem,6vw,4rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '1.5rem' },
  h1Grad: { background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  p: { color: 'var(--text2)', fontSize: '1.05rem', lineHeight: 1.75, marginBottom: '2.5rem' },
  statsRow: { display: 'flex', gap: '2.5rem', marginTop: '3rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' },
  statItem: { textAlign: 'center' },
  statNum: { fontSize: '2rem', fontWeight: 900, background: 'var(--grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 },
  statLabel: { fontSize: '.78rem', color: 'var(--text3)', marginTop: '.25rem', fontWeight: 600 },
  statDivider: { width: 1, height: 40, background: 'var(--border2)' },
}

const catCard = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
  padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all .25s',
  animation: 'fadeUp .5s ease both',
}

const featureCard = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20,
  padding: '1.75rem', transition: 'transform .25s',
}
