import React from "react";
import Dashboard from "./DashboardPage";
import { ModalProvider } from "@/hooks/useModal";
import { ToastProvider } from "@/hooks/useToast";

export const HtxhPage: React.FC = () => {
	return (
		<ModalProvider>
			<ToastProvider>
				<Dashboard tabOverride="htxh" />
			</ToastProvider>
		</ModalProvider>
	);
};

export default HtxhPage;
