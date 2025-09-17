import { useEffect, useRef, useState } from 'react'
import ChatBubble from '../components/ChatBubble'
import { api, parseJSON } from '../lib/api'

interface Message{ role:'user'|'bot'; text:string }
interface HistoryItem{ id:number; question:string; answer:string|null; status:string; created_at:string }

export default function Student(){
	const [messages,setMessages] = useState<Message[]>([])
	const [history,setHistory] = useState<HistoryItem[]>([])
	const [input,setInput] = useState('')
	const [typing,setTyping] = useState(false)
	// Container used to preserve scroll position
	const scrollRef = useRef<HTMLDivElement>(null)
	const endRef = useRef<HTMLDivElement>(null)
	const [faqs,setFaqs] = useState<Array<{id:number;question:string;answer:string;times_asked:number}>>([])
	const [faqErr,setFaqErr] = useState<string|null>(null)

	function buildMessages(items:HistoryItem[]):Message[]{
		const msgs:Message[] = []
		for(const it of items){
			msgs.push({role:'user', text: it.question})
			if(it.answer){ msgs.push({role:'bot', text: it.answer}) }
			else if(it.status==='pending_staff') { msgs.push({role:'bot', text: 'This query will be forwarded to staff.'}) }
		}
		return msgs
	}

	async function loadHistory(){
		try{
			const res = await api('/api/student/history')
			if(!res.ok) return
			// Save current scroll before state updates to prevent jump
			const prevScroll = scrollRef.current?.scrollTop ?? 0
			let items:HistoryItem[] = await parseJSON(res)
			items = [...items].reverse()
			setHistory(items)
			setMessages(buildMessages(items))
			// Restore scroll position on next frame
			requestAnimationFrame(()=>{
				if(scrollRef.current){ scrollRef.current.scrollTop = prevScroll }
			})
		}catch(e:any){
			console.error('history error', e?.message||e)
		}
	}

	// Auto-scroll disabled to prevent chat jumping
	useEffect(()=>{
		// Load once on mount; disable periodic polling to avoid auto-refresh/scrolling
		loadHistory()
	},[])

	async function loadFaqs(){
		try{
			// Use authenticated student-scoped endpoint to avoid 404s
			const res = await api('/api/student/faqs')
			if(!res.ok){ setFaqErr('Failed to load FAQs'); return }
			const data = await parseJSON(res)
			setFaqs(Array.isArray(data)?data:[])
		}catch(e:any){ setFaqErr(e?.message||'Error') }
	}

	useEffect(()=>{
		// Load FAQs once on mount; disable periodic polling to prevent scroll jumps
		loadFaqs()
	},[])

	async function send(){
		const q = input.trim(); if(!q) return
		setInput(''); setTyping(true)
		try{
			const res = await api('/api/student/ask',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({question:q})})
			await parseJSON(res)
			await loadHistory()
		} catch(e:any){
			setMessages(m=>[...m,{role:'bot', text: 'Server error. Please try again.'}])
			console.error('ask error', e?.message||e)
		} finally {
			setTyping(false)
		}
	}

	const staffAnswers = history.filter(h=>h.status==='answered_by_staff' && h.answer)

	return (
		<div className="flex h-[calc(100vh-120px)] bg-background dark:bg-dark rounded-3xl overflow-hidden shadow-xl border border-secondary/20 dark:border-secondary/30">
			{/* Sidebar */}
			<div className="w-80 bg-card dark:bg-dark/90 border-r border-secondary/20 dark:border-secondary/30 flex flex-col">
				{/* Sidebar Header */}
				<div className="p-6 border-b border-secondary/20 dark:border-secondary/30">
					<div className="flex items-center gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-muted flex items-center justify-center">
							<span className="text-white font-bold">💬</span>
						</div>
						<div>
							<h2 className="font-semibold text-dark dark:text-background">Campus Chat</h2>
							<p className="text-xs text-muted dark:text-secondary">AI Assistant</p>
						</div>
					</div>
					<button className="w-full btn bg-primary hover:bg-primary-muted text-white py-2 rounded-xl flex items-center justify-center gap-2">
						<span>✨</span>
						New Chat
					</button>
				</div>

				{/* Chat History */}
				<div className="flex-1 overflow-y-auto p-4">
					<h3 className="text-sm font-medium text-muted dark:text-secondary mb-3">Recent Conversations</h3>
					<div className="space-y-2">
						{history.slice(0, 10).map((item, i) => (
							<div key={item.id} className="p-3 rounded-xl hover:bg-secondary/10 dark:hover:bg-secondary/20 cursor-pointer transition-colors">
								<p className="text-sm text-dark dark:text-background truncate">{item.question}</p>
								<p className="text-xs text-muted dark:text-secondary mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
							</div>
						))}
					</div>
				</div>

				{/* Staff Replies Section */}
				<div className="p-4 border-t border-secondary/20 dark:border-secondary/30">
					<h3 className="text-sm font-medium text-dark dark:text-background mb-3">Staff Replies ({staffAnswers.length})</h3>
					<div className="space-y-2 max-h-40 overflow-y-auto">
						{staffAnswers.slice(0, 3).map(a => (
							<div key={a.id} className="p-3 rounded-xl bg-secondary/10 dark:bg-secondary/20 border border-secondary/20 dark:border-secondary/30">
								<p className="text-xs text-muted dark:text-secondary mb-1">#{a.id}</p>
								<p className="text-sm text-dark dark:text-background truncate">{a.question}</p>
								{a.answer && <p className="text-xs text-muted dark:text-secondary mt-1 truncate">{a.answer}</p>}
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Main Chat Area */}
			<div className="flex-1 flex flex-col">
				{/* Chat Header */}
				<div className="p-6 border-b border-secondary/20 dark:border-secondary/30 bg-card dark:bg-dark/90">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-muted flex items-center justify-center">
								<span className="text-white text-sm font-medium">AI</span>
							</div>
							<div>
								<h3 className="font-semibold text-dark dark:text-background">Campus Assistant</h3>
								<p className="text-xs text-muted dark:text-secondary">Online • Ready to help</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button className="w-8 h-8 rounded-full hover:bg-secondary/20 dark:hover:bg-secondary/30 flex items-center justify-center text-muted dark:text-secondary">
								📎
							</button>
							<button className="w-8 h-8 rounded-full hover:bg-secondary/20 dark:hover:bg-secondary/30 flex items-center justify-center text-muted dark:text-secondary">
								⚙️
							</button>
						</div>
					</div>
				</div>

				{/* Messages Area */}
				<div ref={scrollRef} className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-background to-secondary-light/30 dark:from-dark dark:to-dark/80">
					{messages.length === 0 && (
						<div className="flex flex-col items-center justify-center h-full text-center">
							{/* Animated Gradient Orb */}
							<div className="relative mb-8">
								<div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary via-secondary to-primary-muted animate-pulse shadow-2xl">
									<div className="absolute inset-2 rounded-full bg-gradient-to-tr from-secondary-light via-primary/50 to-secondary animate-spin" style={{animationDuration: '8s'}}></div>
									<div className="absolute inset-4 rounded-full bg-gradient-to-bl from-primary to-secondary-light animate-pulse" style={{animationDelay: '1s'}}></div>
									<div className="absolute inset-6 rounded-full bg-gradient-to-r from-secondary to-primary animate-ping" style={{animationDuration: '3s'}}></div>
								</div>
							</div>
							
							{/* Personalized Greeting */}
							<h2 className="text-2xl font-bold text-dark dark:text-background mb-2">Hi there, Student!</h2>
							<h3 className="text-xl font-semibold text-primary mb-6">How can I help you today?</h3>
							
							{/* Quick Action Cards */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-4xl">
								<div className="p-6 rounded-2xl bg-card dark:bg-dark/90 border border-secondary/20 dark:border-secondary/30 hover:border-primary/30 cursor-pointer transition-all hover:shadow-lg group">
									<div className="w-12 h-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
										<span className="text-2xl">📚</span>
									</div>
									<h4 className="font-semibold text-dark dark:text-background mb-2">Academic Information</h4>
									<p className="text-sm text-muted dark:text-secondary">Course details, schedules, and academic policies</p>
								</div>
								
								<div className="p-6 rounded-2xl bg-card dark:bg-dark/90 border border-secondary/20 dark:border-secondary/30 hover:border-primary/30 cursor-pointer transition-all hover:shadow-lg group">
									<div className="w-12 h-12 rounded-xl bg-secondary/20 dark:bg-secondary/30 flex items-center justify-center mb-4 group-hover:bg-secondary/30 dark:group-hover:bg-secondary/40 transition-colors">
										<span className="text-2xl">🏢</span>
									</div>
									<h4 className="font-semibold text-dark dark:text-background mb-2">Campus Services</h4>
									<p className="text-sm text-muted dark:text-secondary">Library, dining, housing, and facilities</p>
								</div>
								
								<div className="p-6 rounded-2xl bg-card dark:bg-dark/90 border border-secondary/20 dark:border-secondary/30 hover:border-primary/30 cursor-pointer transition-all hover:shadow-lg group">
									<div className="w-12 h-12 rounded-xl bg-primary-muted/10 dark:bg-primary-muted/20 flex items-center justify-center mb-4 group-hover:bg-primary-muted/20 dark:group-hover:bg-primary-muted/30 transition-colors">
										<span className="text-2xl">📋</span>
									</div>
									<h4 className="font-semibold text-dark dark:text-background mb-2">Administrative Help</h4>
									<p className="text-sm text-muted dark:text-secondary">Admissions, fees, documents, and procedures</p>
								</div>
							</div>
							
							{/* Category Tags */}
							<div className="flex flex-wrap gap-2 mb-6">
								<span className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium">General</span>
								<span className="px-4 py-2 rounded-full bg-secondary/20 dark:bg-secondary/30 text-dark dark:text-background text-sm hover:bg-secondary/30 dark:hover:bg-secondary/40 cursor-pointer transition-colors">Academics</span>
								<span className="px-4 py-2 rounded-full bg-secondary/20 dark:bg-secondary/30 text-dark dark:text-background text-sm hover:bg-secondary/30 dark:hover:bg-secondary/40 cursor-pointer transition-colors">Campus Life</span>
								<span className="px-4 py-2 rounded-full bg-secondary/20 dark:bg-secondary/30 text-dark dark:text-background text-sm hover:bg-secondary/30 dark:hover:bg-secondary/40 cursor-pointer transition-colors">Services</span>
								<span className="px-4 py-2 rounded-full bg-secondary/20 dark:bg-secondary/30 text-dark dark:text-background text-sm hover:bg-secondary/30 dark:hover:bg-secondary/40 cursor-pointer transition-colors">Support</span>
							</div>
							
							<p className="text-muted dark:text-secondary text-sm max-w-md">Start by typing your question below or click on one of the categories above</p>
						</div>
					)}
					
					{messages.map((m, i) => (
						<ChatBubble key={i} role={m.role} text={m.text} />
					))}
					
					{typing && (
						<div className="flex items-start mb-4">
							<div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-muted flex items-center justify-center mr-3 mt-1">
								<span className="text-white text-sm font-medium">AI</span>
							</div>
							<div className="bg-card dark:bg-dark/90 border border-secondary/20 dark:border-secondary/30 rounded-2xl px-4 py-3 shadow-sm">
								<div className="flex items-center gap-1">
									<div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
									<div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
									<div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
								</div>
							</div>
						</div>
					)}
					<div ref={endRef} />
				</div>

				{/* Input Area */}
				<div className="p-6 border-t border-secondary/20 dark:border-secondary/30 bg-card dark:bg-dark/90">
					<div className="flex items-end gap-3">
						<div className="flex-1 relative">
							<input 
								className="w-full px-4 py-3 pr-12 rounded-2xl border border-secondary dark:border-secondary/30 bg-background dark:bg-dark text-dark dark:text-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
								placeholder="Type your message..."
								value={input}
								onChange={e => setInput(e.target.value)}
								onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
							/>
							<button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full hover:bg-secondary/20 dark:hover:bg-secondary/30 flex items-center justify-center text-muted dark:text-secondary">
								😊
							</button>
						</div>
						<button 
							onClick={send}
							disabled={!input.trim() || typing}
							className="w-12 h-12 rounded-2xl bg-primary hover:bg-primary-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white font-medium transition-all"
						>
							{typing ? '⏳' : '➤'}
						</button>
					</div>
					<div className="flex items-center gap-4 mt-3 text-xs text-muted dark:text-secondary">
						<span>Press Enter to send, Shift+Enter for new line</span>
					</div>
				</div>
			</div>

			{/* FAQs Panel (Right Sidebar) */}
			<div className="w-80 bg-card dark:bg-dark/90 border-l border-secondary/20 dark:border-secondary/30 flex flex-col">
				<div className="p-6 border-b border-secondary/20 dark:border-secondary/30">
					<h3 className="font-semibold text-dark dark:text-background mb-2">Frequently Asked</h3>
					<p className="text-xs text-muted dark:text-secondary">Popular questions from students</p>
				</div>
				
				<div className="flex-1 overflow-y-auto p-4">
					{faqErr && <div className="text-sm text-red-500 mb-4">{faqErr}</div>}
					
					{faqs.length === 0 && !faqErr && (
						<div className="text-center py-8">
							<div className="w-12 h-12 rounded-full bg-secondary/20 dark:bg-secondary/30 flex items-center justify-center mx-auto mb-3">
								<span className="text-muted dark:text-secondary">❓</span>
							</div>
							<p className="text-sm text-muted dark:text-secondary">No FAQs available yet</p>
						</div>
					)}
					
					<div className="space-y-3">
						{faqs.map(f => (
							<div key={f.id} className="p-4 rounded-xl bg-secondary/10 dark:bg-secondary/20 border border-secondary/20 dark:border-secondary/30 hover:bg-secondary/20 dark:hover:bg-secondary/30 cursor-pointer transition-colors">
								<p className="text-sm font-medium text-dark dark:text-background mb-2">{f.question}</p>
								<p className="text-xs text-muted dark:text-secondary leading-relaxed">{f.answer}</p>
								<div className="flex items-center justify-between mt-3">
									<span className="text-xs text-muted dark:text-secondary">Asked {f.times_asked} times</span>
									<button className="text-xs text-primary hover:underline">Use this</button>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
