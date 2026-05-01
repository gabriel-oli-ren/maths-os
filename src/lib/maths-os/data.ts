export type Game = {
  id: string;
  name: string;
  icon: string;
  url: string;
  grad: [string, string];
};

export type SystemApp = {
  id: string;
  name: string;
  icon: string;
  url?: string;
  view?: "home" | "apps" | "games" | "browser" | "messages" | "friends";
};

export const SYSTEM_APPS: SystemApp[] = [
  { id: "sys-home", name: "Home", icon: "🏠", view: "home" },
  { id: "sys-games", name: "Games", icon: "🎮", view: "games" },
  { id: "sys-browser", name: "Browser", icon: "🌐", view: "browser" },
  { id: "sys-messages", name: "Messages", icon: "💬", view: "messages" },
  { id: "sys-friends", name: "Friends", icon: "👥", view: "friends" },
  { id: "sys-maths", name: "Maths Hub", icon: "📐", url: "https://maths.support" },
  { id: "sys-calc", name: "Calculator", icon: "🧮", url: "https://www.desmos.com/scientific" },
  { id: "sys-notes", name: "Notes", icon: "📝", url: "https://notion.so" },
  { id: "sys-search", name: "Search", icon: "🔍", url: "https://google.com" },
  { id: "sys-youtube", name: "YouTube", icon: "▶️", url: "https://youtube.com" },
  { id: "sys-spotify", name: "Music", icon: "🎵", url: "https://open.spotify.com" },
  { id: "sys-wiki", name: "Wikipedia", icon: "📚", url: "https://wikipedia.org" },
  { id: "sys-translate", name: "Translate", icon: "🌍", url: "https://translate.google.com" },
  { id: "sys-mail", name: "Mail", icon: "📧", url: "https://mail.google.com" },
  { id: "sys-maps", name: "Maps", icon: "🗺️", url: "https://maps.google.com" },
  { id: "sys-github", name: "GitHub", icon: "🐙", url: "https://github.com" },
];

export const GAMES: Game[] = [
  { id: "drive-mad", name: "Drive Mad", icon: "🏎️", url: "https://games.playtropolis.com/drive-mad-v2/", grad: ["#1a0030", "#3d0060"] },
  { id: "poly-track", name: "Poly Track", icon: "🏁", url: "https://arcadrome.com/embed/polytrack", grad: ["#001a30", "#003d60"] },
  { id: "odd-bot", name: "Odd Bot Out", icon: "🤖", url: "https://games.playtropolis.com/odd-bot-out/", grad: ["#001a20", "#003d40"] },
  { id: "stunt-bike", name: "Stunt Bike", icon: "🏍️", url: "https://games.playtropolis.com/stunt-bike-extreme/", grad: ["#1a1000", "#3d2800"] },
  { id: "subway", name: "Subway Surfers", icon: "🚇", url: "https://arcadrome.com/embed/subway-surfers", grad: ["#001a10", "#003d28"] },
  { id: "monkey-mart", name: "Monkey Mart", icon: "🐵", url: "https://games.playtropolis.com/monkey-mart/", grad: ["#1a1a00", "#3d3d00"] },
  { id: "house-hazards", name: "House of Hazards", icon: "🏠", url: "https://games.playtropolis.com/house-of-hazards/", grad: ["#1a0010", "#3d0028"] },
  { id: "tiny-fishing", name: "Tiny Fishing", icon: "🎣", url: "https://games.playtropolis.com/tiny-fishing/", grad: ["#001030", "#002060"] },
  { id: "basketball", name: "Basketball Legends", icon: "🏀", url: "https://games.playtropolis.com/basketball-stars/", grad: ["#1a0800", "#3d1a00"] },
  { id: "short-life", name: "Short Life", icon: "💀", url: "https://games.playtropolis.com/short-life/", grad: ["#0d0d0d", "#2d2d2d"] },
  { id: "minecraft", name: "Minecraft", icon: "⛏️", url: "https://x.mess.eu.org/ninja-wasm/", grad: ["#0d1a00", "#1a3d00"] },
  { id: "geometry-dash", name: "Geometry Dash", icon: "📐", url: "https://arcadrome.com/embed/geometry-dash-lite/", grad: ["#1a0000", "#3d0000"] },
  { id: "smash-karts", name: "Smash Karts", icon: "🛒", url: "https://geometrykarts.com/", grad: ["#001a1a", "#003d3d"] },
  { id: "rocket-bot", name: "Rocket Bot Royale", icon: "🚀", url: "https://rocket-bot-royale.gabriel-oli-ren-micro.workers.dev/", grad: ["#00001a", "#00003d"] },
  { id: "rooftop", name: "Rooftop Snipers", icon: "🎯", url: "https://ezclasswork.com/science/rooftop-snipers-2/", grad: ["#1a1000", "#3d2800"] },
  { id: "age-of-war", name: "Age of War", icon: "⚔️", url: "https://yohohoio.gabriel-oli-ren-micro.workers.dev/age-of-war.embedgame", grad: ["#1a0800", "#401500"] },
  { id: "shell-shockers", name: "Shell Shockers", icon: "🥚", url: "https://geometry.pw/", grad: ["#1a1a00", "#3d3d10"] },
  { id: "recoil", name: "Recoil", icon: "🔫", url: "https://games.playtropolis.com/recoil/", grad: ["#0d0020", "#1a0040"] },
  { id: "goober-dash", name: "Goober Dash", icon: "👾", url: "https://goober-dash.gabriel-oli-ren-micro.workers.dev/", grad: ["#001a1a", "#003333"] },
  { id: "car-chase", name: "Car Chase", icon: "🚗", url: "https://idev.games/embed/car-chase-", grad: ["#1a0000", "#400000"] },
];

export const ICON_OPTIONS = ["🌐","🔗","⭐","🎯","📌","🧩","🛠️","💡","🔑","📁","🖥️","📱","🎨","🏆","💼","📊","🔔","🗂️","🌟","⚡","🎮","📺","🎵","📚","🧮","✏️","📷","💬"];

export type PinnedItem = {
  id: string;
  type: "app" | "game" | "custom";
  name: string;
  icon: string;
  url?: string;
};

export type CustomApp = {
  id: string;
  name: string;
  icon: string;
  url: string;
};
