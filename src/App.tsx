import { StoreProvider, useStore } from "./state/store";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { ComposerDock } from "./components/ComposerDock";
import { LoginView } from "./components/LoginView";
import { ChatView } from "./components/ChatView";
import { CheckoutView } from "./components/CheckoutView";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useParams } from "react-router-dom";

/* Public layout - for login page */
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
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto bg-night text-txt">
          <TopBar />
          <div className="pt-2 pb-8 px-6">
            <Outlet />
          </div>
        </main>
        {/* Composer dock at layout level - automatically spans from sidebar edge to right */}
        {(view === "chat" || view === "home") && <ComposerDock />}
      </div>
    </div>
  );
}


/* Chat page - conversation view */
function ChatPage() {
  return <ChatView />;
}

/* Legacy /chat/:id deep link -> /?conversation=id */
function ChatRedirect() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const target = conversationId
    ? `/?conversation=${encodeURIComponent(conversationId)}`
    : "/";
  return <Navigate to={target} replace />;
}

/* Checkout page - booking flow */
function CheckoutPage() {
  return <CheckoutView />;
}

/* Booking page - alias for checkout */
function BookingPage() {
  return <CheckoutView />;
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<LoginView />} />
          </Route>

          {/* Protected routes with sidebar/topbar */}
          <Route element={<PrivateLayout />}>
            <Route path="/" element={<ChatPage />} />
            <Route path="/chat" element={<Navigate to="/" replace />} />
            <Route path="/chat/:conversationId" element={<ChatRedirect />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/booking" element={<BookingPage />} />
          </Route>

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
