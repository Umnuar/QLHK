import {
	AlertCircle,
	Calendar,
	Check,
	Clock,
	Globe,
	Laptop,
	RefreshCw,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useApp } from "../../AppContext";
import { useModal } from "../../hooks/useModal";

export const TimeCard: React.FC = () => {
	const { calculationYear, setCalculationYear } = useApp();
	const { showModal } = useModal();

	const [syncType, setSyncType] = useState<"machine" | "manual" | "internet">(
		"machine",
	);
	const [offset, setOffset] = useState<number>(0);
	const [currentAppTime, setCurrentAppTime] = useState<Date>(new Date());
	const [manualDatetime, setManualDatetime] = useState<string>("");
	const [isSyncingInternet, setIsSyncingInternet] = useState(false);

	// Nạp cấu hình từ localStorage
	const loadTimeConfig = () => {
		try {
			const raw = localStorage.getItem("app_time_config");
			if (raw) {
				const config = JSON.parse(raw);
				setSyncType(config.syncType || "machine");
				setOffset(config.offset || 0);
			}
		} catch (e) {
			console.error("Failed to load time config:", e);
		}
	};

	const saveTimeConfig = (
		type: "machine" | "manual" | "internet",
		newOffset: number,
	) => {
		const config = { syncType: type, offset: newOffset };
		localStorage.setItem("app_time_config", JSON.stringify(config));
		setSyncType(type);
		setOffset(newOffset);

		// Cập nhật năm tính toán toàn ứng dụng
		const effectiveYear = new Date(Date.now() + newOffset).getFullYear();
		setCalculationYear(effectiveYear);
	};

	useEffect(() => {
		loadTimeConfig();

		// Đồng hồ chạy liên tục cập nhật theo giây có tính đến offset
		const timer = setInterval(() => {
			const raw = localStorage.getItem("app_time_config");
			let currentOffset = 0;
			if (raw) {
				try {
					currentOffset = JSON.parse(raw).offset || 0;
				} catch {
					// ignore
				}
			}
			setCurrentAppTime(new Date(Date.now() + currentOffset));
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, []);

	// Format ngày giờ hiển thị chi tiết theo chuẩn hành chính
	const formatTimeFull = (date: Date) => {
		const days = [
			"Chủ Nhật",
			"Thứ Hai",
			"Thứ Ba",
			"Thứ Tư",
			"Thứ Năm",
			"Thứ Sáu",
			"Thứ Bảy",
		];
		const pad = (n: number) => String(n).padStart(2, "0");

		const dayName = days[date.getDay()];
		const day = pad(date.getDate());
		const month = pad(date.getMonth() + 1);
		const year = date.getFullYear();
		const hours = pad(date.getHours());
		const minutes = pad(date.getMinutes());
		const seconds = pad(date.getSeconds());

		return `${dayName}, ngày ${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
	};

	// Chuyển Date sang chuỗi YYYY-MM-DDTHH:mm cho input datetime-local
	const toDatetimeLocalString = (date: Date) => {
		const pad = (num: number) => String(num).padStart(2, "0");
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
			date.getHours(),
		)}:${pad(date.getMinutes())}`;
	};

	// Điền sẵn giờ khi chuyển sang chế độ manual
	useEffect(() => {
		if (syncType === "manual" && !manualDatetime) {
			setManualDatetime(toDatetimeLocalString(currentAppTime));
		}
	}, [syncType, currentAppTime, manualDatetime]);

	const handleSyncTypeChange = async (
		type: "machine" | "manual" | "internet",
	) => {
		if (isSyncingInternet) return;

		if (type === "manual") {
			setSyncType("manual");
			setManualDatetime(toDatetimeLocalString(new Date(Date.now() + offset)));
			return;
		}

		if (type === "machine") {
			saveTimeConfig("machine", 0);
			showModal({
				title: "Đồng bộ thành công",
				message:
					"Thời gian đã được đồng bộ theo đồng hồ phần cứng của máy tính.",
				type: "success",
			});
		} else if (type === "internet") {
			handleManualSyncInternet();
		}
	};

	const handleSaveManualTime = () => {
		if (!manualDatetime) return;
		try {
			const targetTime = new Date(manualDatetime).getTime();
			if (isNaN(targetTime)) {
				showModal({
					title: "Lỗi định dạng",
					message: "Vui lòng chọn ngày giờ hợp lệ.",
					type: "danger",
				});
				return;
			}

			const newOffset = targetTime - Date.now();
			saveTimeConfig("manual", newOffset);
			showModal({
				title: "Đã thiết lập thời gian",
				message: `Thời gian chạy ứng dụng đã được điều chỉnh. Năm tính toán toàn hệ thống hiện tại là ${new Date(targetTime).getFullYear()}.`,
				type: "success",
			});
		} catch (e: any) {
			showModal({
				title: "Lỗi",
				message: e.message || "Không thể thiết lập thời gian",
				type: "danger",
			});
		}
	};

	const handleManualSyncInternet = async () => {
		if (isSyncingInternet) return;
		setIsSyncingInternet(true);
		try {
			const start = Date.now();
			const res = await fetch(
				"https://worldtimeapi.org/api/timezone/Asia/Ho_Chi_Minh",
				{ cache: "no-store" },
			);
			const latency = (Date.now() - start) / 2;

			if (res.ok) {
				const data = await res.json();
				const serverTime = new Date(data.datetime).getTime() + latency;
				const newOffset = Math.round(serverTime - Date.now());
				saveTimeConfig("internet", newOffset);
				showModal({
					title: "Đồng bộ thành công",
					message:
						"Thời gian quốc tế (Internet Asia/Ho_Chi_Minh) đã được cập nhật thành công.",
					type: "success",
				});
			} else {
				saveTimeConfig("internet", 0);
				showModal({
					title: "Đồng bộ chuẩn",
					message: "Đã cập nhật theo thời gian chuẩn của thiết bị.",
					type: "success",
				});
			}
		} catch {
			saveTimeConfig("internet", 0);
			showModal({
				title: "Đã đồng bộ",
				message: "Đã sử dụng thời gian chuẩn của hệ thống.",
				type: "info",
			});
		} finally {
			setIsSyncingInternet(false);
		}
	};

	const formatOffsetReadable = (offsetMs: number) => {
		if (Math.abs(offsetMs) < 1000) return "Khớp hoàn toàn với máy tính";
		const seconds = Math.round(offsetMs / 1000);
		const absSeconds = Math.abs(seconds);
		const prefix = seconds > 0 ? "Nhanh hơn máy tính" : "Chậm hơn máy tính";

		if (absSeconds < 60) return `${prefix} ${absSeconds} giây`;
		const minutes = Math.floor(absSeconds / 60);
		const remSeconds = absSeconds % 60;

		if (minutes < 60) return `${prefix} ${minutes} phút ${remSeconds} giây`;
		const hours = Math.floor(minutes / 60);
		const remMinutes = minutes % 60;

		if (hours < 24) return `${prefix} ${hours} giờ ${remMinutes} phút`;
		const days = Math.floor(hours / 24);
		const remHours = hours % 24;
		return `${prefix} ${days} ngày ${remHours} giờ`;
	};

	return (
		<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
			{/* Header */}
			<div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
				<div className="flex items-center">
					<div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-2xl mr-4 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
						<Clock className="h-5 w-5" strokeWidth={1.5} />
					</div>
					<div>
						<h3 className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
							Thời Gian & Hệ Thống
						</h3>
						<p className="text-xs font-medium mt-0.5 text-slate-500 dark:text-slate-400">
							Cấu hình nguồn thời gian hoạt động và năm tính toán toàn ứng dụng
						</p>
					</div>
				</div>
			</div>

			<div className="p-6 md:p-8 space-y-6">
				{/* Live Clock Display */}
				<div className="p-5 rounded-2xl border border-emerald-100 dark:border-slate-700 bg-emerald-50/40 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="space-y-1 text-center sm:text-left">
						<div className="flex items-center justify-center sm:justify-start gap-2">
							<span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
							<p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
								Thời gian hệ thống đang chạy
							</p>
						</div>
						<p className="text-xl md:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
							{formatTimeFull(currentAppTime)}
						</p>
						<p className="text-xs font-medium text-slate-500 dark:text-slate-400">
							Năm tính toán:{" "}
							<span className="font-bold text-emerald-600 dark:text-emerald-400">
								{calculationYear}
							</span>{" "}
							• Độ lệch:{" "}
							<span className="font-bold">{formatOffsetReadable(offset)}</span>{" "}
							({offset > 0 ? `+${offset}ms` : `${offset}ms`})
						</p>
					</div>

					{syncType === "internet" && (
						<button
							type="button"
							onClick={handleManualSyncInternet}
							disabled={isSyncingInternet}
							className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center transition-all shadow-xs cursor-pointer"
						>
							<RefreshCw
								className={`w-3.5 h-3.5 mr-2 ${isSyncingInternet ? "animate-spin text-emerald-500" : ""}`}
								strokeWidth={1.5}
							/>
							<span>
								{isSyncingInternet ? "Đang đồng bộ..." : "Đồng bộ lại"}
							</span>
						</button>
					)}
				</div>

				{/* Sync Mode Selection */}
				<div className="space-y-3">
					<p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
						Chọn chế độ đồng bộ thời gian
					</p>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						{/* Mode 1: Machine Time */}
						<div
							onClick={() => handleSyncTypeChange("machine")}
							className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
								syncType === "machine"
									? "border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs"
									: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
							}`}
						>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
										<Laptop className="w-5 h-5" strokeWidth={1.5} />
									</div>
									{syncType === "machine" && (
										<Check
											className="w-5 h-5 text-emerald-600"
											strokeWidth={1.5}
										/>
									)}
								</div>
								<div>
									<h4 className="font-bold text-xs uppercase text-slate-900 dark:text-white">
										Theo máy tính
									</h4>
									<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
										Sử dụng trực tiếp đồng hồ phần cứng của máy tính này.
									</p>
								</div>
							</div>
						</div>

						{/* Mode 2: Internet Time */}
						<div
							onClick={() => handleSyncTypeChange("internet")}
							className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
								syncType === "internet"
									? "border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs"
									: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
							}`}
						>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
										<Globe className="w-5 h-5" strokeWidth={1.5} />
									</div>
									{syncType === "internet" && (
										<Check
											className="w-5 h-5 text-emerald-600"
											strokeWidth={1.5}
										/>
									)}
								</div>
								<div>
									<h4 className="font-bold text-xs uppercase text-slate-900 dark:text-white">
										Internet (NTP/World)
									</h4>
									<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
										Đồng bộ theo thời gian chuẩn quốc tế qua mạng Internet.
									</p>
								</div>
							</div>
						</div>

						{/* Mode 3: Manual Time */}
						<div
							onClick={() => handleSyncTypeChange("manual")}
							className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
								syncType === "manual"
									? "border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs"
									: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
							}`}
						>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
										<Calendar className="w-5 h-5" strokeWidth={1.5} />
									</div>
									{syncType === "manual" && (
										<Check
											className="w-5 h-5 text-emerald-600"
											strokeWidth={1.5}
										/>
									)}
								</div>
								<div>
									<h4 className="font-bold text-xs uppercase text-slate-900 dark:text-white">
										Thiết lập thủ công
									</h4>
									<p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
										Chỉ định ngày giờ chạy cụ thể (phục vụ đối soát, NVQS, kiểm
										tra).
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Manual Setting Inputs */}
				{syncType === "manual" && (
					<div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 space-y-4 animate-in fade-in">
						<div className="flex items-center space-x-2 text-amber-500">
							<AlertCircle className="w-4 h-4" strokeWidth={1.5} />
							<p className="text-xs font-bold uppercase tracking-wider">
								Cài đặt thời gian chạy thủ công
							</p>
						</div>

						<div className="flex flex-col sm:flex-row items-center gap-3">
							<input
								type="datetime-local"
								value={manualDatetime}
								onChange={(e) => setManualDatetime(e.target.value)}
								className="w-full sm:w-auto px-4 py-2 rounded-xl border text-xs font-bold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:bg-slate-800 dark:focus:border-emerald-500 dark:focus:ring-2 dark:focus:ring-emerald-500/20"
							/>
							<button
								type="button"
								onClick={handleSaveManualTime}
								className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
							>
								Áp dụng thời gian này
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default TimeCard;
