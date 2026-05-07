'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import crypto from 'crypto'

// ─── 阿里云短信发送 ───────────────────────────────────────────
async function sendAliyunSms(phone: string, code: string): Promise<{ error?: string }> {
  const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID!
  const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET!
  const signName = process.env.ALIYUN_SMS_SIGN_NAME!
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE!

  const params: Record<string, string> = {
    AccessKeyId: accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: phone,
    RegionId: 'cn-hangzhou',
    SignName: signName,
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: Math.random().toString(36).slice(2),
    SignatureVersion: '1.0',
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    Version: '2017-05-25',
  }

  // 构造签名
  const sortedKeys = Object.keys(params).sort()
  const canonicalQueryString = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')

  const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(canonicalQueryString)}`
  const hmac = crypto.createHmac('sha1', `${accessKeySecret}&`)
  const signature = hmac.update(stringToSign).digest('base64')

  const url = `https://dysmsapi.aliyuncs.com/?${canonicalQueryString}&Signature=${encodeURIComponent(signature)}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.Code !== 'OK') {
      console.error('阿里云短信错误:', data)
      return { error: `短信发送失败：${data.Message}` }
    }
    return {}
  } catch (e) {
    console.error('短信请求错误:', e)
    return { error: '短信服务暂时不可用，请重试' }
  }
}

// ─── 生成6位验证码 ─────────────────────────────────────────────
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// ─── 发送OTP ──────────────────────────────────────────────────
export async function sendOtp(phone: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // 生成验证码
  const code = generateCode()

  // 用 Supabase 手机号OTP（会自动管理验证码）
  const { error } = await supabase.auth.signInWithOtp({
    phone: `+86${phone}`,
    options: { shouldCreateUser: true },
  })

  if (error) {
    // Supabase OTP 失败时用阿里云直接发
    console.error('Supabase OTP error, fallback to Aliyun:', error)
  }

  // 同时用阿里云发短信（更可靠）
  const smsResult = await sendAliyunSms(phone, code)
  if (smsResult.error) return smsResult

  // 把验证码存到数据库临时表供验证
  await supabase.from('otp_codes').upsert({
    phone,
    code,
    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    used: false,
  })

  return {}
}

// ─── 验证OTP ──────────────────────────────────────────────────
export async function verifyOtp(phone: string, token: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // 先验证自定义验证码
  const { data: otpRecord } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('phone', phone)
    .eq('code', token)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!otpRecord) {
    // fallback: 用 Supabase 自带验证
    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+86${phone}`,
      token,
      type: 'sms',
    })
    if (error) return { error: '验证码错误或已过期' }
    if (!data.user) return { error: '登录异常，请重试' }
    return await checkUserProfile(supabase, data.user.id, phone)
  }

  // 标记验证码已使用
  await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id)

  // 用手机号登录（找或创建用户）
  const email = `${phone}@supply.com`

  // 尝试用邮箱密码登录
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: phone, // 用手机号作为密码
  })

  if (signInError) {
    // 用户不存在，创建新用户
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: phone,
      phone: `+86${phone}`,
    })
    if (signUpError || !signUpData.user) return { error: '登录失败，请重试' }
    return await checkUserProfile(supabase, signUpData.user.id, phone)
  }

  if (!signInData.user) return { error: '登录异常，请重试' }
  return await checkUserProfile(supabase, signInData.user.id, phone)
}

// ─── 检查用户档案 ─────────────────────────────────────────────
async function checkUserProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  phone: string
): Promise<{ error?: string }> {
  const { data: profile } = await supabase
    .from('users')
    .select('id, is_active')
    .eq('id', userId)
    .single()

  if (!profile) {
    // 检查是否有预注册记录（老板提前添加的）
    const { data: preReg } = await supabase
      .from('users')
      .select('id, is_active')
      .eq('phone', phone)
      .single()

    if (!preReg) {
      await supabase.auth.signOut()
      return { error: '账号未开通，请联系管理员添加' }
    }

    // 更新 auth user id
    await supabase.from('users').update({ id: userId }).eq('phone', phone)
    return {}
  }

  if (!profile.is_active) {
    await supabase.auth.signOut()
    return { error: '账号已被禁用，请联系管理员' }
  }

  return {}
}

// ─── 退出登录 ─────────────────────────────────────────────────
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  return profile
}

// 兼容旧版
export async function signInWithPassword(email: string, password: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: '邮箱或密码错误' }
  if (!data.user) return { error: '登录异常' }
  const { data: profile } = await supabase.from('users').select('id, is_active').eq('id', data.user.id).single()
  if (!profile) { await supabase.auth.signOut(); return { error: '账号未开通' } }
  if (!profile.is_active) { await supabase.auth.signOut(); return { error: '账号已禁用' } }
  return {}
}
