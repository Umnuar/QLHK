import * as XLSX from "xlsx";

export const exportDeletedExcelClient = async (
	profiles: any[],
	tab: "chuctho" | "htxh",
): Promise<{ success: boolean; fileName?: string; error?: string }> => {
	try {
		const headers = [
			"TT",
			"Họ và tên",
			"Năm sinh",
			"CCCD",
			"Giới tính",
			"Dân tộc",
			"Cư trú",
			"Nơi ở hiện nay",
			"Thời gian xóa",
			"Lý do",
		];

		const data = [
			[
				`DANH SÁCH HỒ SƠ ĐÃ XÓA (${tab === "chuctho" ? "CHÚC THỌ" : "HƯU TRÍ XÃ HỘI"})`,
			],
			[],
			headers,
		];

		profiles.forEach((p, idx) => {
			data.push([
				idx + 1,
				p.name || "",
				p.dob || p.birth_year || "",
				p.cccd || "",
				p.gender || "",
				p.ethnicity || "",
				p.residence || "",
				p.currentAddress || p.current_address || "",
				p.deleted_at ? new Date(p.deleted_at).toLocaleString("vi-VN") : "",
				p.delete_reason || p.notes || "",
			]);
		});

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
		ws["!cols"] = [
			{ wch: 5 },
			{ wch: 25 },
			{ wch: 12 },
			{ wch: 18 },
			{ wch: 8 },
			{ wch: 12 },
			{ wch: 20 },
			{ wch: 25 },
			{ wch: 22 },
			{ wch: 25 },
		];

		const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
		for (let R = range.s.r; R <= range.e.r; ++R) {
			for (let C = range.s.c; C <= range.e.c; ++C) {
				const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
				if (!ws[cellRef]) continue;
				const isTitle = R === 0;
				const isHeader = R === 2;
				ws[cellRef].s = {
					font: {
						name: "Times New Roman",
						sz: isTitle ? 14 : 11,
						bold: isTitle || isHeader,
					},
					alignment: {
						vertical: "center",
						horizontal: isTitle || isHeader ? "center" : "left",
					},
					border:
						R >= 2
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
		XLSX.utils.book_append_sheet(wb, ws, "Thung_Rac");
		const fileName = `Danh_Sach_Da_Xoa_${tab}_${new Date().toISOString().slice(0, 10)}.xlsx`;
		XLSX.writeFile(wb, fileName);
		return { success: true, fileName };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
};
