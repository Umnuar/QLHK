import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		console.error("[ErrorBoundary]", error, errorInfo);
	}

	render(): ReactNode {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;
			return (
				<div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
					<div className="p-4 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-full mb-4">
						<AlertTriangle className="w-10 h-10" />
					</div>
					<h1 className="text-2xl font-bold mb-2">Đã xảy ra sự cố hệ thống</h1>
					<p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md text-sm font-medium">
						Giao diện ứng dụng gặp lỗi không mong muốn. Vui lòng thử tải lại
						hoặc liên hệ quản trị viên.
					</p>
					<pre className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 max-w-xl w-full overflow-auto text-left text-xs font-mono text-slate-700 dark:text-slate-300 mb-6 shadow-xs">
						{this.state.error?.message}
						{"\n\n"}
						{this.state.error?.stack}
					</pre>
					<button
						onClick={() => window.location.reload()}
						className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
					>
						<RefreshCw className="w-4 h-4" />
						Tải lại ứng dụng
					</button>
				</div>
			);
		}
		return this.props.children;
	}
}
