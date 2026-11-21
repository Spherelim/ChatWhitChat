// Detecta de qué red social (o servicio de pago) es un enlace y devuelve el icono que le toca.
//
// Los iconos se cargan solos con import.meta.glob (Vite): busca todo lo que haya dentro de
// src/icons/Social/<Carpeta>/... y src/icons/Economy/<Carpeta>/... y usa el primer archivo
// de cada carpeta (aunque esté en una subcarpeta).
// Si agregas una carpeta nueva y no aparece, reinicia `npm run dev`.

const archivos = import.meta.glob(
    '../icons/{Social,Economy}/**/*.{png,jpg,jpeg,svg,webp,gif,avif,PNG,JPG,JPEG,SVG,WEBP}',
    { eager: true, import: 'default' }
);

// { yt: '/src/icons/Social/YT/youtube.png', paypal: '...', ... }  (claves en minúsculas)
const iconosPorCarpeta = {};

Object.entries(archivos)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([ruta, url]) => {
        const partes = ruta.split('/');
        // la carpeta de la red es la que va justo después de Social/ o Economy/
        const i = partes.findIndex(p => p === 'Social' || p === 'Economy');
        const carpeta = partes[i + 1]?.toLowerCase();
        if (carpeta && !iconosPorCarpeta[carpeta]) iconosPorCarpeta[carpeta] = url;
    });

// carpeta = nombre de la carpeta dentro de icons/Social o icons/Economy (no importan mayúsculas)
// dominios = dominios (sin www) que identifican a esa red
const REDES = [
    // ---- Social ----
    { carpeta: 'YT',          dominios: ['youtube.com', 'youtu.be'] },
    { carpeta: 'FB',          dominios: ['facebook.com', 'fb.com', 'fb.me', 'fb.watch'] },
    { carpeta: 'IG',          dominios: ['instagram.com', 'instagr.am'] },
    { carpeta: 'X',           dominios: ['x.com', 'twitter.com', 't.co'] },
    { carpeta: 'TikTok',      dominios: ['tiktok.com'] },
    { carpeta: 'Twitch',      dominios: ['twitch.tv'] },
    { carpeta: 'Discord',     dominios: ['discord.com', 'discord.gg', 'discordapp.com'] },
    { carpeta: 'GitHub',      dominios: ['github.com'] },
    { carpeta: 'Spotify',     dominios: ['spotify.com', 'spotify.link'] },
    { carpeta: 'SoundCloud',  dominios: ['soundcloud.com'] },
    { carpeta: 'Steam',       dominios: ['steampowered.com', 'steamcommunity.com'] },
    { carpeta: 'Telegram',    dominios: ['telegram.org', 'telegram.me', 't.me'] },
    { carpeta: 'Reddit',      dominios: ['reddit.com', 'redd.it'] },
    { carpeta: 'Patreon',     dominios: ['patreon.com'] },
    { carpeta: 'Pinteres',    dominios: ['pinterest.com', 'pin.it'] },
    { carpeta: 'PlayStation', dominios: ['playstation.com'] },
    { carpeta: 'Xbox',        dominios: ['xbox.com'] },
    { carpeta: 'EpicGames',   dominios: ['epicgames.com'] },
    { carpeta: 'riotgames',   dominios: ['riotgames.com'] },
    { carpeta: 'Roblox',      dominios: ['roblox.com'] },
    { carpeta: 'blogger',     dominios: ['blogger.com', 'blogspot.com'] },
    { carpeta: 'clubhouse',   dominios: ['clubhouse.com', 'joinclubhouse.com'] },
    { carpeta: 'devianart',   dominios: ['deviantart.com'] },
    { carpeta: 'dribble',     dominios: ['dribbble.com'] },
    { carpeta: 'figma',       dominios: ['figma.com'] },
    { carpeta: 'in',          dominios: ['linkedin.com', 'lnkd.in'] },
    { carpeta: 'tumblr',      dominios: ['tumblr.com'] },
    { carpeta: 'vimeo',       dominios: ['vimeo.com'] },
    { carpeta: 'vk',          dominios: ['vk.com', 'vk.ru'] },
    { carpeta: 'Wasa',        dominios: ['wa.me', 'whatsapp.com'] },
    { carpeta: 'wattpad',     dominios: ['wattpad.com'] },
    { carpeta: 'wix',         dominios: ['wix.com', 'wixsite.com'] },
    { carpeta: 'Xing',        dominios: ['xing.com'] },

    // ---- Economy ----
    { carpeta: 'paypal',          dominios: ['paypal.com', 'paypal.me'] },
    { carpeta: 'bitcoin',         dominios: ['bitcoin.org', 'bitcoin.com'] },
    { carpeta: 'visa',            dominios: ['visa.com'] },
    { carpeta: 'americanExpress', dominios: ['americanexpress.com', 'amex.com'] },
    { carpeta: 'applepay',        dominios: ['apple.com'] },
];

const esCorreo = (texto) =>
    /^mailto:/i.test(texto) || /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(texto);

/**
 * Recibe lo que escribió el usuario y devuelve la URL del icono de esa red,
 * o null si no la reconoce (en ese caso usa tu linckIcon).
 *
 *   detectarRed('https://www.youtube.com/@Gsound1') -> icono de YT
 *   detectarRed('instagram.com/chetto')             -> icono de IG
 *   detectarRed('https://mi-pagina.com')            -> null
 */
export function detectarRed(texto = '') {
    const valor = texto.trim();
    if (!valor) return null;

    if (esCorreo(valor)) return iconosPorCarpeta['mail'] || null;

    let host;
    try {
        const conProtocolo = /^[a-z][a-z0-9+.-]*:\/\//i.test(valor) ? valor : `https://${valor}`;
        host = new URL(conProtocolo).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
        return null;
    }

    const red = REDES.find(({ dominios }) =>
        dominios.some((d) => host === d || host.endsWith(`.${d}`))
    );
    if (!red) return null;

    const icono = iconosPorCarpeta[red.carpeta.toLowerCase()];

    // Si ves este aviso en la consola: la red se reconoció pero su carpeta no tiene imagen
    // (o la carpeta se llama distinto). Solo ahí se verá el clip.
    if (!icono && import.meta.env.DEV) {
        console.warn(`[socialIcons] Reconocí "${red.carpeta}" pero no hay imagen en esa carpeta.`,
            'Carpetas encontradas:', Object.keys(iconosPorCarpeta));
    }

    return icono || null;
}