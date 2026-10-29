import type React from "react";
import Dashboard from "./DashboardPage";
import { ModalProvider } from "@/hooks/useModal";
import { ToastProvider } from "@/hooks/useToast";

interface HtxhPageProps {
	isGlobal?: boolean;
}

export const HtxhPage: React.FC<HtxhPageProps> = ({ isGlobal }) => {
	return (
		<ModalProvider>
			<ToastProvider>
				<Dashboard tabOverride="htxh" isGlobal={isGlobal} />
			</ToastProvider>
		</ModalProvider>
	);
};

export default HtxhPage;
