import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { auth as authApi } from '../../api/client'
import { Spinner, Field, FormActions, toast } from '../../components/ui'
import type { Branch } from '../../types'

export function ManagerProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [pw, setPw] = useState({current:'',next:'',confirm:''})
  const [saving, setSaving] = useState(false)
  async function changePass(){
    if(!pw.current||!pw.next){toast('All fields required','error');return}
    if(pw.next!==pw.confirm){toast('Passwords do not match','error');return}
    if(pw.next.length<8){toast('Min 8 characters','error');return}
    setSaving(true);try{await authApi.changePassword(pw.current,pw.next);toast('Password updated!','success');setPw({current:'',next:'',confirm:''})}catch(e:unknown){toast(e instanceof Error?e.message:'Failed','error')}finally{setSaving(false)}
  }
  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="page-title">👤 My Profile</h1>
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber to-orange-600 flex items-center justify-center text-xl font-bold text-black">{user?.name[0].toUpperCase()}</div><div><div className="font-semibold">{user?.name}</div><div className="text-sm text-gray-400">{user?.email}</div></div></div>
        <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-border">
          <div><div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Role</div><div className="capitalize">{user?.role}</div></div>
          <div><div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Branch</div><div>{user?.branch&&typeof user.branch==='object'?(user.branch as Branch).name:'—'}</div></div>
        </div>
      </div>
      <div className="card p-5 space-y-3">
        <div className="card-title">Change Password</div>
        {[['current','Current Password'],['next','New Password'],['confirm','Confirm Password']].map(([f,l])=>(
          <div key={f}><label className="form-label">{l}</label><input className="input" type="password" placeholder="••••••••" value={pw[f as keyof typeof pw]} onChange={e=>setPw(p=>({...p,[f]:e.target.value}))} /></div>
        ))}
        <button className="btn-primary w-full" onClick={changePass} disabled={saving}>{saving?'Saving...':'Update Password'}</button>
      </div>
      <button className="btn-danger w-full" onClick={async()=>{await logout();navigate('/login')}}>🚪 Logout</button>
    </div>
  )
}