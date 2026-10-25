export interface HouseholdSystemField {
	key: string;
	label: string;
	required?: boolean;
	description: string;
	aliases: string[];
}

export const HOUSEHOLD_SYSTEM_FIELDS: readonly HouseholdSystemField[] = [
	{
		key: "fullName",
		label: "Họ và tên",
		required: true,
		description: "Họ và tên đầy đủ của nhân khẩu",
		aliases: ["ho va ten", "ho ten", "ho va ten nhan khau", "ho ten khai sinh", "ho va ten cong dan", "ho va ten chu ho", "ho va ten thanh vien", "ten"],
	},
	{
		key: "dob",
		label: "Ngày sinh / Năm sinh",
		required: true,
		description: "Ngày tháng năm sinh (DD/MM/YYYY hoặc YYYY)",
		aliases: ["ngay sinh", "nam sinh", "ngay thang nam sinh", "ngay sinh nam sinh", "ntns", "ngay thang nam", "nam sinh nu", "nam sinh nam", "sinh ngay"],
	},
	{
		key: "stt",
		label: "Số thứ tự",
		description: "Số thứ tự dòng trong biểu mẫu",
		aliases: ["stt", "so thu tu", "tt", "thu tu", "so tt", "no"],
	},
	{
		key: "code",
		label: "Mã hộ gia đình",
		description: "Mã sổ hộ khẩu hoặc mã định danh hộ",
		aliases: ["ma ho", "so ho", "so so ho khau", "so so", "ma so ho", "so ho khau", "ma dinh danh ho", "so shk", "shk"],
	},
	{
		key: "household_head",
		label: "Chủ hộ / Thành viên",
		description: "Chỉ định vai trò chủ hộ",
		aliases: ["chu ho", "la chu ho", "chu ho thanh vien", "vai tro"],
	},
	{
		key: "relationship",
		label: "Quan hệ với chủ hộ",
		description: "Mối quan hệ với chủ hộ gia đình",
		aliases: ["quan he voi chu ho", "quan he", "qh voi chu ho", "moi quan he", "quan he chu ho", "quan he gia dinh"],
	},
	{
		key: "gender",
		label: "Giới tính",
		description: "Giới tính nhân khẩu (Nam / Nữ)",
		aliases: ["gioi tinh", "nam", "nu", "nam nu", "gioi"],
	},
	{
		key: "ethnicity",
		label: "Dân tộc",
		description: "Thành phần dân tộc (Kinh, Xơ Đăng, Ba Na...)",
		aliases: ["dan toc", "thanh phan dan toc", "dan toc ton giao"],
	},
	{
		key: "religion",
		label: "Tôn giáo",
		description: "Tôn giáo hoặc tín ngưỡng",
		aliases: ["ton giao", "dao", "ton giao tin nguong"],
	},
	{
		key: "cccd",
		label: "Số CCCD / CMND",
		description: "Số định danh cá nhân hoặc CMND (9 hoặc 12 số)",
		aliases: ["so cccd", "cccd", "cmnd", "so cmnd", "can cuoc cong dan", "so dinh danh", "dinh danh", "so dinh danh ca nhan", "dinh danh ca nhan", "so cccd dinh danh", "the cccd"],
	},
	{
		key: "address",
		label: "Địa chỉ / Thôn",
		description: "Nơi thường trú hoặc thôn làng",
		aliases: ["dia chi", "noi thuong tru", "thuong tru", "ho khau thuong tru", "hktt", "noi o hien tai", "cho o hien nay", "dia chi thuong tru", "thon", "lang"],
	},
	{
		key: "notes",
		label: "Ghi chú",
		description: "Ghi chú và thông tin bổ sung",
		aliases: ["ghi chu", "chu thich", "ghi chu khac", "thong tin bo sung"],
	},
];
