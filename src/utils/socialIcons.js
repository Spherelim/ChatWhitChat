// src/utils/socialIcons.js
//
// Detecta de qué red social es un enlace y devuelve el icono que le toca.
//
// Los iconos se cargan solos con import.meta.glob (Vite): busca todo lo que haya en
// src/icons/Social/<Carpeta>/<archivo> y usa el primer archivo de cada carpeta.
// Así no hace falta importar uno por uno ni saber cómo se llama cada archivo.
//
// Si tu proyecto NO usa Vite, avísame y lo cambio por require.context (webpack).

const archivos = import.meta.glob('../icons/Social/*/*.{png,jpg,jpeg,svg,webp}', {
    eager: true,
    import: 'default',
});

// { yt: '/src/icons/Social/YT/youtube.png', fb: '...', ... }  (claves en minúsculas)
const iconosPorCarpeta = {};

Object.entries(archivos)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([ruta, url]) => {
        const carpeta = ruta.split('/').slice(-2, -1)[0].toLowerCase();
        if (!iconosPorCarpeta[carpeta]) iconosPorCarpeta[carpeta] = url;
    });

// carpeta = nombre EXACTO de la carpeta dentro de icons/Social
// dominios = dominios (sin www) que identifican a esa red
const REDES = [
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

    return red ? iconosPorCarpeta[red.carpeta.toLowerCase()] || null : null;
}