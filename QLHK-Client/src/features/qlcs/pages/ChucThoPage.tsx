import type React from "react";
import Dashboard from "./DashboardPage";
import { ModalProvider } from "@/hooks/useModal";
import { ToastProvider } from "@/hooks/useToast";

interface ChucThoPageProps {
	isGlobal?: boolean;
}

export const ChucThoPage: React.FC<ChucThoPageProps> = ({ isGlobal }) => {
	return (
		<ModalProvider>
			<ToastProvider>
				<Dashboard tabOverride="chuctho" isGlobal={isGlobal} />
			</ToastProvider>
		</ModalProvider>
	);
};

export default ChucThoPage;
