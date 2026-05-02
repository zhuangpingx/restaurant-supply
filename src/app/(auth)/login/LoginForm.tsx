'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, verifyOtp } from '@/lib/actions/auth'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

type Step = 'phone' | 'otp'

export default function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  async function handleSendOtp() {
    const cleaned = phone.replace(/\s/g, '')
    if (!/^1[3-9]\d{9}$/.test(cleaned)) { toast.error('请输入正确的手机号'); return }
    setLoading(true)
    try {
      const result = await sendOtp(cleaned)
      if (result.error) { toast.error(result.error); return }
      setStep('otp')
      setCountdown(60)
      toast.success('验证码已发送')
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } finally { setLoading(false) }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    if (digit && index < 5) otpRefs.current[index + 1]?.focus()
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) handleVerify(newOtp.join(''))
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) { setOtp(pasted.split('')); handleVerify(pasted) }
  }

  async function handleVerify(code: string) {
    setLoading(true)
    try {
      const result = await verifyOtp(phone.replace(/\s/g, ''), code)
      if (result.error) { toast.error(result.error); setOtp(['', '', '', '', '', '']); otpRefs.current[0]?.focus(); return }
      toast.success('登录成功')
      router.push('/dashboard')
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (countdown > 0) return
    setOtp(['', '', '', '', '', ''])
    await handleSendOtp()
  }

  return (
    <div className="space-y-6">
      {step === 'phone' ? (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">手机号</label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-gray-900 transition-colors">
              <span className="px-3 py-3.5 text-sm text-gray-500 bg-gray-50 border-r border-gray-200">+86</span>
              <input
                type="tel" inputMode="numeric" placeholder="请输入手机号"
                value={phone} onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                maxLength={11} autoFocus
                className="flex-1 px-3 py-3.5 text-sm outline-none bg-white placeholder:text-gray-300"
              />
            </div>
          </div>
          <button onClick={handleSendOtp} disabled={loading || phone.replace(/\s/g, '').length < 11}
            className={cn('w-full py-3.5 rounded-xl text-sm font-medium transition-all bg-gray-900 text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]')}>
            {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />发送中...</span> : '获取验证码'}
          </button>

          {/* 测试模式提示 */}
          <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-100">
            <p>测试模式：输入手机号 <span className="font-mono text-gray-600">13800138000</span></p>
            <p>验证码：<span className="font-mono text-gray-600">123456</span></p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">验证码</label>
              <span className="text-xs text-gray-400">已发送至 {phone.slice(0, 3)}****{phone.slice(7)}</span>
            </div>
            <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input key={index} ref={el => { otpRefs.current[index] = el }}
                  type="tel" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleOtpChange(index, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(index, e)}
                  disabled={loading}
                  className={cn('w-12 h-12 text-center text-lg font-semibold rounded-xl border transition-all outline-none',
                    digit ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white', 'focus:border-gray-900'
                  )}
                />
              ))}
            </div>
          </div>
          {loading && <div className="flex items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" />验证中...</div>}
          <div className="flex items-center justify-between text-sm">
            <button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']) }} className="text-gray-400 hover:text-gray-600">← 修改手机号</button>
            <button onClick={handleResend} disabled={countdown > 0}
              className={cn('font-medium transition-colors', countdown > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-900 active:opacity-70')}>
              {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
