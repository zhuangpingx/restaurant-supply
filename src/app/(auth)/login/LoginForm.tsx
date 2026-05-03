'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPassword } from '@/lib/actions/auth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email.trim()) { toast.error('请输入邮箱'); return }
    if (!password) { toast.error('请输入密码'); return }

    setLoading(true)
    try {
      const result = await signInWithPassword(email.trim(), password)
      if (result.error) { toast.error(result.error); return }
      toast.success('登录成功')
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 邮箱 */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">邮箱</label>
        <input
          type="email"
          inputMode="email"
          placeholder="请输入邮箱"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          autoFocus
          className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-gray-900 transition-colors placeholder:text-gray-300"
        />
      </div>

      {/* 密码 */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">密码</label>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-gray-900 transition-colors">
          <input
            type={showPwd ? 'text' : 'password'}
            placeholder="请输入密码"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="flex-1 px-4 py-3.5 text-sm outline-none bg-white placeholder:text-gray-300"
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="px-3 text-gray-300 hover:text-gray-500"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 登录按钮 */}
      <button
        onClick={handleLogin}
        disabled={loading || !email || !password}
        className={cn(
          'w-full py-3.5 rounded-xl text-sm font-semibold transition-all mt-2',
          'bg-gray-900 text-white',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'active:scale-[0.98]'
        )}
      >
        {loading
          ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />登录中...</span>
          : '登录'
        }
      </button>

      {/* 测试账号提示 */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
        <p className="text-xs font-medium text-gray-400">测试账号</p>
        {[
          ['boss@test.com', '老板'],
          ['manager@test.com', '店长'],
          ['supplier@test.com', '供应商'],
          ['finance@test.com', '财务'],
          ['receiver@test.com', '收货员'],
        ].map(([e, role]) => (
          <button
            key={e}
            onClick={() => { setEmail(e); setPassword('test123456') }}
            className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100 active:bg-gray-50 transition-colors"
          >
            <span className="text-xs text-gray-600">{e}</span>
            <span className="text-xs text-gray-400">{role}</span>
          </button>
        ))}
        <p className="text-xs text-gray-300 text-center pt-0.5">密码统一：test123456</p>
      </div>
    </div>
  )
}
