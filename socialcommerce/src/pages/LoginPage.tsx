import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "../app/providers/AuthProvider";
import { useUIStore } from "../app/stores/uiStore";
import { Icon } from "../shared/components/Icon";
import { Sun, Moon, Sparkles, ShieldCheck, Zap, MessageSquare, Newspaper, Clapperboard, ShoppingBag } from "../shared/components/iconRegistry";
import { GoogleIcon, MicrosoftIcon, FacebookIcon, AppleIcon } from "./providerIcons";
import "./LoginPage.css";

type Provider = "Google" | "Microsoft" | "Facebook" | "Apple";

const PROVIDERS: Array<{
    accent: string;
    description: string;
    ProviderIcon: React.FC<{ size?: number }>;
    name: Provider;
}> = [
        {
            name: "Google",
            ProviderIcon: GoogleIcon,
            accent: "#ea4335",
            description: "Gmail, Workspace, and Android identities",
        },
        {
            name: "Microsoft",
            ProviderIcon: MicrosoftIcon,
            accent: "#3d7cff",
            description: "Microsoft 365, Outlook, and Entra accounts",
        },
        {
            name: "Facebook",
            ProviderIcon: FacebookIcon,
            accent: "#1877f2",
            description: "Meta-connected profiles and community access",
        },
        {
            name: "Apple",
            ProviderIcon: AppleIcon,
            accent: "#8e8e93",
            description: "Private Apple ID sign-in across your devices",
        },
    ];

const DESTINATIONS: Record<string, string> = {
    communication: "Communication Hub",
    commerce: "Commerce Studio",
    social: "Social Feed",
    streaming: "Streaming Lounge",
};

const SURFACE_CARDS = [
    { eyebrow: "Chat", title: "Pick up conversations without a second login.", icon: MessageSquare },
    { eyebrow: "Shop", title: "Jump straight back into carts, orders, and listings.", icon: ShoppingBag },
    { eyebrow: "Share", title: "Move from groups to posts with the same session.", icon: Newspaper },
    { eyebrow: "Watch", title: "Rejoin streams and live chat with one account.", icon: Clapperboard },
];

function getDestinationLabel(pathname: string) {
    const firstSegment = pathname.split("/").filter(Boolean)[0];
    return DESTINATIONS[firstSegment] ?? "your workspace";
}

const LoginPage: React.FC = () => {
    const { user, login, loginWithEmail, loading } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const from =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
        "/communication";
    const destinationLabel = getDestinationLabel(from);
    const popupReturnUrl = `${window.location.origin}/auth/popup-complete`;
    const [pendingProvider, setPendingProvider] = React.useState<Provider | null>(null);
    const [emailValue, setEmailValue] = React.useState('demo@example.com');
    const [passwordValue, setPasswordValue] = React.useState('');
    const [emailError, setEmailError] = React.useState('');
    const [emailPending, setEmailPending] = React.useState(false);
    const isBusy = loading || pendingProvider !== null || emailPending;
    const { theme, toggleTheme } = useUIStore();

    React.useEffect(() => {
        if (user) {
            navigate(from, { replace: true });
        }
    }, [user, from, navigate]);

    const onLogin = async (provider: Provider) => {
        setPendingProvider(provider);
        try {
            await login(provider);
        } finally {
            setPendingProvider(null);
        }
    };

    const onEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError('');
        if (!emailValue.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
            setEmailError('Enter a valid email address.');
            return;
        }
        setEmailPending(true);
        try {
            await loginWithEmail(emailValue.trim(), passwordValue);
        } finally {
            setEmailPending(false);
        }
    };

    return (
        <div className="login-page">
            <button
                className="login-page__theme-toggle"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                onClick={toggleTheme}
            >
                <Icon icon={theme === 'dark' ? Sun : Moon} size={18} />
            </button>
            <div className="login-page__orb login-page__orb--blue" aria-hidden="true" />
            <div className="login-page__orb login-page__orb--rose" aria-hidden="true" />

            <div className="login-page__shell">
                <section className="login-card" aria-labelledby="login-title">
                    <span className="login-card__eyebrow">Continue to {destinationLabel}</span>

                    <h1 id="login-title" className="login-card__title">
                        Sign in once. Move everywhere.
                    </h1>

                    <p className="login-card__copy">
                        Use your preferred account to jump back into messages, storefronts,
                        streams, and communities without losing your place.
                    </p>

                    <div className="login-card__chips" aria-label="Sign-in highlights">
                        <span className="login-chip"><Icon icon={Sparkles} size={12} /> Soft session handoff</span>
                        <span className="login-chip"><Icon icon={ShieldCheck} size={12} /> Secure popup flow</span>
                        <span className="login-chip"><Icon icon={Zap} size={12} /> One account across domains</span>
                    </div>

                    <div className="login-card__providers">
                        {PROVIDERS.map((provider) => {
                            const isPending = pendingProvider === provider.name;

                            return (
                                <button
                                    key={provider.name}
                                    type="button"
                                    className="login-provider"
                                    onClick={() => onLogin(provider.name)}
                                    disabled={isBusy}
                                    aria-busy={isPending}
                                    style={
                                        {
                                            "--provider-accent": provider.accent,
                                        } as React.CSSProperties
                                    }
                                >
                                    <span className="login-provider__badge" aria-hidden="true">
                                        <provider.ProviderIcon size={18} />
                                    </span>

                                    <span className="login-provider__content">
                                        <span className="login-provider__label">
                                            {isPending
                                                ? `Opening ${provider.name}...`
                                                : `Continue with ${provider.name}`}
                                        </span>
                                        <span className="login-provider__description">
                                            {provider.description}
                                        </span>
                                    </span>

                                    <span className="login-provider__status" aria-hidden="true">
                                        {isPending ? "Waiting" : "Open"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Divider */}
                    <div className="login-divider" aria-hidden="true">
                        <span>or</span>
                    </div>

                    {/* Email / password mock login */}
                    <form className="login-email-form" onSubmit={onEmailLogin} noValidate>
                        <label className="login-email-form__label" htmlFor="login-email">
                            Email
                        </label>
                        <input
                            id="login-email"
                            className="login-email-form__input"
                            type="email"
                            autoComplete="email"
                            value={emailValue}
                            onChange={(e) => { setEmailValue(e.target.value); setEmailError(''); }}
                            disabled={isBusy}
                            placeholder="demo@example.com"
                            aria-describedby={emailError ? 'login-email-error' : undefined}
                            aria-invalid={!!emailError}
                        />
                        {emailError && (
                            <span id="login-email-error" className="login-email-form__error" role="alert">
                                {emailError}
                            </span>
                        )}
                        <label className="login-email-form__label" htmlFor="login-password">
                            Password <span className="login-email-form__hint">(any value — mock)</span>
                        </label>
                        <input
                            id="login-password"
                            className="login-email-form__input"
                            type="password"
                            autoComplete="current-password"
                            value={passwordValue}
                            onChange={(e) => setPasswordValue(e.target.value)}
                            disabled={isBusy}
                            placeholder="••••••••"
                        />
                        <button
                            type="submit"
                            className="login-email-form__submit"
                            disabled={isBusy}
                            aria-busy={emailPending}
                        >
                            {emailPending ? 'Signing in…' : 'Sign in with Email'}
                        </button>
                    </form>

                    <p className="login-card__caption">
                        {loading
                            ? "Checking for an existing session before opening sign-in."
                            : pendingProvider
                                ? `Opening ${pendingProvider} sign-in in a secure popup.`
                                : "We will open a small popup to authenticate, then bring you straight back here."}
                    </p>

                    <details className="login-fallback">
                        <summary>Popup not showing?</summary>

                        <div className="login-fallback__links">
                            {PROVIDERS.map((provider) => (
                                <a
                                    key={provider.name}
                                    className="login-fallback__link"
                                    href={`/auth/${provider.name.toLowerCase()}/start?returnUrl=${encodeURIComponent(popupReturnUrl)}`}
                                >
                                    Use {provider.name} redirect
                                </a>
                            ))}
                        </div>
                    </details>
                </section>

                <aside className="login-showcase">
                    <div className="login-showcase__hero">
                        <span className="login-showcase__eyebrow">Shared identity</span>
                        <h2 className="login-showcase__title">
                            One login. Every corner of the platform.
                        </h2>
                        <p className="login-showcase__copy">
                            Messages, storefronts, live streams, and social feeds — all under a
                            single session. Switch without losing your place.
                        </p>
                    </div>

                    <div className="login-showcase__grid">
                        {SURFACE_CARDS.map((card) => (
                            <div key={card.eyebrow} className="login-showcase__tile">
                                <span className="login-showcase__tile-icon" aria-hidden="true">
                                    <Icon icon={card.icon} size={20} strokeWidth={1.5} />
                                </span>
                                <span className="login-showcase__tile-eyebrow">
                                    {card.eyebrow}
                                </span>
                                <p className="login-showcase__tile-title">{card.title}</p>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default LoginPage;
