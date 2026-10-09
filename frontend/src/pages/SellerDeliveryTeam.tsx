import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import SellerHeader from '../components/SellerHeader'
import SellerBottomNav from '../components/SellerBottomNav'
import { getCachedStore, setCachedStore } from '../utils/storeCache'

export default function SellerDeliveryTeam() {
  const { storeId } = useParams(); const [store,setStore]=useState<any>(()=>getCachedStore(storeId)); const [agents,setAgents]=useState<any[]>([]); const [credentials,setCredentials]=useState<any>(null)
  const [form,setForm]=useState({full_name:'',email:'',phone_number:'',vehicle_type:'Bike',vehicle_number:'',serviceable_pincodes:''}); const [message,setMessage]=useState('')
  const load=async()=>{try{const [storeResponse,agentsResponse]=await Promise.all([api.get(`/stores/${storeId}/`),api.get(`/seller/stores/${storeId}/delivery-agents/`)]);setStore(storeResponse.data);setCachedStore(storeResponse.data);setAgents(Array.isArray(agentsResponse.data)?agentsResponse.data:[])}catch(e:any){setMessage(e.response?.data?.detail||'Team could not be loaded.')}}
  useEffect(()=>{ void load() },[storeId])
  async function add(e:any){e.preventDefault();setMessage('');try{const r=await api.post(`/seller/stores/${storeId}/delivery-agents/`,{...form,serviceable_pincodes:form.serviceable_pincodes.split(',').map(x=>x.trim()).filter(Boolean)});setCredentials(r.data);setForm({full_name:'',email:'',phone_number:'',vehicle_type:'Bike',vehicle_number:'',serviceable_pincodes:''});load()}catch(e:any){setMessage(e.response?.data?.detail||'Agent could not be added.')}}
  async function toggle(a:any){await api.patch(`/seller/stores/${storeId}/delivery-agents/${a.id}/`,{is_active:!a.is_active});load()}
  async function reset(a:any){if(!confirm(`Reset password for ${a.full_name}?`))return;const r=await api.post(`/seller/stores/${storeId}/delivery-agents/${a.id}/`);setCredentials(r.data)}
  if(!store)return <div className="p-8">Open this page from your store dashboard.</div>
  return <div className="min-h-screen bg-slate-50 pb-24"><SellerHeader store={store} activeTabTitle="Delivery Team" />
    <main className="mx-auto max-w-5xl p-4 space-y-4">
      <div className="flex justify-between"><Link to={`/stores/${storeId}/orders`} className="text-indigo-600 font-bold">← Orders</Link><Link to="/login" className="text-emerald-700 font-bold">Agent email login →</Link></div>
      {message&&<div className="rounded-xl bg-rose-50 p-3 text-rose-700">{message}</div>}
      {credentials&&<div className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><b>One-time credentials — abhi safely share/copy karein</b><div className="mt-2 font-mono">Email: {credentials.email}<br/>Temporary Password: {credentials.temporary_password}</div><p className="text-xs mt-2">Existing Email Login tab par use karein. Password dobara show nahi hoga.</p></div>}
      <form onSubmit={add} className="rounded-2xl bg-white border p-4 grid gap-3 md:grid-cols-2"><h2 className="font-black md:col-span-2">Add delivery person</h2>
        <input required className="border rounded-xl p-3" placeholder="Full name" value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/><input required type="email" className="border rounded-xl p-3" placeholder="Login email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/><input required pattern="[0-9]{10}" className="border rounded-xl p-3" placeholder="10-digit mobile" value={form.phone_number} onChange={e=>setForm({...form,phone_number:e.target.value.replace(/\D/g,'').slice(0,10)})}/>
        <input className="border rounded-xl p-3" placeholder="Vehicle type" value={form.vehicle_type} onChange={e=>setForm({...form,vehicle_type:e.target.value})}/><input className="border rounded-xl p-3" placeholder="Vehicle number" value={form.vehicle_number} onChange={e=>setForm({...form,vehicle_number:e.target.value})}/>
        <input className="border rounded-xl p-3" placeholder="Service pincodes, comma separated" value={form.serviceable_pincodes} onChange={e=>setForm({...form,serviceable_pincodes:e.target.value})}/><button className="rounded-xl bg-indigo-600 text-white font-bold p-3 md:col-span-2">Create agent & credentials</button></form>
      <section className="rounded-2xl bg-white border p-4"><h2 className="font-black mb-3">Team ({agents.length})</h2><div className="space-y-3">{agents.map(a=><div key={a.id} className="border rounded-xl p-3 flex flex-wrap justify-between gap-3"><div><b>{a.full_name}</b> <span className={a.is_active?'text-emerald-600':'text-slate-400'}>{a.is_active?'Active':'Disabled'}</span><div className="text-sm text-slate-600">{a.email} · {a.phone_number} · {a.vehicle_type} {a.vehicle_number}</div></div><div className="flex gap-2"><button onClick={()=>reset(a)} className="border rounded-lg px-3">Reset password</button><button onClick={()=>toggle(a)} className="border rounded-lg px-3">{a.is_active?'Disable':'Enable'}</button></div></div>)}</div></section>
    </main><SellerBottomNav storeId={storeId!}/></div>
}
