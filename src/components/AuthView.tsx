import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Logo } from "./Logo";
import { useStore } from "../state/store";
import { Spinner } from "./bits";
import { SettingsMenu } from "./SettingsMenu";

export type AuthMode = "login" | "register";

/** Shared UI for the separate /login and /register pages. */
export function AuthView({ mode }: { mode: AuthMode }) {
  const { login, register, health, loggedIn } = useStore();
  const navigate = useNavigate();

  // Once authenticated, leave the auth pages for the dashboard.
  useEffect(() => {
    if (loggedIn) navigate("/", { replace: true });
  }, [loggedIn, navigate]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A navigation between the two auth routes can reuse this component.
  useEffect(() => {
    setConfirmPassword("");
    setError(null);
  }, [mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const [ok, err] =
      mode === "login"
        ? await login(email.trim(), password)
        : await register(email.trim(), password);
    setBusy(false);
    if (!ok) setError(err);
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-night px-4">
      <div className="absolute right-4 top-4 z-20">
        <SettingsMenu showLabel />
      </div>

      <div className="w-full max-w-sm animate-fadeUp">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Logo height="68px" className="mb-1" />
        </div>

        <form onSubmit={submit} className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                {mode === "login" ? "Sign in" : "Create account"}
              </div>
              <div className="text-[11px] text-dim">
                {mode === "login"
                  ? "Access your corporate travel workspace"
                  : "Register against the backend"}
              </div>
            </div>
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
              autoComplete="email"
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
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" •  •  •  •  •  •  •  • "
              className="inset w-full px-3 py-2.5 text-sm outline-none focus:border-acc/60"
            />
          </div>
          {mode === "register" && (
            <div>
              <label className="field-label">Confirm password</label>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="inset w-full px-3 py-2.5 text-sm outline-none focus:border-acc/60"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-xs text-red">
              {error}
            </div>
          )}

          <button className="btn-primary w-full" disabled={busy}>
            {busy ? <Spinner size={14} /> : <KeyRound size={15} />}
            {mode === "login" ? "Login" : "Register & continue"}
          </button>

          <div className="text-center text-[11px] text-dim">
            {mode === "login" ? (
              <>
                No account?{" "}
                <Link to="/register" className="font-semibold text-acc hover:text-acc2">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-acc hover:text-acc2">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
