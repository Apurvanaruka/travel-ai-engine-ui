import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Logo } from "./Logo";
import { useStore } from "../state/store";
import { Spinner } from "./bits";

export function LoginView() {
  const { login, register, health, loggedIn } = useStore();
  const navigate = useNavigate();

  // Once authenticated, leave the login page for the dashboard.
  useEffect(() => {
    if (loggedIn) navigate("/", { replace: true });
  }, [loggedIn, navigate]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const [ok, err] = mode === "login" ? await login(email.trim(), password) : await register(email.trim(), password);
    setBusy(false);
    if (!ok) setError(err);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-night px-4">
      <div className="w-full max-w-sm animate-fadeUp">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo height="48px" className="mb-1" />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">InfarsightAI</h1>
            <p className="text-xs text-dim">Corporate Travel Copilot • Enterprise Autonomous Engine v4.2</p>
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">{mode === "login" ? "Sign in" : "Create account"}</div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className={`size-1.5 rounded-full ${health ? "bg-grn" : "bg-red"}`} />
              <span className="text-dim">
                {health ? `backend • ${health.environment}` : "backend offline"}
              </span>
            </div>
          </div>

          <div>
            <label className="field-label">Work email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="inset w-full px-3 py-2.5 text-sm outline-none focus:border-acc/60"
            />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" •  •  •  •  •  •  •  • "
              className="inset w-full px-3 py-2.5 text-sm outline-none focus:border-acc/60"
            />
          </div>

          {error && <div className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-xs text-red">{error}</div>}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner size={14} /> : <KeyRound size={15} />}
            {mode === "login" ? "Login" : "Register & continue"}
          </button>

          <button
            type="button"
            className="w-full text-center text-[11px] text-dim hover:text-mut"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login" ? "No account? Register against the backend" : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
