import * as XLSX from "xlsx";
import type { ExcelHeaderExtractionResult } from "./policyExcelTypes";
import { normalizeColumnKey } from "./policyExcelTypes";

export async function extractExcelHeaders(
	file: File,
): Promise<ExcelHeaderExtractionResult> {
	const buffer = await file.arrayBuffer();
	const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });

	if (workbook.SheetNames.length === 0) {
		throw new Error("File Excel không có bất kỳ sheet nào.");
	}

	const sheetName = workbook.SheetNames[0];
	const sheet = workbook.Sheets[sheetName];
	const rawRowsAOA = XLSX.utils.sheet_to_json<any[]>(sheet, {
		header: 1,
		defval: "",
	});

	if (!rawRowsAOA || rawRowsAOA.length === 0) {
		throw new Error("File Excel rỗng, không có dữ liệu.");
	}

	let headerRowIdx = -1;
	for (let i = 0; i < Math.min(25, rawRowsAOA.length); i++) {
		const rowStr = rawRowsAOA[i]
			.map((c) => normalizeColumnKey(String(c || "")))
			.join(" ");

		if (
			(rowStr.includes("ho va ten") ||
				rowStr.includes("ho ten") ||
				rowStr.includes("nguoi cao tuoi") ||
				rowStr.includes("doi tuong")) &&
			(rowStr.includes("stt") ||
				rowStr.includes("nam sinh") ||
				rowStr.includes("ngay sinh") ||
				rowStr.includes("cccd") ||
				rowStr.includes("nam"))
		) {
			headerRowIdx = i;
			break;
		}
	}

	if (headerRowIdx === -1) {
		for (let i = 0; i < Math.min(15, rawRowsAOA.length); i++) {
			const nonEmptyCols = rawRowsAOA[i].filter((c) =>
				String(c || "").trim(),
			).length;
			if (nonEmptyCols >= 4) {
				headerRowIdx = i;
				break;
			}
		}
	}

	if (headerRowIdx === -1) {
		throw new Error(
			"Không nhận diện được dòng tiêu đề cột hợp lệ trong file Excel.",
		);
	}

	let hasSubHeader = false;
	let dataStartIdx = headerRowIdx + 1;

	if (headerRowIdx + 1 < rawRowsAOA.length) {
		const nextRow = rawRowsAOA[headerRowIdx + 1];
		const nextRowNorm = nextRow
			.map((c) => normalizeColumnKey(String(c || "")))
			.join(" ");

		if (
			nextRowNorm.includes("bao tro") ||
			nextRowNorm.includes("huu tri") ||
			nextRowNorm.includes("nguoi co cong") ||
			nextRowNorm.includes("huu tuat") ||
			nextRowNorm.includes("tron 60") ||
			nextRowNorm.includes("tron 70") ||
			nextRowNorm.includes("nam") ||
			nextRowNorm.includes("nu")
		) {
			hasSubHeader = true;
			dataStartIdx = headerRowIdx + 2;
		}
	}

	const headerRow1 = rawRowsAOA[headerRowIdx] || [];
	const headerRow2 = hasSubHeader ? rawRowsAOA[headerRowIdx + 1] || [] : [];
	const maxCols = Math.max(headerRow1.length, headerRow2.length);

	let currentParentCategory = "";
	const rawHeaderList: string[] = [];

	for (let c = 0; c < maxCols; c++) {
		const val1 = String(headerRow1[c] || "").trim();
		const val2 = hasSubHeader ? String(headerRow2[c] || "").trim() : "";

		if (val1) {
			currentParentCategory = val1;
		}

		let combinedHeader = "";
		if (hasSubHeader) {
			if (val2 && currentParentCategory && currentParentCategory !== val2) {
				combinedHeader = `${currentParentCategory} - ${val2}`.trim();
			} else if (val2) {
				combinedHeader = val2;
			} else if (val1) {
				combinedHeader = val1;
			}
		} else {
			combinedHeader = val1;
		}

		if (!combinedHeader) {
			combinedHeader = `Cột ${c + 1}`;
		}

		rawHeaderList.push(combinedHeader);
	}

	while (
		rawHeaderList.length > 0 &&
		/^Cột \d+$/.test(rawHeaderList[rawHeaderList.length - 1])
	) {
		const lastColIdx = rawHeaderList.length - 1;
		const hasAnyData = rawRowsAOA
			.slice(dataStartIdx)
			.some((r) => String(r[lastColIdx] || "").trim() !== "");
		if (!hasAnyData) {
			rawHeaderList.pop();
		} else {
			break;
		}
	}

	const seenHeaderCounts = new Map<string, number>();
	const headers: string[] = rawHeaderList.map((h) => {
		const clean = h.trim() || "Cột";
		const count = seenHeaderCounts.get(clean) || 0;
		seenHeaderCounts.set(clean, count + 1);
		return count === 0 ? clean : `${clean} (${count + 1})`;
	});

	const rawRows: Record<string, any>[] = [];
	for (let r = dataStartIdx; r < rawRowsAOA.length; r++) {
		const rowAOA = rawRowsAOA[r];
		if (!rowAOA || rowAOA.length === 0) continue;

		const isRowEmpty = rowAOA.every((c) => String(c || "").trim() === "");
		if (isRowEmpty) continue;

		const rowObj: Record<string, any> = { _rowIndex: r + 1 };
		headers.forEach((h, colIdx) => {
			const cellVal = rowAOA[colIdx];
			rowObj[h] = cellVal !== undefined ? cellVal : "";
		});

		rawRows.push(rowObj);
	}

	let detectedType: "chuctho" | "htxh" | undefined;
	const fullTextNorm = normalizeColumnKey(
		`${sheetName} ${headers.join(" ")} ${JSON.stringify(rawRows.slice(0, 5))}`,
	);
	if (
		fullTextNorm.includes("chuc tho") ||
		fullTextNorm.includes("tron 70") ||
		fullTextNorm.includes("tron 80") ||
		fullTextNorm.includes("tron 90")
	) {
		detectedType = "chuctho";
	} else if (
		fullTextNorm.includes("huu tri") ||
		fullTextNorm.includes("bao tro") ||
		fullTextNorm.includes("75 tro len") ||
		fullTextNorm.includes("htxh")
	) {
		detectedType = "htxh";
	}

	return {
		headers,
		rawRows,
		sampleRows: rawRows.slice(0, 5),
		detectedType,
		headerRowIndex: headerRowIdx,
		hasSubHeader,
	};
}

