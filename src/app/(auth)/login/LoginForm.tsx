'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/actions/auth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const QUICK_ACCOUNTS = [
  { email: 'boss@test.com', password: 'test123456', label: '👔 老板', desc: 'boss' },
  { email: 'manager@test.com', password: 'test123456', label: '📋 采购经理', desc: 'manager' },
  { email: 'staff@test.com', password: 'test123456', label: '👤 店员', desc: 'staff' },
  { email: 'viewer@test.com', password: 'test123456', label: '👁 观察员', desc: 'viewer' },
]

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('请输入邮箱和密码'); return }
    setLoading(true)
    try {
      const result = await signIn(email, password)
      if (result.error) { toast.error(result.error); return }
      toast.success('登录成功')
      router.push('/dashboard')
      router.refresh()
    } finally { setLoading(false) }
  }

  function handleQuickFill(account: typeof QUICK_ACCOUNTS[0]) {
    setEmail(account.email)
    setPassword(account.password)
    toast.success('已填入: ' + account.label, { icon: account.label.split(' ')[0] })
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">邮箱</label>
        <input
          type="email" placeholder="请输入邮箱"
          value={email} onChange={e => setEmail(e.target.value)}
          autoFocus
          className="w-full px-3.5 py-3 text-sm rounded-xl border border-gray-200 outline-none bg-white placeholder:text-gray-300 focus:border-gray-900 transition-colors"
        />
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">密码</label>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'} placeholder="请输入密码"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-3.5 py-3 pr-10 text-sm rounded-xl border border-gray-200 outline-none bg-white placeholder:text-gray-300 focus:border-gray-900 transition-colors"
          />
          <button
            type="button" onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Login Button */}
      <button type="submit" disabled={loading || !email || !password}
        className={cn(
          'w-full py-3.5 rounded-xl text-sm font-medium transition-all',
          'bg-gray-900 text-white',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'active:scale-[0.98]'
        )}>
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />登录中...
          </span>
        ) : '登 录'}
      </button>

      {/* Quick Fill Buttons */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center mb-3">一键填入测试账号</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACCOUNTS.map((acct) => (
            <button
              key={acct.email}
              type="button"
              onClick={() => handleQuickFill(acct)}
              className={cn(
                'px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all',
                'border border-gray-200 hover:border-gray-400 hover:bg-gray-50 active:scale-[0.97]',
                email === acct.email && 'border-gray-900 bg-gray-50'
              )}
            >
              <div className="font-medium text-gray-800">{acct.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{acct.email}</div>
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}
