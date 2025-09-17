import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

type Role = 'student'|'staff'|'admin'

export default function Login(){
	const [role,setRole] = useState<Role>('student')
	const [email,setEmail] = useState('student@campus.local')
	const [password,setPassword] = useState('student123')
	const [showPwd,setShowPwd] = useState(false)
	const [loading,setLoading] = useState(false)
	const nav = useNavigate()

	const roleCopy = useMemo(()=>({
		student: { heading: 'Hello, Student!', cta: 'Register', hint: 'New here? Create your student account.' },
		staff: { heading: 'Welcome, Staff!', cta: 'Request Access', hint: 'For faculty and staff members.' },
		admin: { heading: 'Hello, Administrator!', cta: 'Manage Access', hint: 'Restricted — admins only.' }
	}) as Record<Role,{heading:string;cta:string;hint:string}>,[])

	function handleRoleChange(next:Role){
		setRole(next)
		// Optional: smart defaults for demo/testing; users can overwrite
		if(next==='student'){ setEmail('student@campus.local'); setPassword('student123') }
		if(next==='staff'){ setEmail('staff@campus.local'); setPassword('staff123') }
		if(next==='admin'){ setEmail('admin@campus.local'); setPassword('admin123') }
	}

	async function onSubmit(e:React.FormEvent){
		e.preventDefault()
		setLoading(true)
		const body = new URLSearchParams({email,password})
		const res = await api('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body})
		setLoading(false)
		if(!res.ok){ alert('Login failed'); return }
		const data = await res.json()
		localStorage.setItem('token', data.access_token)
		localStorage.setItem('role', data.role)
		if(data.role==='admin') nav('/app/admin')
		else if(data.role==='staff') nav('/app/staff')
		else nav('/app/student')
	}



	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary-light to-secondary p-4">
			<div className="w-full max-w-6xl grid lg:grid-cols-2 bg-card rounded-3xl overflow-hidden shadow-2xl border border-secondary/20">
				{/* Left panel - Classroom Illustration */}
				<div className="relative p-8 lg:p-12 bg-gradient-to-br from-primary via-primary-muted to-dark overflow-hidden">
					{/* Classroom Scene */}
					<div className="relative z-10 h-full flex flex-col justify-center">
						{/* Classroom Illustration using CSS */}
						<div className="relative w-full h-80 mb-8 rounded-2xl bg-gradient-to-b from-orange-200 to-orange-300 overflow-hidden shadow-lg">
							{/* Floor */}
							<div className="absolute bottom-0 w-full h-20 bg-gradient-to-t from-orange-400 to-orange-300"></div>
							
							{/* Back Wall */}
							<div className="absolute top-0 w-full h-60 bg-gradient-to-b from-teal-400 to-teal-500"></div>
							
							{/* Blackboard */}
							<div className="absolute top-8 left-8 w-32 h-20 bg-slate-800 rounded-lg border-4 border-amber-600">
								<div className="p-2 text-white text-xs">
									<div className="w-full h-1 bg-white/30 mb-1"></div>
									<div className="w-3/4 h-1 bg-white/30 mb-1"></div>
									<div className="w-1/2 h-1 bg-white/30"></div>
								</div>
							</div>
							
							{/* Desk */}
							<div className="absolute bottom-16 left-12 w-24 h-12 bg-amber-700 rounded-t-lg">
								<div className="w-full h-2 bg-amber-600 rounded-t-lg"></div>
								<div className="absolute -bottom-8 left-2 w-2 h-8 bg-amber-800"></div>
								<div className="absolute -bottom-8 right-2 w-2 h-8 bg-amber-800"></div>
							</div>
							
							{/* Chair */}
							<div className="absolute bottom-12 right-16 w-8 h-16 bg-amber-600 rounded-lg">
								<div className="w-full h-8 bg-amber-700 rounded-t-lg"></div>
								<div className="absolute -bottom-4 left-1 w-1 h-4 bg-amber-800"></div>
								<div className="absolute -bottom-4 right-1 w-1 h-4 bg-amber-800"></div>
							</div>
							
							{/* Plant */}
							<div className="absolute bottom-16 right-8 w-6 h-12">
								<div className="absolute bottom-0 w-6 h-4 bg-red-600 rounded-full"></div>
								<div className="absolute bottom-2 left-1 w-4 h-8 bg-green-500 rounded-full"></div>
								<div className="absolute bottom-4 left-2 w-2 h-6 bg-green-600 rounded-full"></div>
							</div>
							
							{/* Window */}
							<div className="absolute top-4 right-4 w-20 h-24 bg-sky-200 rounded-lg border-4 border-amber-600">
								<div className="absolute top-1/2 left-0 w-full h-0.5 bg-amber-600"></div>
								<div className="absolute top-0 left-1/2 w-0.5 h-full bg-amber-600"></div>
								<div className="p-2">
									<div className="w-full h-8 bg-gradient-to-b from-sky-100 to-sky-200 rounded"></div>
								</div>
							</div>
							
							{/* Books on shelf */}
							<div className="absolute top-12 left-4 w-16 h-8 bg-amber-700 rounded">
								<div className="flex h-full">
									<div className="w-2 h-full bg-red-500"></div>
									<div className="w-2 h-full bg-blue-500"></div>
									<div className="w-2 h-full bg-green-500"></div>
									<div className="w-2 h-full bg-yellow-500"></div>
								</div>
							</div>
						</div>
						
						{/* Welcome Text */}
						<div className="text-white">
							<h2 className="text-3xl lg:text-4xl font-bold mb-4">{roleCopy[role].heading}</h2>
							<p className="text-white/90 text-lg mb-8 max-w-sm">{roleCopy[role].hint}</p>
						</div>
						
						{/* Role Selection */}
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
							<button onClick={()=>handleRoleChange('student')} className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${role==='student'?'bg-white text-primary shadow-lg':'bg-white/10 text-white border border-white/30 hover:bg-white/20'}`}>
								👨‍🎓 Student
							</button>
							<button onClick={()=>handleRoleChange('staff')} className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${role==='staff'?'bg-white text-primary shadow-lg':'bg-white/10 text-white border border-white/30 hover:bg-white/20'}`}>
								👨‍🏫 Staff
							</button>
							<button onClick={()=>handleRoleChange('admin')} className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${role==='admin'?'bg-white text-primary shadow-lg':'bg-white/10 text-white border border-white/30 hover:bg-white/20'}`}>
								👨‍💼 Admin
							</button>
						</div>
						
						{/* Sign up prompt */}
						<div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
							<span className="text-sm text-white/90">Don't have an account?</span>
							<button type="button" className="px-4 py-2 rounded-full bg-white text-primary text-sm font-medium hover:shadow-lg transition-all">
								{roleCopy[role].cta}
							</button>
						</div>
					</div>
				</div>

				{/* Right panel - Login Form */}
				<div className="p-8 lg:p-12 flex flex-col justify-center">
					<div className="max-w-sm mx-auto w-full">
						<h3 className="text-3xl font-bold text-dark mb-2">Login</h3>
						<p className="text-muted mb-8">Enter your account details</p>
						
						<form onSubmit={onSubmit} className="space-y-6">
							<div>
								<label className="block text-sm font-medium text-dark mb-2">Email</label>
								<input 
									className="input w-full" 
									placeholder="Enter your email" 
									value={email} 
									onChange={e=>setEmail(e.target.value)} 
									type="email"
								/>
							</div>
							
							<div>
								<label className="block text-sm font-medium text-dark mb-2">Password</label>
								<div className="relative">
									<input 
										className="input w-full pr-12" 
										type={showPwd ? 'text' : 'password'} 
										placeholder="Enter your password" 
										value={password} 
										onChange={e=>setPassword(e.target.value)} 
									/>
									<button 
										type="button" 
										onClick={()=>setShowPwd(s=>!s)} 
										className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted hover:text-primary transition-colors"
									>
										{showPwd ? '👁️' : '👁️‍🗨️'}
									</button>
								</div>
								
								<div className="flex items-center justify-between mt-3">
									<label className="flex items-center gap-2 text-sm text-muted">
										<input type="checkbox" className="accent-primary rounded" />
										Remember me
									</label>
									<a href="#" className="text-sm text-primary hover:underline font-medium">
										Forgot Password?
									</a>
								</div>
							</div>
							
							<button 
								type="submit"
								className="btn w-full py-3 text-lg font-semibold" 
								disabled={loading}
							>
								{loading ? 'Signing in...' : 'LOGIN'}
							</button>
						</form>
						
						<div className="mt-8 text-center">
							<p className="text-sm text-muted mb-4">Don't have an account? <a href="#" className="text-primary font-medium hover:underline">Sign up now</a></p>
							<p className="text-xs text-muted/70">
								Demo: admin@campus.local/admin123 • staff@campus.local/staff123 • student@campus.local/student123
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
