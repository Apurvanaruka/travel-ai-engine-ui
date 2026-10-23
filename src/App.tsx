import { BrowserRouter, Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { StoreProvider, useStore } from "./hooks/useStore";
import { ComposerDock } from "./components/layout/ComposerDock";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { AuthPage } from "./pages/AuthPage";
import { ChatPage } from "./pages/ChatPage";
import { CheckoutPage } from "./pages/CheckoutPage";

/* Public layout - for the login and registration pages */
function PublicLayout() {
  return <Outlet />;
}

/* Private layout - requires authentication */
function PrivateLayout() {
  const { loggedIn, view } = useStore();
  if (!loggedIn) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-night text-txt">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto bg-night text-txt">
          <TopBar />
          <div className="px-6 pb-8 pt-2">
            <Outlet />
          </div>
        </main>
        {/* Composer dock at layout level - spans from the sidebar edge to the right */}
        {(view === "chat" || view === "home") && <ComposerDock />}
      </div>
    </div>
  );
}

/* Legacy /chat/:id deep link -> /?conversation=id */
function ChatRedirect() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const target = conversationId ? `/?conversation=${encodeURIComponent(conversationId)}` : "/";
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            {/* Common misspelling of /register - keep old links working. */}
            <Route path="/registor" element={<Navigate to="/register" replace />} />
          </Route>

          {/* Protected routes with sidebar/topbar */}
          <Route element={<PrivateLayout />}>
            <Route path="/" element={<ChatPage />} />
            <Route path="/chat" element={<Navigate to="/" replace />} />
            <Route path="/chat/:conversationId" element={<ChatRedirect />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/booking" element={<CheckoutPage />} />
          </Route>

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
