import { ToggleTheme } from "./ToggleTheme";

const Header: React.FC = () => {
    return (
        <header className="bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 p-6 dark:from-teal-900 dark:via-cyan-900 dark:to-emerald-900 shadow-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <h1 className="text-4xl font-extrabold text-white tracking-tight drop-shadow">
                    SEO Analyzer
                </h1>
                <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                    <ToggleTheme />
                </div>
            </div>
        </header>
    );
};

export default Header;