import { useEffect, useState } from 'react'
import { api } from '../lib/api'

interface Pending{ id:number; student_id:number; question:string; created_at:string }

export default function Staff(){
	const [items,setItems] = useState<Pending[]>([])
	const [answering,setAnswering] = useState<number|null>(null)
	const [answer,setAnswer] = useState('')
	const [query,setQuery] = useState('')
	const [sortNewest,setSortNewest] = useState(true)

	async function load(){
		const res = await api('/api/staff/pending')
		setItems(await res.json())
	}
	useEffect(()=>{ load() },[])

	async function submit(id:number){
		await api('/api/staff/answer_json/'+id,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({answer})})
		setAnswer(''); setAnswering(null); load()
	}

	const filtered = items
		.filter(it=> it.question.toLowerCase().includes(query.toLowerCase()))
		.sort((a,b)=> sortNewest
			? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
			: new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		)

	return (
		<div className="card">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="font-semibold">Pending Queries</h2>
					<p className="text-sm text-muted">{filtered.length} {filtered.length===1? 'query':'queries'} awaiting response</p>
				</div>
				<div className="flex items-center gap-3">
					<input value={query} onChange={e=>setQuery(e.target.value)} className="input w-64" placeholder="Search queries" />
					<select value={sortNewest? 'new':'old'} onChange={e=>setSortNewest(e.target.value==='new')} className="input w-40">
						<option value="new">Newest First</option>
						<option value="old">Oldest First</option>
					</select>
				</div>
			</div>
			<div className="space-y-3">
				{filtered.map(it=> (
					<div key={it.id} className="rounded-2xl p-5 border border-gray-200 bg-gradient-to-br from-fuchsia-50 to-indigo-50">
						<div className="flex items-center gap-3 text-sm text-gray-500">
							<span className="inline-flex items-center gap-1"><span className="text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5">#{it.id}</span> <span>• Student {it.student_id}</span></span>
							<span>• {new Date(it.created_at).toLocaleTimeString()}</span>
						</div>
						<div className="font-medium mb-2 text-gray-900 mt-1">{it.question}</div>
						{answering===it.id ? (
							<div className="space-y-2">
								<textarea className="input h-24" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type answer..." />
								<div className="flex gap-2">
									<button className="btn" onClick={()=>submit(it.id)}>Send</button>
									<button className="btn bg-gray-200 text-gray-800 hover:bg-gray-300" onClick={()=>{setAnswering(null); setAnswer('')}}>Cancel</button>
								</div>
							</div>
						) : (
							<button className="btn bg-purple-600 hover:bg-purple-700" onClick={()=>setAnswering(it.id)}>Answer</button>
						)}
					</div>
				))}
				{items.length===0 && <div className="text-sm text-muted">No pending items.</div>}
			</div>
		</div>
	)
}
