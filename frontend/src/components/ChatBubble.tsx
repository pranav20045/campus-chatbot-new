type Props = { role: 'user'|'bot', text: string }
export default function ChatBubble({role,text}:Props){
	const isUser = role==='user'
	return (
		<div className={`flex ${isUser?'justify-end':'justify-start'} mb-4`}>
			{!isUser && (
				<div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-muted flex items-center justify-center mr-3 mt-1 flex-shrink-0">
					<span className="text-white text-sm font-medium">AI</span>
				</div>
			)}
			<div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
				isUser 
					? 'bg-dark text-white rounded-br-md' 
					: 'bg-card border border-secondary/20 text-dark'
			}`}>
				<p className="text-sm leading-relaxed">{text}</p>
			</div>
			{isUser && (
				<div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center ml-3 mt-1 flex-shrink-0">
					<span className="text-dark text-sm font-medium">You</span>
				</div>
			)}
		</div>
	)
}


