import React, { useState } from 'react'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function CreateStore(){
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const navigate = useNavigate()

  async function submit(e: React.FormEvent){
    e.preventDefault()
    try{
      const res = await api.post('/stores/', { name, description })
      navigate(`/stores/${res.data.id}/manage`)
    }catch(err){
      console.error(err)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Create Store</h1>
      <form onSubmit={submit} className="space-y-3">
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Store name" className="w-full p-2 border rounded" />
        <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" className="w-full p-2 border rounded" />
        <button className="w-full bg-blue-600 text-white p-2 rounded">Create</button>
      </form>
    </div>
  )
}
