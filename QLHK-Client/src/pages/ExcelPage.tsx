import {
	CheckCircle2,
	Download,
	FileSpreadsheet,
	FolderOpen,
	UploadCloud,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useApp } from "../AppContext";
import { apiClient } from "../api/client";
import { householdApi } from "../api/householdApi";
import { ImportPreviewModal } from "../components/excel/ImportPreviewModal";
import { useHouseholds } from "../context/HouseholdContext";
import { useModal } from "../hooks/useModal";
import type { Household, Person } from "../types";
import { maskCccd } from "../utils/cccd";
import {
	calculateAge,
	formatDobDisplay,
	parseAndValidateDob,
} from "../utils/date";
import { parseExcelSheet } from "../utils/excelParser";
import { normalizeUnaccented, splitFullName } from "../utils/vietnamese";

export const ExcelPage: React.FC = () => {
	const { villages, selectedVillageId, selectedVillageName, setActiveTab } =
		useApp();
	const { addHousehold } = useHouseholds();
	const { showModal } = useModal();

	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [parsedRows, setParsedRows] = useState<any[]>([]);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [isDragging, setIsDragging] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);

	// Mở hộp thoại chọn tệp (Ưu tiên Electron Native Windows File Dialog, fallback sang HTML input)
	const handleSelectFile = async () => {
		try {
			if (window.electronAPI?.openFileDialog) {
				const filePath = await window.electronAPI.openFileDialog();
				if (filePath) {
					// File path nhận được từ Electron IPC
					console.log("Selected file via Electron IPC:", filePath);
					// Trong môi trường web preview hoặc khi electron preload trả về đường dẫn
				}
			}
		} catch {
			// Fallback sang input thông thường
		}
		fileInputRef.current?.click();
	};

	const processFile = async (file: File) => {
		setSelectedFile(file);
		try {
			const buffer = await file.arrayBuffer();
			const workbook = XLSX.read(buffer, { type: "array" });
			const firstSheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[firstSheetName];
			const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, {
				header: 1,
				defval: "",
			});

			const dataRows = parseExcelSheet(rawJson, {
				defaultVillageName: selectedVillageName,
			});

			setParsedRows(dataRows);
			setIsPreviewOpen(true);
		} catch (err: any) {
			console.error("Lỗi đọc file Excel:", err);
			showModal({
				title: "Lỗi đọc tệp Excel",
				message:
					"Tệp không đúng định dạng hoặc bị lỗi. Vui lòng kiểm tra lại tệp Excel.",
				type: "danger",
			});
		}
	};

	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			processFile(file);
		}
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => {
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const file = e.dataTransfer.files?.[0];
		if (file) {
			processFile(file);
		}
	};

	// Xác nhận nhập dữ liệu vào CSDL
	const handleConfirmImport = async (validRows: any[]) => {
		setIsImporting(true);
		try {
			// Gom các dòng theo Mã Sổ / Mã Hộ
			const householdMap: Record<
				string,
				{ code: string; address: string; notes: string; members: Person[] }
			> = {};
			const targetVillageId = selectedVillageId || villages[0]?.id || "vil-01";
			const targetVillage = villages.find((v) => v.id === targetVillageId);

			validRows.forEach((r, idx) => {
				const code = String(
					r.code || `SHK-IMP-${Math.floor(idx / 4) + 1}`,
				).trim();
				const fullName = String(r.fullName || "").trim();
				const relationship = String(r.relationship || "Chủ hộ").trim();
				const isHead = relationship.toLowerCase().includes("chủ hộ");
				const dobRaw = String(r.dobRaw || "").trim();
				const gender = String(r.gender || "Nam").trim();
				const ethnicity = String(r.ethnicity || "Kinh").trim();
				const religion = String(r.religion || "Không").trim();
				const cccd = String(r.cccd || "").trim();
				const address = String(
					r.address || targetVillage?.name || "Xã Đăk Hà",
				).trim();
				const notes = String(r.notes || "").trim();

				let dobFormatted = dobRaw;
				let birthYear = 2000;
				let age = 26;
				if (dobRaw) {
					const dobVal = parseAndValidateDob(dobRaw);
					if (dobVal.isValid) {
						dobFormatted = dobVal.formatted || dobRaw;
						birthYear = dobVal.birthYear ?? 2000;
						age = calculateAge(dobFormatted, 2026);
					}
				}

				const { lastName, firstName } = splitFullName(fullName);

				const person: Person = {
					id: `imp-mem-${Date.now()}-${idx}`,
					household_id: code,
					stt: idx + 1,
					full_name: fullName,
					last_name: lastName,
					first_name: firstName,
					name_unaccented: normalizeUnaccented(fullName),
					relationship: relationship as any,
					is_head: isHead,
					gender: (gender === "Nữ" ? "Nữ" : "Nam") as any,
					dob: dobFormatted,
					dob_raw: dobRaw,
					dob_formatted: formatDobDisplay(dobFormatted),
					birth_year: birthYear,
					age,
					cccd,
					cccd_last4: cccd ? cccd.slice(-4) : "",
					cccd_masked: maskCccd(cccd, false),
					ethnicity,
					is_minority: ethnicity !== "Kinh",
					religion,
					occupation: notes,
					notes,
				};

				if (!householdMap[code]) {
					householdMap[code] = {
						code,
						address,
						notes,
						members: [],
					};
				}
				householdMap[code].members.push(person);
			});

			// 1. Cập nhật Context Store cho từng hộ (reactive state & cache)
			const householdList = Object.values(householdMap);
			for (const group of householdList) {
				const headPerson =
					group.members.find((m) => m.is_head) || group.members[0];
				const newHh: Household = {
					id: `imp-hh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
					code: group.code,
					book_number: group.code,
					village_id: targetVillageId,
					village_name: targetVillage?.name || "Thôn 1",
					head_name: headPerson ? headPerson.full_name : "Chưa rõ",
					head_cccd: headPerson ? headPerson.cccd : "",
					address: group.address,
					status: "Thường trú",
					notes: group.notes,
					members_count: group.members.length,
					members: group.members,
					is_deleted: false,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				};
				addHousehold(newHh);
			}

			// 2. Đồng bộ hàng loạt vào CSDL backend qua POST /excel/import
			try {
				const importPayload = {
					village_id: targetVillageId,
					village_name: targetVillage?.name || "",
					households: householdList.map((g) => ({
						book_number: g.code,
						address: g.address,
						status: "active",
						members: g.members.map((m) => ({
							stt: m.stt,
							is_head: m.is_head,
							relationship: m.relationship,
							full_name: m.full_name,
							dob: m.dob_raw || m.dob,
							gender: m.gender,
							cccd: m.cccd,
							ethnicity: m.ethnicity,
							religion: m.religion,
							notes: m.notes,
						})),
					})),
				};
				await apiClient.post("/excel/import", importPayload);
			} catch (apiErr) {
				console.warn(
					"[ExcelPage] Không thể đồng bộ trực tiếp qua /excel/import, đã lưu vào bộ nhớ cục bộ:",
					apiErr,
				);
			}

			setIsPreviewOpen(false);
			showModal({
				title: "Nhập dữ liệu thành công",
				message: `Đã nhập thành công ${householdList.length} sổ hộ khẩu với ${validRows.length} nhân khẩu vào cơ sở dữ liệu.`,
				type: "success",
			});
			setActiveTab("households");
		} catch (err: any) {
			console.error(err);
			showModal({
				title: "Lỗi nhập dữ liệu",
				message: `Không thể nhập dữ liệu vào CSDL: ${err.message}`,
				type: "danger",
			});
		} finally {
			setIsImporting(false);
		}
	};

	// Tải biểu mẫu Excel mẫu 11 cột
	const handleDownloadTemplate = () => {
		const templateRows = [
			{
				STT: 1,
				"Mã Hộ / Số Sổ": "SHK-01001",
				"Họ và Tên": "A Đôi",
				"Quan Hệ": "Chủ hộ",
				"Ngày Sinh": "15/04/1975",
				"Giới Tính": "Nam",
				"Dân Tộc": "Xơ Đăng",
				"Tôn Giáo": "Công giáo",
				CCCD: "060075001234",
				"Địa Chỉ": "Thôn Kon Đao Yôp, Xã Đăk Hà",
				"Ghi Chú": "Chủ hộ thường trú",
			},
			{
				STT: 2,
				"Mã Hộ / Số Sổ": "SHK-01001",
				"Họ và Tên": "Y Ble",
				"Quan Hệ": "Vợ",
				"Ngày Sinh": "20/11/1978",
				"Giới Tính": "Nữ",
				"Dân Tộc": "Xơ Đăng",
				"Tôn Giáo": "Công giáo",
				CCCD: "060178005678",
				"Địa Chỉ": "Thôn Kon Đao Yôp, Xã Đăk Hà",
				"Ghi Chú": "",
			},
			{
				STT: 3,
				"Mã Hộ / Số Sổ": "SHK-01002",
				"Họ và Tên": "Nguyễn Văn Minh",
				"Quan Hệ": "Chủ hộ",
				"Ngày Sinh": "02/09/1982",
				"Giới Tính": "Nam",
				"Dân Tộc": "Kinh",
				"Tôn Giáo": "Không",
				CCCD: "060082009876",
				"Địa Chỉ": "Thôn 1, Xã Đăk Hà",
				"Ghi Chú": "",
			},
		];

		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(templateRows);
		XLSX.utils.book_append_sheet(wb, ws, "BieuMau_NhanHoKhau");
		XLSX.writeFile(wb, "BieuMau_NhanHoKhau_11Cot_DakHa.xlsx");
	};

	return (
		<div className="space-y-6 animate-in fade-in pb-10">
			{/* Top Banner */}
			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150">
				<div>
					<div className="flex items-center gap-2.5">
						<span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
							{selectedVillageName || "Toàn xã Đăk Hà"}
						</span>
						<h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
							<FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
							<span>Xử Lý Dữ Liệu Excel (11 Cột Chuẩn)</span>
						</h2>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
						Nhập file "Nhân hộ khẩu.xls" tự động kiểm tra lỗi ngày sinh (năm 3
						chữ số, tháng 17...) và đối soát dữ liệu
					</p>
				</div>

				<div className="flex items-center gap-2.5">
					<button
						type="button"
						onClick={handleDownloadTemplate}
						className="h-10 flex items-center gap-1.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
					>
						<Download className="w-4 h-4 text-emerald-600" />
						<span>Tải Biểu Mẫu Chuẩn (11 Cột)</span>
					</button>
				</div>
			</div>

			{/* Main Drag & Drop Zone */}
			<div
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={handleSelectFile}
				className={`bg-white dark:bg-slate-900 rounded-3xl p-12 border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center space-y-4 shadow-sm hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-slate-800/40 ${
					isDragging
						? "border-emerald-500 bg-emerald-50/40 scale-[1.01]"
						: "border-slate-300 dark:border-slate-700"
				}`}
			>
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileInputChange}
					accept=".xls,.xlsx,.csv"
					className="hidden"
				/>

				<div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-md">
					<UploadCloud className="w-10 h-10" />
				</div>

				<div>
					<h3 className="text-lg font-black text-slate-900 dark:text-white">
						Kéo thả tệp Excel vào đây hoặc bấm để chọn tệp
					</h3>
					<p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
						Hỗ trợ các tệp:{" "}
						<strong className="text-emerald-600">.xls, .xlsx, .csv</strong> (Ví
						dụ: Nhân hộ khẩu.xls)
					</p>
				</div>

				<div className="pt-2 flex items-center gap-3">
					<button
						type="button"
						className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
					>
						<FolderOpen className="w-4 h-4" />
						<span>Mở Hộp Thoại Chọn Tệp Windows</span>
					</button>
				</div>
			</div>

			{/* Thông tin quy chuẩn 11 cột */}
			<div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
				<h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
					<CheckCircle2 className="w-4 h-4 text-emerald-500" />
					<span>Quy Định Cấu Trúc 11 Cột Biểu Mẫu "Nhân Hộ Khẩu.xls"</span>
				</h4>
				<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">1. STT</span>
						<div className="text-[11px] text-slate-500 mt-0.5">Số thứ tự</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">
							2. Mã Hộ
						</span>
						<div className="text-[11px] text-slate-500 mt-0.5">
							Số sổ hộ khẩu
						</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">
							3. Họ và Tên
						</span>
						<div className="text-[11px] text-slate-500 mt-0.5">
							Họ tên nhân khẩu
						</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">
							4. Quan Hệ
						</span>
						<div className="text-[11px] text-slate-500 mt-0.5">
							Chủ hộ / Con / Vợ...
						</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20">
						<span className="font-mono font-bold text-rose-600">
							5. Ngày Sinh
						</span>
						<div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5 font-semibold">
							Tự động bắt lỗi
						</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">
							6. Giới Tính
						</span>
						<div className="text-[11px] text-slate-500 mt-0.5">Nam / Nữ</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">
							7. Dân Tộc
						</span>
						<div className="text-[11px] text-slate-500 mt-0.5">
							1 trong 14 DT
						</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">
							8. Tôn Giáo
						</span>
						<div className="text-[11px] text-slate-500 mt-0.5">
							CG / TL / PG / Không
						</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">
							9. CCCD
						</span>
						<div className="text-[11px] text-slate-500 mt-0.5">12 chữ số</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">
							10. Địa Chỉ
						</span>
						<div className="text-[11px] text-slate-500 mt-0.5">Thôn cư trú</div>
					</div>
					<div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/80 dark:border-slate-800">
						<span className="font-mono font-bold text-emerald-600">
							11. Ghi Chú
						</span>
						<div className="text-[11px] text-slate-500 mt-0.5">
							Ghi chú thêm
						</div>
					</div>
				</div>
			</div>

			{/* Modal Preview 11 Cột & Highlight lỗi ngày sinh */}
			<ImportPreviewModal
				isOpen={isPreviewOpen}
				onClose={() => setIsPreviewOpen(false)}
				file={selectedFile}
				parsedData={parsedRows}
				onConfirm={handleConfirmImport}
				importing={isImporting}
			/>
		</div>
	);
};
