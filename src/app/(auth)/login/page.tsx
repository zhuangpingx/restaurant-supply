import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 text-center">
            <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl font-bold">供</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">供应链协同系统</h1>
            <p className="text-sm text-gray-400 mt-1">餐饮连锁供应商管理平台</p>
          </div>
          <LoginForm />
        </div>
      </div>
      <div className="px-6 pb-10 text-center">
        <p className="text-xs text-gray-300">登录即代表同意服务条款和隐私政策</p>
      </div>
    </div>
  )
}
