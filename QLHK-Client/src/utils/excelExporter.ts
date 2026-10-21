import * as XLSX from "xlsx";

export interface ExportParams {
	filteredProfiles: any[];
	activeTab: "chuctho" | "htxh";
	isGlobal?: boolean;
	villages?: { id: number | string; name: string }[];
}

export const exportExcelClient = async (
	params: ExportParams,
): Promise<{ success: boolean; fileName?: string; error?: string }> => {
	const {
		filteredProfiles,
		activeTab,
		isGlobal = false,
		villages = [],
	} = params;

	if (!filteredProfiles || filteredProfiles.length === 0) {
		return { success: false, error: "Không có hồ sơ nào phù hợp để xuất." };
	}

	try {
		let exportData: any[][] = [];

		const getVillageName = (id: number | string) => {
			if (!villages || villages.length === 0) return "";
			const v = villages.find((item: any) => String(item.id) === String(id));
			return v ? v.name : "";
		};

		if (activeTab === "chuctho") {
			const headers = [
				"TT", ...(isGlobal ? ["Thôn/Bảng"] : []), "Họ và tên", "Năm sinh", "Nam", "Nữ", "Số CCCD", "Dân tộc", "Cư trú", "Nơi ở hiện nay",
				"Tròn 60 tuổi", "Tròn 65 tuổi", "Tròn 70 tuổi", "Tròn 75 tuổi", "Tròn 80 tuổi", "Tròn 85 tuổi", "Tròn 90 tuổi", "Tròn 95 tuổi", "Tròn 100 tuổi", "Trên 100 tuổi", "Ghi chú", "Đã nhận quà",
			];

			exportData = [
				["DANH SÁCH NGƯỜI CAO TUỔI ĐỦ TUỔI CHÚC THỌ, MỪNG THỌ"],
				[],
				headers,
			];

			filteredProfiles.forEach((p: any, index: number) => {
				exportData.push([
					(index + 1).toString(),
					...(isGlobal ? [getVillageName(p.village_id || p.villageId)] : []),
					p.name,
					p.dob || p.birth_year,
					p.gender === "Nam" ? "x" : "",
					p.gender === "Nữ" ? "x" : "",
					p.cccd,
					p.ethnicity,
					p.residence,
					p.currentAddress || p.current_address,
					p.age60 ? "x" : "", p.age65 ? "x" : "", p.age70 ? "x" : "", p.age75 ? "x" : "", p.age80 ? "x" : "",
					p.age85 ? "x" : "", p.age90 ? "x" : "", p.age95 ? "x" : "", p.age100 ? "x" : "", p.ageOver100 || p.age_over_100 ? "x" : "",
					p.notes || "",
					p.received ? "Đã nhận" : "Chưa nhận",
				]);
			});
		} else {
			const headers1 = [
				"TT", ...(isGlobal ? ["Thôn/Bảng"] : []), "Họ và tên", "Năm sinh", "Nam", "Nữ", "Số CCCD", "Dân tộc", "Cư trú", "Nơi ở hiện nay",
				"Đối tượng đủ 75 tuổi trở lên", "Đối tượng từ 70-74 tuổi thuộc hộ nghèo, cận nghèo",
				"Đang hưởng chế độ chính sách", "", "", "", "Ghi chú", "Đã nhận quà",
			];

			const headers2 = [
				"", ...(isGlobal ? [""] : []), "", "", "", "", "", "", "", "", "", "",
				"Bảo trợ", "Hưu trí", "Hưu, Tuất Bảo hiểm", "Người có công", "", "",
			];

			exportData = [
				["DANH SÁCH ĐẾN TUỔI HƯỞNG HƯU TRÍ XÃ HỘI HÀNG NĂM"],
				[],
				headers1,
				headers2,
			];

			filteredProfiles.forEach((p: any, index: number) => {
				exportData.push([
					(index + 1).toString(),
					...(isGlobal ? [getVillageName(p.village_id || p.villageId)] : []),
					p.name,
					p.dob || p.birth_year,
					p.gender === "Nam" ? "x" : "",
					p.gender === "Nữ" ? "x" : "",
					p.cccd,
					p.ethnicity,
					p.residence,
					p.currentAddress || p.current_address,
					p.age75plus || p.age_75_plus ? "x" : "",
					p.age70to74poor || p.age_70_74_poor ? "x" : "",
					p.baoTro || p.bao_tro ? "x" : "",
					p.huuTri || p.huu_tri ? "x" : "",
					p.huuTuatBaoHiem || p.huu_tuat_bao_hiem ? "x" : "",
					p.nguoiCoCong || p.nguoi_co_cong ? "x" : "",
					p.notes || "",
					p.received ? "Đã nhận" : "Chưa nhận",
				]);
			});
		}

		const ws = XLSX.utils.aoa_to_sheet(exportData);
		const shift = isGlobal ? 1 : 0;

		if (!ws["!merges"]) ws["!merges"] = [];

		if (activeTab === "htxh") {
			ws["!merges"].push(
				{ s: { r: 2, c: 0 }, e: { r: 3, c: 0 } }, ...(isGlobal ? [{ s: { r: 2, c: 1 }, e: { r: 3, c: 1 } }] : []),
				{ s: { r: 2, c: 1 + shift }, e: { r: 3, c: 1 + shift } }, { s: { r: 2, c: 2 + shift }, e: { r: 3, c: 2 + shift } },
				{ s: { r: 2, c: 3 + shift }, e: { r: 3, c: 3 + shift } }, { s: { r: 2, c: 4 + shift }, e: { r: 3, c: 4 + shift } },
				{ s: { r: 2, c: 5 + shift }, e: { r: 3, c: 5 + shift } }, { s: { r: 2, c: 6 + shift }, e: { r: 3, c: 6 + shift } },
				{ s: { r: 2, c: 7 + shift }, e: { r: 3, c: 7 + shift } }, { s: { r: 2, c: 8 + shift }, e: { r: 3, c: 8 + shift } },
				{ s: { r: 2, c: 9 + shift }, e: { r: 3, c: 9 + shift } }, { s: { r: 2, c: 10 + shift }, e: { r: 3, c: 10 + shift } },
				{ s: { r: 2, c: 11 + shift }, e: { r: 2, c: 14 + shift } }, { s: { r: 2, c: 15 + shift }, e: { r: 3, c: 15 + shift } },
				{ s: { r: 2, c: 16 + shift }, e: { r: 3, c: 16 + shift } }, { s: { r: 0, c: 0 }, e: { r: 0, c: 16 + shift } },
			);

			ws["!cols"] = [
				{ wch: 5 }, ...(isGlobal ? [{ wch: 22 }] : []), { wch: 40 }, { wch: 12 }, { wch: 6 }, { wch: 6 },
				{ wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 25 }, { wch: 18 }, { wch: 22 }, { wch: 12 }, { wch: 12 },
				{ wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 15 },
			];
		} else {
			ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 20 + shift } });

			ws["!cols"] = [
				{ wch: 5 }, ...(isGlobal ? [{ wch: 22 }] : []), { wch: 40 }, { wch: 12 }, { wch: 6 }, { wch: 6 },
				{ wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
				{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 15 },
			];
		}

		const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
		for (let R = range.s.r; R <= range.e.r; ++R) {
			for (let C = range.s.c; C <= range.e.c; ++C) {
				const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
				if (!ws[cellRef]) continue;

				const isTitle = R === 0;
				const isHeader = R < (activeTab === "chuctho" ? 3 : 4) && R > 0;

				ws[cellRef].s = {
					font: {
						name: "Times New Roman",
						sz: isTitle ? 16 : 12,
						bold: isTitle || isHeader,
					},
					alignment: {
						vertical: "center",
						horizontal: isTitle
							? "center"
							: C === 0 || isHeader || C > (isGlobal ? 3 : 2)
								? "center"
								: "left",
						wrapText: isTitle,
					},
					border:
						R > 1
							? {
									top: { style: "thin" },
									bottom: { style: "thin" },
									left: { style: "thin" },
									right: { style: "thin" },
								}
							: {},
				};
			}
		}

		const wb = XLSX.utils.book_new();
		const sheetName = activeTab === "chuctho" ? "DS CHÚC THỌ" : "DS HTXH";
		XLSX.utils.book_append_sheet(wb, ws, sheetName);

		const defaultFileName =
			activeTab === "chuctho"
				? `Danh_Sach_Chuc_Tho_${isGlobal ? "Chung" : "Thon"}_${new Date().toISOString().slice(0, 10)}.xlsx`
				: `Danh_Sach_Huu_Tri_XH_${isGlobal ? "Chung" : "Thon"}_${new Date().toISOString().slice(0, 10)}.xlsx`;

		XLSX.writeFile(wb, defaultFileName);
		return { success: true, fileName: defaultFileName };
	} catch (err: any) {
		console.error("Error exporting excel client:", err);
		return { success: false, error: err.message };
	}
};

export { exportDeletedExcelClient } from "./excelExporterDeleted";
export { downloadTemplateClient } from "./excelExporterTemplates";
