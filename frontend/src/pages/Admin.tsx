import { useState } from 'react'
import { api } from '../lib/api'

export default function Admin(){
	const [file,setFile] = useState<File|null>(null)
	const [status,setStatus] = useState<string>('')

	function onDrop(e:React.DragEvent){
		e.preventDefault(); const f = e.dataTransfer.files?.[0]; if(f) setFile(f)
	}
	function onBrowse(e:React.ChangeEvent<HTMLInputElement>){ const f = e.target.files?.[0]; if(f) setFile(f) }

	async function upload(){
		if(!file){ alert('Select a PDF'); return }
		const fd = new FormData(); fd.append('file', file)
		setStatus('Uploading...')
		const res = await api('/api/admin/upload',{method:'POST', body: fd})
		const data = await res.json()
		if(res.ok){ setStatus(`Uploaded ✔️ QAs: ${data.qa_count}`) } else { setStatus('Upload failed') }
	}

	return (
		<div className="grid md:grid-cols-2 gap-6">
			<div className="card">
				<h2 className="font-semibold mb-3">Upload PDF</h2>
				<div onDragOver={e=>e.preventDefault()} onDrop={onDrop} className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center bg-slate-900/40">
					<p className="text-sm text-muted">Drag & drop your PDF here</p>
					<p className="text-sm text-muted">or</p>
					<input type="file" accept="application/pdf" onChange={onBrowse} className="mt-2" />
				</div>
				{file && <div className="mt-3 text-sm">Selected: <strong>{file.name}</strong></div>}
				<div className="mt-3 flex gap-2">
					<button className="btn" onClick={upload}>Upload</button>
					<span className="text-sm text-muted">{status}</span>
				</div>
			</div>
			<div className="card">
				<h3 className="font-medium mb-2">Guidelines</h3>
				<ul className="list-disc pl-6 text-sm text-muted space-y-1">
					<li>Ensure questions are marked with Q/Question and answers with A/Answer.</li>
					<li>After upload, knowledge base and semantic index are refreshed.</li>
				</ul>
			</div>
		</div>
	)
}
