import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login({ showToast }) {
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]   = useState('')
  const [pass,  setPass]    = useState('')
  const [showPass, setShowPass] = useState(false)

  const [fname, setFname]     = useState('')
  const [lname, setLname]     = useState('')
  const [username, setUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass,  setRegPass]  = useState('')
  const [regPass2, setRegPass2] = useState('')
  const [showRegPass, setShowRegPass] = useState(false)

  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent,  setForgotSent]  = useState(false)
  const [regDone,     setRegDone]     = useState(false)

  const passStrength = getPassStrength(regPass)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email || !pass) { showToast('يرجى ملء جميع الحقول', 'error'); return }
    setLoading(true)
    try {
      const loginData = await login(email, pass)
      showToast('أهلاً بك! 🎉', 'success')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'بيانات غير صحيحة'
      showToast(msg, 'error')
    } finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (!regEmail || !regPass || !username || !fname) { showToast('يرجى ملء جميع الحقول المطلوبة', 'error'); return }
    if (regPass.length < 8) { showToast('كلمة المرور 8 أحرف على الأقل', 'error'); return }
    if (regPass !== regPass2) { showToast('كلمتا المرور غير متطابقتين', 'error'); return }
    setLoading(true)
    try {
      await register({ first_name: fname, last_name: lname, username, email: regEmail, password: regPass, password2: regPass2, role: 'student' })
      showToast('تم إنشاء حسابك! تحقق من بريدك لتأكيد الحساب 📧', 'success')
      setRegDone(true)
    } catch (err) {
      const data = err.response?.data || {}
      const errs = Object.values(data).flat().join('. ')
      showToast(errs || 'حدث خطأ في التسجيل', 'error')
    } finally { setLoading(false) }
  }

  async function handleForgot() {
    if (!forgotEmail) { showToast('أدخل بريدك الإلكتروني', 'error'); return }
    setLoading(true)
    try {
      const { authAPI } = await import('../api/index.js')
      await authAPI.resetPasswordRequest({ email: forgotEmail })
      setForgotSent(true)
      showToast('تم إرسال رابط الاستعادة ✅', 'success')
    } catch { showToast('البريد الإلكتروني غير مسجل', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div style={S.wrap}>
      <div style={S.bgOrb1} /><div style={S.bgOrb2} />
      <div style={S.card}>
        <div style={S.cardTop} />

        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontFamily:"'Tajawal',sans-serif", fontSize:'2rem', fontWeight:900, background:'var(--grad)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>✦ EduVerse</div>
          <div style={{ fontSize:'.8rem', color:'var(--text3)', marginTop:'.25rem' }}>منصة التعلم الاحترافية</div>
        </div>

        {tab !== 'forgot' && (
          <div style={S.tabs}>
            <button style={{ ...S.tab, ...(tab==='login' ? S.tabActive : {}) }} onClick={() => setTab('login')}>تسجيل الدخول</button>
            <button style={{ ...S.tab, ...(tab==='register' ? S.tabActive : {}) }} onClick={() => setTab('register')}>حساب جديد</button>
          </div>
        )}

        {/* LOGIN */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} style={{ animation:'fadeUp .3s ease' }}>
            <h2 style={S.title}>أهلاً بعودتك 👋</h2>
            <p style={S.sub}>سجل دخولك وواصل رحلة التعلم</p>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input className="form-input" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <div style={{ position:'relative' }}>
                <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} style={{ paddingLeft:'2.8rem' }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position:'absolute', left:'.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'1rem' }}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div style={{ textAlign:'left', marginBottom:'1.25rem' }}>
              <span style={{ fontSize:'.82rem', color:'var(--accent)', cursor:'pointer', fontWeight:600 }} onClick={() => setTab('forgot')}>نسيت كلمة المرور؟</span>
            </div>
            <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
              {loading ? <><span className="spinner spinner-sm" /> جاري الدخول...</> : 'تسجيل الدخول →'}
            </button>
            <div style={{ marginTop:'1.5rem', padding:'.75rem 1rem', background:'rgba(79,140,255,.06)', borderRadius:10, border:'1px solid rgba(79,140,255,.15)', textAlign:'center' }}>
              <p style={{ fontSize:'.78rem', color:'var(--text2)' }}>🎓 هل أنت مدرب؟ تواصل مع الإدارة لإنشاء حسابك</p>
            </div>
          </form>
        )}

        {/* REGISTER */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} style={{ animation:'fadeUp .3s ease' }}>
            <h2 style={S.title}>انضم إلينا ✨</h2>
            <p style={S.sub}>أنشئ حسابك وابدأ رحلة التعلم الآن</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">الاسم الأول *</label>
                <input className="form-input" placeholder="محمد" value={fname} onChange={e => setFname(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">الاسم الأخير</label>
                <input className="form-input" placeholder="أحمد" value={lname} onChange={e => setLname(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">اسم المستخدم *</label>
              <input className="form-input" placeholder="mohamed_ahmed" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g,'_'))} />
            </div>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني *</label>
              <input className="form-input" type="email" placeholder="email@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">كلمة المرور *</label>
              <div style={{ position:'relative' }}>
                <input className="form-input" type={showRegPass ? 'text' : 'password'} placeholder="8 أحرف على الأقل" value={regPass} onChange={e => setRegPass(e.target.value)} style={{ paddingLeft:'2.8rem' }} />
                <button type="button" onClick={() => setShowRegPass(s => !s)} style={{ position:'absolute', left:'.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'1rem' }}>
                  {showRegPass ? '🙈' : '👁️'}
                </button>
              </div>
              {regPass && (
                <div style={{ marginTop:'.5rem' }}>
                  <div style={{ display:'flex', gap:'.3rem', marginBottom:'.3rem' }}>
                    {[1,2,3,4].map(i => <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= passStrength.score ? passStrength.color : 'var(--bg3)', transition:'all .3s' }} />)}
                  </div>
                  <span style={{ fontSize:'.73rem', color: passStrength.color }}>{passStrength.label}</span>
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">تأكيد كلمة المرور *</label>
              <input className="form-input" type="password" placeholder="أعد كتابة كلمة المرور" value={regPass2} onChange={e => setRegPass2(e.target.value)} style={{ borderColor: regPass2 && regPass !== regPass2 ? 'var(--red)' : undefined }} />
              {regPass2 && regPass !== regPass2 && <span className="form-error">كلمتا المرور غير متطابقتين</span>}
            </div>
            <div style={{ padding:'.7rem 1rem', background:'rgba(0,212,170,.06)', borderRadius:10, border:'1px solid rgba(0,212,170,.15)', marginBottom:'1.25rem' }}>
              <p style={{ fontSize:'.78rem', color:'var(--accent3)' }}>✅ التسجيل متاح للطلاب فقط. ستصلك رسالة تأكيد على بريدك الإلكتروني</p>
            </div>
            <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
              {loading ? <><span className="spinner spinner-sm" /> جاري الإنشاء...</> : 'إنشاء الحساب ✨'}
            </button>
          </form>
        )}

        {/* FORGOT */}
        {tab === 'forgot' && (
          <div style={{ animation:'fadeUp .3s ease' }}>
            <button style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', marginBottom:'1rem', fontSize:'.85rem' }} onClick={() => setTab('login')}>← العودة لتسجيل الدخول</button>
            <h2 style={S.title}>استعادة كلمة المرور 🔑</h2>
            <p style={S.sub}>أدخل بريدك وسنرسل لك رابط الاستعادة</p>
            {forgotSent ? (
              <div style={{ textAlign:'center', padding:'2rem 0' }}>
                <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📧</div>
                <h3 style={{ marginBottom:'.5rem', fontFamily:"'Tajawal',sans-serif" }}>تم الإرسال!</h3>
                <p style={{ color:'var(--text2)', fontSize:'.88rem' }}>تحقق من بريدك الإلكتروني</p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني</label>
                  <input className="form-input" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="email@example.com" />
                </div>
                <button className="btn btn-primary btn-lg btn-full" onClick={handleForgot} disabled={loading}>إرسال رابط الاستعادة</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getPassStrength(pass) {
  if (!pass) return { score: 0, label: '', color: '' }
  let score = 0
  if (pass.length >= 8)  score++
  if (pass.length >= 12) score++
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++
  if (/[0-9]/.test(pass)) score++
  score = Math.min(score, 4)
  const levels = [
    { score:1, label:'ضعيف جداً',  color:'var(--red)'    },
    { score:2, label:'ضعيف',        color:'var(--orange)' },
    { score:3, label:'متوسط',       color:'var(--gold)'   },
    { score:4, label:'قوي جداً ✓',  color:'var(--accent3)'},
  ]
  return levels[score - 1] || { score, label:'', color:'' }
}

const S = {
  wrap:     { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', paddingTop:80, position:'relative', overflow:'hidden' },
  bgOrb1:   { position:'fixed', top:'10%', right:'10%', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle,rgba(79,140,255,.08) 0%,transparent 70%)', pointerEvents:'none', zIndex:0 },
  bgOrb2:   { position:'fixed', bottom:'10%', left:'10%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(124,92,252,.08) 0%,transparent 70%)', pointerEvents:'none', zIndex:0 },
  card:     { background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:24, padding:'2.5rem', width:'100%', maxWidth:460, position:'relative', overflow:'hidden', zIndex:1, boxShadow:'0 24px 64px rgba(0,0,0,.35)' },
  cardTop:  { position:'absolute', top:0, left:0, right:0, height:3, background:'var(--grad)', borderRadius:'24px 24px 0 0' },
  tabs:     { display:'flex', gap:'.35rem', background:'var(--bg2)', borderRadius:12, padding:'4px', marginBottom:'1.75rem' },
  tab:      { flex:1, padding:'.58rem', border:'none', background:'transparent', color:'var(--text2)', borderRadius:9, cursor:'pointer', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:'.86rem', transition:'all .2s' },
  tabActive:{ background:'var(--surface2)', color:'var(--text)', boxShadow:'0 2px 8px rgba(0,0,0,.2)' },
  title:    { fontFamily:"'Tajawal',sans-serif", fontSize:'1.55rem', fontWeight:900, marginBottom:'.3rem' },
  sub:      { color:'var(--text2)', fontSize:'.85rem', marginBottom:'1.5rem', lineHeight:1.5 },
}
