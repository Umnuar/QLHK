import type React from "react";
import { HouseholdDrawer, type HouseholdDrawerProps } from "./HouseholdDrawer";

export type HouseholdModalProps = HouseholdDrawerProps;

/**
 * HouseholdModal - Wrapper tương thích ngược chuyển đổi toàn bộ sang kiến trúc Slide-over Drawer
 */
export const HouseholdModal: React.FC<HouseholdModalProps> = (props) => {
	return <HouseholdDrawer {...props} />;
};

export default HouseholdModal;
