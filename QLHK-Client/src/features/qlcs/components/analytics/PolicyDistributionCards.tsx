import type React from "react";
import { Award, HeartHandshake, PieChart } from "lucide-react";
import { formatNumber, formatPct, type PolicyDashboardData } from "@/components/analytics/policyAnalyticsData";
import { DistributionCard } from "@/components/analytics/DistributionCard";
import { PolicyCompositeCard } from "@/components/analytics/PolicyCompositeCard";
import { PolicyGenderBar } from "./PolicyGenderBar";

export interface PolicyDistributionCardsProps {
	policyData: PolicyDashboardData;
}

export const PolicyDistributionCards: React.FC<PolicyDistributionCardsProps> = ({ policyData }) => {
	return (
		<section
			aria-label="Phân tích dữ liệu chính sách và an sinh xã hội"
			className="grid grid-cols-1 gap-3 lg:grid-cols-2"
		>
			<DistributionCard
				icon={<Award className="size-4" />}
				title="Cơ Cấu Độ Tuổi Chúc Thọ"
				badge="8 mốc chúc thọ"
				segments={policyData.chucThoSegments}
				centerValue={`${formatNumber(policyData.chucThoTotal)} Cụ`}
				centerLabel="Tổng cụ chúc thọ"
				unit="cụ"
			/>

			<DistributionCard
				icon={<HeartHandshake className="size-4" />}
				title="Phân Nhóm Đối Tượng Hỗ Trợ Xã Hội"
				badge="5 nhóm diện chính sách"
				segments={policyData.htxhSegments}
				centerValue={`${formatNumber(policyData.htxhTotal)} Hồ sơ`}
				centerLabel="Hồ sơ hưởng trợ cấp"
				unit="người"
			/>

			<DistributionCard
				icon={<PieChart className="size-4" />}
				title="Cơ Cấu Dân Tộc & Giới Tính"
				badge={`Tỷ lệ DTTS ${formatPct(policyData.village.dttsPct)}%`}
				segments={policyData.ethnicSegments}
				centerValue={`${formatPct(policyData.village.dttsPct)}%`}
				centerLabel="Tỷ lệ DTTS"
				extraRightContent={
					<PolicyGenderBar
						maleCount={policyData.genderRatio.maleCount}
						malePct={policyData.genderRatio.malePct}
						femaleCount={policyData.genderRatio.femaleCount}
						femalePct={policyData.genderRatio.femalePct}
					/>
				}
			/>

			<PolicyCompositeCard data={policyData} />
		</section>
	);
};
