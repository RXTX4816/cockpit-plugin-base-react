const THEME_KEY = 'shell:style';
const DARK_CLASS = 'pf-v6-theme-dark';

function prefersDark(): boolean {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyTheme(override?: string): void {
    const style = override ?? localStorage.getItem(THEME_KEY) ?? 'auto';
    const dark = style === 'dark' || (style === 'auto' && prefersDark());
    document.documentElement.classList.toggle(DARK_CLASS, dark);
}

window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === THEME_KEY) {
        applyTheme();
    }
});

window.addEventListener('cockpit-style', (event: Event) => {
    if (event instanceof CustomEvent) {
        applyTheme(event.detail?.style);
    }
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    applyTheme();
});

applyTheme();
