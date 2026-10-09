import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function DeliveryDashboard() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [agent, setAgent] = useState<any>({})
  const [passwords, setPasswords] = useState({ current: '', next: '' })

  const load = async () => {
    try { setRows((await api.get('/delivery/orders/')).data) }
    catch { navigate('/login', { replace: true }) }
  }

  useEffect(() => {
    if (auth.loading) return
    if (auth.user?.role !== 'DELIVERY_AGENT') return navigate('/login', { replace: true })
    setAgent(auth.user.delivery_agent || {})
    void load()
  }, [auth.loading, auth.user?.role])

  async function changePassword(event: any) {
    event.preventDefault()
    try {
      await api.post('/delivery/change-password/', { current_password: passwords.current, new_password: passwords.next })
      setAgent((current: any) => ({ ...current, must_change_password: false }))
      setMessage('✅ Password changed successfully.')
    } catch (error: any) { setMessage(error.response?.data?.detail || 'Password change failed.') }
  }

  async function move(orderId: number, status: string) {
    const failure_reason = status === 'FAILED' ? (prompt('Failure reason:') || '') : ''
    try { await api.patch(`/delivery/orders/${orderId}/status/`, { status, failure_reason }); await load() }
    catch (error: any) { setMessage(error.response?.data?.detail || 'Update failed.') }
  }

  async function deliver(row: any) {
    try {
      await api.post(`/delivery/orders/${row.order.id}/delivery-otp/`)
      const otp = prompt('Customer se 6-digit OTP lein:')
      if (!otp) return
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'
      input.onchange = async () => {
        if (!input.files?.[0]) return
        const form = new FormData(); form.append('otp', otp); form.append('delivery_proof', input.files[0])
        try { await api.patch(`/delivery/orders/${row.order.id}/delivery-otp/`, form); await load() }
        catch (error: any) { setMessage(error.response?.data?.detail || 'Delivery verification failed.') }
      }
      input.click()
    } catch (error: any) { setMessage(error.response?.data?.detail || 'OTP send failed.') }
  }

  if (auth.loading) return <div className="min-h-screen grid place-items-center">Checking account…</div>
  if (agent.must_change_password) return <main className="min-h-screen bg-slate-950 grid place-items-center p-4"><form onSubmit={changePassword} className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4"><h1 className="text-xl font-black">Create your private password</h1><p className="text-sm text-slate-500">Temporary password first login par change karna mandatory hai.</p>{message&&<p className="text-rose-600">{message}</p>}<input required type="password" className="w-full border rounded-xl p-3" placeholder="Temporary password" value={passwords.current} onChange={e=>setPasswords({...passwords,current:e.target.value})}/><input required minLength={8} type="password" className="w-full border rounded-xl p-3" placeholder="New password (8+ characters)" value={passwords.next} onChange={e=>setPasswords({...passwords,next:e.target.value})}/><button className="w-full bg-emerald-600 text-white rounded-xl p-3 font-bold">Change password & continue</button></form></main>

  return <main className="min-h-screen bg-slate-100 p-4"><div className="mx-auto max-w-3xl space-y-4"><header className="bg-slate-950 text-white rounded-2xl p-4 flex justify-between"><div><h1 className="font-black text-xl">My Deliveries</h1><p className="text-xs text-slate-400">{agent.full_name} · Assigned orders only</p></div><button onClick={()=>{auth.logout();navigate('/login')}}>Logout</button></header>{message&&<p className="bg-rose-50 text-rose-700 p-3 rounded-xl">{message}</p>}{rows.length===0&&<div className="bg-white rounded-2xl p-8 text-center">No assigned orders.</div>}{rows.map(row=><article key={row.assignment_id} className="bg-white rounded-2xl border p-4 space-y-3"><div className="flex justify-between"><b>#{row.order.reference}</b><span>{row.assignment_status.replaceAll('_',' ')}</span></div><div>{row.order.customer_name} · {row.order.customer_phone}<br/><span className="text-sm text-slate-600">{row.order.delivery_address}</span></div><div className="font-bold">COD ₹{row.order.total}</div>{row.seller_instruction&&<p className="bg-amber-50 p-2 rounded">Seller: {row.seller_instruction}</p>}<div className="flex flex-wrap gap-2">{row.assignment_status==='ASSIGNED'&&<button onClick={()=>move(row.order.id,'ACCEPTED')} className="bg-indigo-600 text-white px-4 py-2 rounded">Accept</button>}{row.assignment_status==='ACCEPTED'&&<button onClick={()=>move(row.order.id,'PICKED_UP')} className="bg-indigo-600 text-white px-4 py-2 rounded">Picked up</button>}{row.assignment_status==='PICKED_UP'&&<button onClick={()=>move(row.order.id,'OUT_FOR_DELIVERY')} className="bg-indigo-600 text-white px-4 py-2 rounded">Out for delivery</button>}{row.assignment_status==='OUT_FOR_DELIVERY'&&<button onClick={()=>deliver(row)} className="bg-emerald-600 text-white px-4 py-2 rounded">OTP + Proof → Delivered</button>}{['ACCEPTED','PICKED_UP','OUT_FOR_DELIVERY'].includes(row.assignment_status)&&<button onClick={()=>move(row.order.id,'FAILED')} className="border border-rose-300 text-rose-600 px-4 py-2 rounded">Report failed</button>}</div></article>)}</div></main>
}
