import * as XLSX from "xlsx";

export const downloadTemplateClient = async (
	type: "cth" | "htxh",
): Promise<{ success: boolean; fileName?: string; error?: string }> => {
	try {
		let ws: any;
		let exportData: any[][];

		if (type === "cth") {
			const headers = [
				"TT", "Họ và tên", "Năm sinh", "Nam", "Nữ", "Số CCCD", "Dân tộc", "Cư trú", "Nơi ở hiện nay",
				"Tròn 60 tuổi", "Tròn 65 tuổi", "Tròn 70 tuổi", "Tròn 75 tuổi", "Tròn 80 tuổi", "Tròn 85 tuổi",
				"Tròn 90 tuổi", "Tròn 95 tuổi", "Tròn 100 tuổi", "Trên 100 tuổi", "Ghi chú", "Đã nhận quà"
			];
			exportData = [
				["DANH SÁCH MẪU: CHÚC THỌ, MỪNG THỌ"],
				[],
				headers,
				[
					1,
					"Nguyễn Văn A",
					"01/01/1950",
					"x",
					"",
					"012345678912",
					"Kinh",
					"Hà Nội",
					"Hà Nội",
					"",
					"",
					"x",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"Mẫu giả định",
					"",
				],
				[
					2,
					"Trần Thị B",
					"1960",
					"",
					"x",
					"",
					"Kinh",
					"Hà Nội",
					"Hà Nội",
					"x",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"",
					"Mẫu giả định",
					"",
				],
			];
			ws = XLSX.utils.aoa_to_sheet(exportData);
			ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 20 } }];
			ws["!cols"] = [
				{ wch: 5 }, { wch: 20 }, { wch: 10 }, { wch: 5 }, { wch: 5 }, { wch: 15 }, { wch: 10 },
				{ wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
				{ wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 },
			];
		} else {
			const headers1 = [
				"TT", "Họ và tên", "Năm sinh", "Nam", "Nữ", "Số CCCD", "Dân tộc", "Cư trú", "Nơi ở hiện nay",
				"Đối tượng đủ 75 tuổi trở lên", "Đối tượng từ 70-74 tuổi thuộc hộ nghèo, cận nghèo",
				"Đang hưởng chế độ chính sách", "", "", "", "Ghi chú", "Đã nhận quà"
			];
			const headers2 = [
				"", "", "", "", "", "", "", "", "", "", "",
				"Bảo trợ", "Hưu trí", "Hưu, Tuất Bảo hiểm", "Người có công", "", ""
			];
			exportData = [
				["DANH SÁCH MẪU: HƯU TRÍ XÃ HỘI"],
				[],
				headers1,
				headers2,
				[
					1,
					"Lê Văn C",
					"1940",
					"x",
					"",
					"012345678913",
					"Kinh",
					"Hà Nội",
					"Hà Nội",
					"x",
					"",
					"x",
					"",
					"",
					"",
					"Mẫu giả định",
					"",
				],
				[
					2,
					"Phạm Thị D",
					"1952",
					"",
					"x",
					"",
					"Kinh",
					"Hà Nội",
					"Hà Nội",
					"",
					"x",
					"",
					"",
					"",
					"",
					"Mẫu giả định",
					"",
				],
			];
			ws = XLSX.utils.aoa_to_sheet(exportData);
			ws["!merges"] = [
				{ s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
				{ s: { r: 2, c: 1 }, e: { r: 3, c: 1 } },
				{ s: { r: 2, c: 2 }, e: { r: 3, c: 2 } },
				{ s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
				{ s: { r: 2, c: 4 }, e: { r: 3, c: 4 } },
				{ s: { r: 2, c: 5 }, e: { r: 3, c: 5 } },
				{ s: { r: 2, c: 6 }, e: { r: 3, c: 6 } },
				{ s: { r: 2, c: 7 }, e: { r: 3, c: 7 } },
				{ s: { r: 2, c: 8 }, e: { r: 3, c: 8 } },
				{ s: { r: 2, c: 9 }, e: { r: 3, c: 9 } },
				{ s: { r: 2, c: 10 }, e: { r: 3, c: 10 } },
				{ s: { r: 2, c: 11 }, e: { r: 2, c: 14 } },
				{ s: { r: 2, c: 15 }, e: { r: 3, c: 15 } },
				{ s: { r: 2, c: 16 }, e: { r: 3, c: 16 } },
				{ s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
			];
			ws["!cols"] = [
				{ wch: 5 }, { wch: 20 }, { wch: 10 }, { wch: 5 }, { wch: 5 }, { wch: 15 }, { wch: 10 },
				{ wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
				{ wch: 15 }, { wch: 15 }, { wch: 15 },
			];
		}

		const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
		for (let R = range.s.r; R <= range.e.r; ++R) {
			for (let C = range.s.c; C <= range.e.c; ++C) {
				const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
				if (!ws[cellRef]) continue;
				const isTitle = R === 0;
				const isHeader = R < (type === "cth" ? 3 : 4) && R > 0;
				ws[cellRef].s = {
					font: {
						name: "Times New Roman",
						sz: isTitle ? 16 : 12,
						bold: isTitle || isHeader,
					},
					alignment: {
						vertical: "center",
						horizontal: isTitle || C === 0 || isHeader || C > 2 ? "center" : "left",
						wrapText: isTitle,
					},
					border: R > 1 ? {
						top: { style: "thin" },
						bottom: { style: "thin" },
						left: { style: "thin" },
						right: { style: "thin" },
					} : {},
				};
			}
		}

		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Mau_Data");
		const fileName = type === "cth" ? "File_Mau_Chuc_Tho.xlsx" : "File_Mau_Huu_Tri_XH.xlsx";
		XLSX.writeFile(wb, fileName);
		return { success: true, fileName };
	} catch (err: any) {
		return { success: false, error: err.message };
	}
};
