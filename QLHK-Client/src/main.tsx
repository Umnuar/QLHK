import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AppProvider } from "./AppContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { HouseholdProvider } from "./context/HouseholdContext";
import { NetworkProvider } from "./context/NetworkContext";
import { ModalProvider } from "./hooks/useModal";
import { ToastProvider } from "./hooks/useToast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ErrorBoundary>
			<HouseholdProvider>
				<AppProvider>
					<NetworkProvider>
						<ModalProvider>
							<ToastProvider>
								<App />
							</ToastProvider>
						</ModalProvider>
					</NetworkProvider>
				</AppProvider>
			</HouseholdProvider>
		</ErrorBoundary>
	</React.StrictMode>,
);
