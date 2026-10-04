import type { RelationshipType, Village } from "../types";

export const COMMUNE_NAME = "Xã Đăk Hà";
export const DISTRICT_NAME = "Huyện Đăk Hà";
export const PROVINCE_NAME = "Tỉnh Kon Tum";

export const VILLAGES: Village[] = [
	{
		id: "5769de47-c24c-476e-9620-cd741c40fcee",
		name: "Thôn 1",
		short_code: "TH1",
	},
	{
		id: "391ad3d8-f3c2-49ab-9849-3b6f1601a967",
		name: "Thôn 2",
		short_code: "TH2",
	},
	{
		id: "a1d39732-8e5f-4a07-83fd-ba0005639676",
		name: "Thôn 3",
		short_code: "TH3",
	},
	{
		id: "1b160cfb-90e9-4980-9926-a89f6c20ac38",
		name: "Thôn 4",
		short_code: "TH4",
	},
	{
		id: "132d38d1-5132-4641-a348-7d7641ce3528",
		name: "Thôn 5",
		short_code: "TH5",
	},
	{
		id: "66619f9d-e65e-4d42-9da7-e44299a0ba97",
		name: "Thôn Kon Đao Yôp",
		short_code: "KDY",
	},
	{
		id: "bd4bc94c-4566-429b-a360-ad67107a6a91",
		name: "Làng Kon Hnông Bách",
		short_code: "KHB",
	},
];

// Đúng chuẩn 14 Dân tộc Xã Đăk Hà:
// Cor, Cơ Ho, Dao, Dìu, Ê Đê, Gia Rai, Xơ Đăng, Giẻ Triêng, Giơ Lâng, Ha Lăng, Hoa, Hrê, Khách Gia, Kinh
export const ETHNIC_GROUPS = [
	"Kinh",
	"Xơ Đăng",
	"Gia Rai",
	"Giẻ Triêng",
	"Cor",
	"Cơ Ho",
	"Dao",
	"Dìu",
	"Ê Đê",
	"Giơ Lâng",
	"Ha Lăng",
	"Hoa",
	"Hrê",
	"Khách Gia",
] as const;

export const DAKHA_ETHNICITIES = ETHNIC_GROUPS;

export const MINORITY_ETHNIC_GROUPS = [
	"Cor",
	"Cơ Ho",
	"Dao",
	"Dìu",
	"Ê Đê",
	"Gia Rai",
	"Xơ Đăng",
	"Giẻ Triêng",
	"Giơ Lâng",
	"Ha Lăng",
	"Hoa",
	"Hrê",
	"Khách Gia",
];

export const RELIGIONS = [
	"Không",
	"Công giáo",
	"Tin lành",
	"Phật giáo",
	"Khác",
] as const;

export const RELATIONSHIPS: RelationshipType[] = [
	"Chủ hộ",
	"Thành viên",
	"Vợ",
	"Chồng",
	"Con đẻ",
	"Con dâu",
	"Con rể",
	"Cháu",
	"Bố",
	"Mẹ",
	"Ông",
	"Bà",
	"Anh",
	"Chị",
	"Em",
	"Khác",
];
