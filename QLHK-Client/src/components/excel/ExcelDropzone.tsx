import {
	AlertCircle,
	Download,
	FileSpreadsheet,
	FolderOpen,
	UploadCloud,
} from "lucide-react";
import type React from "react";
import { useRef } from "react";
import * as XLSX from "xlsx";
import type { ExcelImportRow } from "../../types";
import { validateCccd } from "../../utils/cccd";
import { parseAndValidateDob } from "../../utils/date";

interface Props {
	onParsed: (rows: ExcelImportRow[], fileName: string) => void;
	isLoading: boolean;
	setIsLoading: (loading: boolean) => void;
}

export const ExcelDropzone: React.FC<Props> = ({
	onParsed,
	isLoading,
	setIsLoading,
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const parseWorkbook = (workbook: XLSX.WorkBook, fileName: string) => {
		try {
			const firstSheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[firstSheetName];

			// Parse to json array of objects
			const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
				defval: "",
			});

			const parsedRows: ExcelImportRow[] = rawRows.map((row, idx) => {
				// Bóc tách linh hoạt các cột theo nhiều biến thể tên cột Excel tiếng Việt
				const stt = row["STT"] || row["stt"] || idx + 1;
				const code =
					row["Mã hộ"] ||
					row["Mã Hộ"] ||
					row["Số sổ"] ||
					row["Mã HK"] ||
					`HK-TEMP-${idx + 1}`;
				const villageName =
					row["Thôn"] || row["Thôn/Làng"] || row["Địa bàn"] || "Thôn 1";
				const fullName = String(
					row["Họ và tên"] || row["Họ tên"] || row["Tên"] || "",
				).trim();
				const relationship = String(
					row["Quan hệ"] ||
						row["Quan hệ với chủ hộ"] ||
						(idx === 0 ? "Chủ hộ" : "Con đẻ"),
				).trim();
				const dobRaw = String(
					row["Ngày sinh"] ||
						row["Năm sinh"] ||
						row["Ngày tháng năm sinh"] ||
						row["NS"] ||
						"",
				).trim();
				const gender = String(row["Giới tính"] || row["Phái"] || "Nam").trim();
				const ethnicity = String(row["Dân tộc"] || "Kinh").trim();
				const religion = String(row["Tôn giáo"] || "Không").trim();
				const cccd = String(
					row["CCCD"] || row["Số CCCD"] || row["CMND"] || "",
				).trim();
				const address = String(
					row["Địa chỉ"] || row["Nơi ở hiện nay"] || "",
				).trim();
				const notes = String(row["Ghi chú"] || "").trim();

				const errors: string[] = [];
				const warnings: string[] = [];

				// 1. Kiểm tra Họ và tên
				if (!fullName) {
					errors.push("Thiếu họ và tên nhân khẩu");
				}

				// 2. Kiểm tra Ngày sinh linh hoạt & các lỗi đề bài đưa ra
				if (!dobRaw) {
					errors.push("Thiếu ngày tháng năm sinh");
				} else {
					const dobCheck = parseAndValidateDob(dobRaw);
					if (!dobCheck.isValid) {
						errors.push(dobCheck.error || "Ngày sinh không hợp lệ");
					}
				}

				// 3. Kiểm tra số CCCD nếu có
				if (cccd) {
					const cccdCheck = validateCccd(cccd);
					if (!cccdCheck.isValid) {
						warnings.push(cccdCheck.error || "CCCD không đúng chuẩn");
					}
				}

				return {
					rowIndex: idx + 2, // Excel dòng tính từ 2
					stt,
					code,
					village_name: villageName,
					full_name: fullName,
					relationship,
					dob_raw: dobRaw,
					gender: gender.toLowerCase().includes("nữ") ? "Nữ" : "Nam",
					ethnicity,
					religion,
					cccd,
					address,
					notes,
					isValid: errors.length === 0,
					errors,
					warnings,
				};
			});

			onParsed(parsedRows, fileName);
		} catch (err) {
			console.error("Lỗi phân tích file Excel:", err);
			alert("Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file!");
		} finally {
			setIsLoading(false);
		}
	};

	const processFile = (file: File) => {
		setIsLoading(true);
		const reader = new FileReader();

		reader.onload = (e) => {
			try {
				const data = e.target?.result;
				const workbook = XLSX.read(data, { type: "binary" });
				parseWorkbook(workbook, file.name);
			} catch (err) {
				console.error("Lỗi phân tích file Excel:", err);
				alert(
					"Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file!",
				);
				setIsLoading(false);
			}
		};

		reader.readAsBinaryString(file);
	};

	const handleNativeOpen = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (window.electronAPI?.openFileDialog) {
			try {
				setIsLoading(true);
				const res = await window.electronAPI.openFileDialog([
					{ name: "File Excel (*.xlsx, *.xls)", extensions: ["xlsx", "xls"] },
					{ name: "Tất cả các file", extensions: ["*"] },
				]);
				if (res && res.data) {
					const workbook = XLSX.read(res.data, { type: "base64" });
					parseWorkbook(workbook, res.fileName);
				} else {
					setIsLoading(false);
				}
			} catch (err) {
				console.error("Lỗi mở file native dialog:", err);
				alert("Không thể mở file qua hộp thoại Windows Explorer.");
				setIsLoading(false);
			}
		} else {
			fileInputRef.current?.click();
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			processFile(e.dataTransfer.files[0]);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files.length > 0) {
			processFile(e.target.files[0]);
		}
	};

	// Tạo và tải file Excel mẫu
	const downloadSampleTemplate = () => {
		const sampleData = [
			{
				STT: 1,
				"Mã hộ": "HK-TH1-010",
				Thôn: "Thôn 1",
				"Quan hệ": "Chủ hộ",
				"Họ và tên": "Nguyễn Văn Đạt",
				"Giới tính": "Nam",
				"Ngày sinh": "15/08/1982",
				"Dân tộc": "Kinh",
				"Tôn giáo": "Không",
				CCCD: "060082001122",
				"Địa chỉ": "Thôn 1, Xã Đăk Hà",
				"Ghi chú": "Hộ chuẩn mẫu",
			},
			{
				STT: 2,
				"Mã hộ": "HK-TH1-010",
				Thôn: "Thôn 1",
				"Quan hệ": "Vợ",
				"Họ và tên": "Trần Thị Thoa",
				"Giới tính": "Nữ",
				"Ngày sinh": "04/1985",
				"Dân tộc": "Kinh",
				"Tôn giáo": "Không",
				CCCD: "060185002233",
				"Địa chỉ": "Thôn 1, Xã Đăk Hà",
				"Ghi chú": "Ngày sinh chỉ có tháng/năm",
			},
			{
				STT: 3,
				"Mã hộ": "HK-TH2-020",
				Thôn: "Thôn 2",
				"Quan hệ": "Chủ hộ",
				"Họ và tên": "A Pháo",
				"Giới tính": "Nam",
				"Ngày sinh": "1970",
				"Dân tộc": "Xơ Đăng",
				"Tôn giáo": "Công giáo",
				CCCD: "060070003344",
				"Địa chỉ": "Thôn 2, Xã Đăk Hà",
				"Ghi chú": "Ngày sinh chỉ có năm",
			},
			{
				STT: 4,
				"Mã hộ": "HK-TH3-030",
				Thôn: "Thôn 3",
				"Quan hệ": "Chủ hộ",
				"Họ và tên": "Đinh Văn Lỗi 1",
				"Giới tính": "Nam",
				"Ngày sinh": "11/01/976", // Lỗi mẫu: năm sinh thiếu số
				"Dân tộc": "Giơ Lâng",
				"Tôn giáo": "Tin lành",
				CCCD: "060076004455",
				"Địa chỉ": "Thôn 3, Xã Đăk Hà",
				"Ghi chú": "Dòng thử nghiệm lỗi năm sinh thiếu số (976)",
			},
			{
				STT: 5,
				"Mã hộ": "HK-TH4-040",
				Thôn: "Thôn 4",
				"Quan hệ": "Chủ hộ",
				"Họ và tên": "Trần Thị Lỗi 2",
				"Giới tính": "Nữ",
				"Ngày sinh": "15/17/1989", // Lỗi mẫu: tháng 17 sai
				"Dân tộc": "Kinh",
				"Tôn giáo": "Không",
				CCCD: "060189005566",
				"Địa chỉ": "Thôn 4, Xã Đăk Hà",
				"Ghi chú": "Dòng thử nghiệm lỗi tháng 17",
			},
		];

		const ws = XLSX.utils.json_to_sheet(sampleData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Nhân hộ khẩu");
		XLSX.writeFile(wb, "Nhan_ho_khau_mau_Dak_Ha.xlsx");
	};

	return (
		<div className="space-y-4">
			<div
				onDragOver={(e) => e.preventDefault()}
				onDrop={handleDrop}
				onClick={() => fileInputRef.current?.click()}
				className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 transition-all rounded-2xl p-8 text-center cursor-pointer relative"
			>
				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileChange}
					accept=".xls,.xlsx"
					className="hidden"
				/>

				<div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
					<UploadCloud className="w-7 h-7" />
				</div>

				<h3 className="text-base font-bold text-slate-800">
					Kéo thả file Excel (`Nhân hộ khẩu.xls` / `.xlsx`) vào đây
				</h3>
				<p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
					Hệ thống sẽ tự động bóc tách từng dòng dữ liệu, đối soát ngày sinh,
					phát hiện lỗi định dạng và chuẩn hóa danh sách thành Sổ hộ khẩu.
				</p>

				{/* Nút bấm chọn file Native Dialog & Trình duyệt */}
				<div className="mt-5 mb-3 flex flex-wrap items-center justify-center gap-3">
					<button
						type="button"
						onClick={handleNativeOpen}
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer z-10"
					>
						<FolderOpen className="w-4 h-4" />
						<span>Chọn File từ Máy Tính (Native Dialog)</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							fileInputRef.current?.click();
						}}
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer z-10"
					>
						<UploadCloud className="w-4 h-4 text-emerald-600" />
						<span>Duyệt file trình duyệt</span>
					</button>
				</div>

				<div className="mt-2 flex flex-wrap items-center justify-center gap-2">
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs">
						<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
						Hỗ trợ file .xls & .xlsx
					</span>
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-white text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 shadow-2xs">
						Tự động phát hiện lỗi năm thiếu số & tháng sai
					</span>
				</div>

				{isLoading && (
					<div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 flex items-center justify-center rounded-2xl">
						<div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
							<span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
							<span>Đang bóc tách file Excel...</span>
						</div>
					</div>
				)}
			</div>

			{/* Thanh tải file mẫu & gợi ý */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200/80 text-xs">
				<div className="flex items-center gap-2 text-slate-600">
					<AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
					<span>
						Chưa có file dữ liệu chuẩn? Tải file mẫu có sẵn các ca hợp lệ và ca
						lỗi (ví dụ:{" "}
						<code className="text-rose-600 font-mono">11/01/976</code>,{" "}
						<code className="text-rose-600 font-mono">15/17/1989</code>) để đối
						soát thử nghiệm.
					</span>
				</div>
				<button
					onClick={downloadSampleTemplate}
					className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold transition-colors shrink-0"
				>
					<Download className="w-3.5 h-3.5 text-emerald-600" />
					<span>Tải file Excel mẫu</span>
				</button>
			</div>
		</div>
	);
};
