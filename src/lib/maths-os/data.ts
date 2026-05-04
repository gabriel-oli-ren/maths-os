export type Game = {
  id: string;
  name: string;
  icon: string;
  url: string;
  grad: [string, string];
  /** Optional cover image (screenshot/thumbnail). */
  image?: string;
};

export type BuiltinAppId = "calculator" | "notes" | "settings" | "messages" | "friends" | "browse";

export type SystemApp = {
  id: string;
  name: string;
  icon: string;
  /** External URL — opens in a Maths Browse window. */
  url?: string;
  /** Built-in React app to launch. */
  builtin?: BuiltinAppId;
  /** Optional explicit image. If absent and a `url` exists, we fall back to a favicon. */
  image?: string;
};

/** High-quality favicon for any URL (Google's S2 service supports up to 256px). */
export function faviconFor(url: string, size = 128): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?sz=${size}&domain=${u.hostname}`;
  } catch {
    return "";
  }
}

export const SYSTEM_APPS: SystemApp[] = [
  { id: "sys-browse", name: "Maths Browse", icon: "🌐", builtin: "browse" },
  { id: "sys-messages", name: "Messages", icon: "💬", builtin: "messages" },
  { id: "sys-friends", name: "Friends", icon: "👥", builtin: "friends" },
  { id: "sys-calc", name: "Calculator", icon: "🧮", builtin: "calculator" },
  { id: "sys-notes", name: "Notes", icon: "📝", builtin: "notes" },
  { id: "sys-settings", name: "Settings", icon: "⚙️", builtin: "settings" },
  // Curated apps (from the GitHub source)
  { id: "app-strong-dog", name: "Strong Dog", icon: "🐕", url: "https://colute.net/", image: "/img/favicon.png" },
  { id: "app-rtve", name: "RTVE Play", icon: "📺", url: "https://rtve.es/play/", image: "/img/rt-ve.png" },
  { id: "app-royaledle", name: "ROYALEDLE", icon: "👑", url: "https://clash.gabriel-oli-ren-micro.workers.dev/", image: "/img/royaledle.png" },
  { id: "app-sounds", name: "Sound Buttons", icon: "🔊", url: "https://myinstants.online/", image: "/img/my-instants.png" },
  { id: "app-mathsbrowser", name: "Maths Browser", icon: "🧭", url: "https://browserlol.gabriel-oli-ren-micro.workers.dev/" },
  { id: "app-as", name: "Diario AS", icon: "📰", url: "https://heavy-spider-48.maths.deno.net/", image: "/img/as.png" },
  { id: "sys-maths", name: "Maths Hub", icon: "📐", url: "https://maths.support" },
  { id: "sys-search", name: "Search", icon: "🔍", url: "https://duckduckgo.com" },
  { id: "sys-youtube", name: "YouTube", icon: "▶️", url: "https://youtube.com" },
  { id: "sys-spotify", name: "Music", icon: "🎵", url: "https://open.spotify.com" },
  { id: "sys-wiki", name: "Wikipedia", icon: "📚", url: "https://wikipedia.org" },
  { id: "sys-translate", name: "Translate", icon: "🌍", url: "https://translate.google.com" },
  { id: "sys-mail", name: "Mail", icon: "📧", url: "https://mail.google.com" },
  { id: "sys-maps", name: "Maps", icon: "🗺️", url: "https://maps.google.com" },
  { id: "sys-github", name: "GitHub", icon: "🐙", url: "https://github.com" },
  { id: "sys-desmos", name: "Desmos", icon: "📊", url: "https://www.desmos.com/scientific" },
  { id: "sys-discord", name: "Discord", icon: "💬", url: "https://discord.com/app" },
  { id: "sys-reddit", name: "Reddit", icon: "👽", url: "https://reddit.com" },
  { id: "sys-twitch", name: "Twitch", icon: "🎮", url: "https://twitch.tv" },
  { id: "sys-chatgpt", name: "ChatGPT", icon: "🤖", url: "https://chat.openai.com" },
];

export const GAMES: Game[] = [
  { id: "drive-mad", name: "Drive Mad", icon: "🏎️", url: "https://games.playtropolis.com/drive-mad-v2/", grad: ["#1a0030", "#3d0060"], image: "https://raw.githubusercontent.com/gabriel-oli-ren/maths-os/main/public/img/drive-mad.png" },
  { id: "poly-track", name: "Poly Track", icon: "🏁", url: "https://html-classic.itch.zone/html/16755713/index.html?v=1773141754", grad: ["#001a30", "#003d60"], image: "/img/polytrack.png" },
  { id: "odd-bot", name: "Odd Bot Out", icon: "🤖", url: "https://games.playtropolis.com/odd-bot-out/", grad: ["#001a20", "#003d40"], image: "/img/odd-bot-out.png" },
  { id: "stunt-bike", name: "Stunt Bike Extreme", icon: "🏍️", url: "https://games.playtropolis.com/stunt-bike-extreme/", grad: ["#1a1000", "#3d2800"], image: "/img/stunt-bike-extreme.png" },
  { id: "subway", name: "Subway Surfers", icon: "🚇", url: "https://arcadrome.com/embed/subway-surfers", grad: ["#001a10", "#003d28"], image: "/img/subway-surfers.png" },
  { id: "monkey-mart", name: "Monkey Mart", icon: "🐵", url: "https://games.playtropolis.com/monkey-mart/", grad: ["#1a1a00", "#3d3d00"], image: "/img/monkey-markt.png" },
  { id: "house-hazards", name: "House Of Hazards", icon: "🏠", url: "https://games.playtropolis.com/house-of-hazards/", grad: ["#1a0010", "#3d0028"], image: "/img/house-of-hazards.png" },
  { id: "tiny-fishing", name: "Tiny Fishing", icon: "🎣", url: "https://games.playtropolis.com/tiny-fishing/", grad: ["#001030", "#002060"], image: "/img/tiny-fishing.png" },
  { id: "basketball", name: "Basketball Legends", icon: "🏀", url: "https://games.playtropolis.com/basketball-stars/", grad: ["#1a0800", "#3d1a00"], image: "/img/basketball-legends.png" },
  { id: "short-life", name: "Short Life", icon: "💀", url: "https://games.playtropolis.com/short-life/", grad: ["#0d0d0d", "#2d2d2d"], image: "/img/short-life.png" },
  { id: "tiny-market", name: "My Super Tiny Market", icon: "🛒", url: "https://games.playtropolis.com/my-super-tiny-market/", grad: ["#1a1010", "#3d2020"], image: "/img/my-super-tiny-market.png" },
  { id: "car-chase", name: "Car Chase", icon: "🚗", url: "https://idev.games/embed/car-chase-", grad: ["#1a0000", "#400000"], image: "/img/car-chase.png" },
  { id: "minecraft", name: "Minecraft", icon: "⛏️", url: "https://x.mess.eu.org/ninja-wasm/", grad: ["#0d1a00", "#1a3d00"], image: "/img/minecraft.png" },
  { id: "rope-police", name: "Amazing Rope Police", icon: "🦸", url: "https://ezclasswork.com/science/amazing-rope-police/", grad: ["#1a0020", "#3d0040"], image: "/img/amazing-rope-police.png" },
  { id: "shell-shockers", name: "Shell Shockers", icon: "🥚", url: "https://geometry.pw/", grad: ["#1a1a00", "#3d3d10"], image: "/img/shell-shockers.png" },
  { id: "recoil", name: "Recoil", icon: "🔫", url: "https://games.playtropolis.com/recoil/", grad: ["#0d0020", "#1a0040"], image: "/img/recoil.png" },
  { id: "smash-karts", name: "Smash Karts", icon: "🛒", url: "https://geometrykarts.com/", grad: ["#001a1a", "#003d3d"], image: "/img/smash-karts.png" },
  { id: "rocket-bot", name: "Rocket Bot Royale", icon: "🚀", url: "https://rocket-bot-royale.gabriel-oli-ren-micro.workers.dev/", grad: ["#00001a", "#00003d"], image: "/img/rocket-bot-royale.png" },
  { id: "goober-dash", name: "Goober Dash", icon: "👾", url: "https://goober-dash.gabriel-oli-ren-micro.workers.dev/", grad: ["#001a1a", "#003333"], image: "/img/goober-dash.png" },
  { id: "rooftop", name: "Rooftop Snipers", icon: "🎯", url: "https://ezclasswork.com/science/rooftop-snipers-2/", grad: ["#1a1000", "#3d2800"], image: "/img/rooftop-snipers.png" },
  { id: "masked-forces", name: "Masked Special Forces", icon: "🎖️", url: "https://ezclasswork.com/science/maskedforces/", grad: ["#0d0d0d", "#2d2d2d"], image: "/img/masked-forces.png" },
  { id: "geometry-dash", name: "Geometry Dash Lite", icon: "📐", url: "https://arcadrome.com/embed/geometry-dash-lite/", grad: ["#1a0000", "#3d0000"], image: "/img/geometry-dash.png" },
  { id: "epstein", name: "5 Nights at Epstein", icon: "🌙", url: "https://ig.gabriel-oli-ren-micro.workers.dev/", grad: ["#0a0a0a", "#1a1a1a"], image: "/img/epstein.png" },
  { id: "futboll-11", name: "Futboll-11", icon: "⚽", url: "https://whatsapp.gabriel-oli-ren-micro.workers.dev/", grad: ["#001a00", "#003d10"], image: "/img/futboll.png" },
  { id: "age-of-war", name: "Age Of War", icon: "⚔️", url: "https://yohohoio.gabriel-oli-ren-micro.workers.dev/age-of-war.embedgame", grad: ["#1a0800", "#401500"], image: "/img/age-of-war.png" },
  { id: "shark-io", name: "Shark.io", icon: "🦈", url: "https://games.construct.net/64330/72970/embed.html?uid=0&o=1", grad: ["#001a30", "#003060"], image: "/img/shark-io.png" },
  { id: "poxel-io", name: "Poxel.io", icon: "🟦", url: "https://poxel-io.gabriel-oli-ren-micro.workers.dev/", grad: ["#001a1a", "#003030"], image: "/img/poxel-io.png" },
  { id: "imagine-island", name: "Imagine Island", icon: "🏝️", url: "https://play.imagineisland.game/play/index.html", grad: ["#001a20", "#003040"], image: "/img/imagine-island.png" },
  { id: "idle-futbol", name: "Idle Futbol Manager", icon: "⚽", url: "https://idle-futbol-manager.gabriel-oli-ren-micro.workers.dev/", grad: ["#0a200a", "#1a3d1a"], image: "/img/idle-footbal.png" },
  { id: "fallzone", name: "Fallzone.io", icon: "🪂", url: "https://fallzone.gabriel-oli-ren-micro.workers.dev/", grad: ["#1a0010", "#3d0030"] },
  { id: "cookie-clicker", name: "Cookie Clicker", icon: "🍪", url: "https://orteil.dashnet.org/cookieclicker/", grad: ["#1a1000", "#3d2800"], image: "/img/cookie.png" },
  { id: "goober-tag", name: "Goober Tag", icon: "🏃", url: "https://blobby-chase.lovable.app/", grad: ["#001020", "#002040"] },
  { id: "duck-life", name: "Duck Life 4", icon: "🦆", url: "https://www.mathplayground.com/duck4/index.html", grad: ["#1a1a00", "#3d3d10"] },
];

export const ICON_OPTIONS = ["🌐","🔗","⭐","🎯","📌","🧩","🛠️","💡","🔑","📁","🖥️","📱","🎨","🏆","💼","📊","🔔","🗂️","🌟","⚡","🎮","📺","🎵","📚","🧮","✏️","📷","💬"];

export type PinnedItem = {
  id: string;
  type: "app" | "game" | "custom";
  name: string;
  icon: string;
  url?: string;
  builtin?: BuiltinAppId;
};

export type CustomApp = {
  id: string;
  name: string;
  icon: string;
  url: string;
};

export const WALLPAPERS: Record<string, string> = {
  aurora: "linear-gradient(135deg,#0d0d2e 0%,#1a0a3e 35%,#0a1a40 65%,#0d0d2e 100%)",
  sunset: "linear-gradient(135deg,#2d0a3e 0%,#5a0a3e 35%,#5a200a 100%)",
  deep: "linear-gradient(135deg,#000814 0%,#001d3d 50%,#003566 100%)",
  forest: "linear-gradient(135deg,#0a200a 0%,#0a3a1a 50%,#0a2a3a 100%)",
};
