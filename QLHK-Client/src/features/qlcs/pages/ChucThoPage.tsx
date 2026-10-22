import React from "react";
import Dashboard from "./DashboardPage";
import { ModalProvider } from "@/hooks/useModal";
import { ToastProvider } from "@/hooks/useToast";

export const ChucThoPage: React.FC = () => {
	return (
		<ModalProvider>
			<ToastProvider>
				<Dashboard tabOverride="chuctho" />
			</ToastProvider>
		</ModalProvider>
	);
};

export default ChucThoPage;
