import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { useStore } from "../hooks/useStore";
import { Alert, Button, Card, InputField, Logo, Spinner } from "../components/common";
import { SettingsMenu } from "../components/layout/SettingsMenu";

export type AuthMode = "login" | "register";

/** Shared UI for the separate /login and /register pages. */
export function AuthPage({ mode }: { mode: AuthMode }) {
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const [ok, message] =
      mode === "login"
        ? await login(email.trim(), password)
        : await register(email.trim(), password);
    setBusy(false);
    if (!ok) setError(message);
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

        <Card className="space-y-4 p-5">
          <form onSubmit={submit} className="space-y-4">
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

            <InputField
              label="Work email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />

            <InputField
              label="Password"
              type="password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder=" •  •  •  •  •  •  •  • "
            />

            {mode === "register" && (
              <InputField
                label="Confirm password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
              />
            )}

            {error && <Alert tone="error">{error}</Alert>}

            <Button className="w-full" disabled={busy} type="submit">
              {busy ? <Spinner size={14} /> : <KeyRound size={15} />}
              {mode === "login" ? "Login" : "Register & continue"}
            </Button>

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
        </Card>
      </div>
    </div>
  );
}
