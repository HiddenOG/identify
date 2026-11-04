/** Full-colour devicon logos for common tools (checked to exist). Everything else falls back to Simple Icons. */
const DEVICON: Record<string, string> = {
  python: "python/python-original",
  javascript: "javascript/javascript-original",
  typescript: "typescript/typescript-original",
  react: "react/react-original",
  "next.js": "nextjs/nextjs-original",
  nextjs: "nextjs/nextjs-original",
  "node.js": "nodejs/nodejs-original",
  node: "nodejs/nodejs-original",
  "tailwind css": "tailwindcss/tailwindcss-original",
  tailwind: "tailwindcss/tailwindcss-original",
  "html & css": "html5/html5-original",
  html: "html5/html5-original",
  css: "css3/css3-original",
  tensorflow: "tensorflow/tensorflow-original",
  pytorch: "pytorch/pytorch-original",
  fastapi: "fastapi/fastapi-original",
  flask: "flask/flask-original",
  django: "django/django-plain",
  postgresql: "postgresql/postgresql-original",
  postgres: "postgresql/postgresql-original",
  mysql: "mysql/mysql-original",
  mongodb: "mongodb/mongodb-original",
  redis: "redis/redis-original",
  supabase: "supabase/supabase-original",
  firebase: "firebase/firebase-original",
  docker: "docker/docker-original",
  kubernetes: "kubernetes/kubernetes-original",
  git: "git/git-original",
  github: "github/github-original",
  azure: "azure/azure-original",
  aws: "amazonwebservices/amazonwebservices-original-wordmark",
  go: "go/go-original",
  rust: "rust/rust-original",
  java: "java/java-original",
  "c++": "cplusplus/cplusplus-original",
  pandas: "pandas/pandas-original",
  numpy: "numpy/numpy-original",
  figma: "figma/figma-original",
  vue: "vuejs/vuejs-original",
  angular: "angular/angular-original",
  flutter: "flutter/flutter-original",
  kotlin: "kotlin/kotlin-original",
  swift: "swift/swift-original",
  linux: "linux/linux-original",
  // Brands Simple Icons removed over trademark, which devicon still has in colour.
  photoshop: "photoshop/photoshop-original",
  "adobe photoshop": "photoshop/photoshop-original",
  illustrator: "illustrator/illustrator-plain",
  "adobe illustrator": "illustrator/illustrator-plain",
  "after effects": "aftereffects/aftereffects-original",
  "adobe after effects": "aftereffects/aftereffects-original",
  "premiere pro": "premierepro/premierepro-original",
  "adobe premiere pro": "premierepro/premierepro-original",
  xd: "xd/xd-original",
  "adobe xd": "xd/xd-original",
  "c#": "csharp/csharp-original",
  matlab: "matlab/matlab-original",
  canva: "canva/canva-original",
  slack: "slack/slack-original",
  salesforce: "salesforce/salesforce-original",
  sketch: "sketch/sketch-original",
};

/** Names people commonly type that differ from the Simple Icons title. */
const SIMPLE_ICONS_ALIASES: Record<string, string> = {
  aws: "amazonwebservices",
  "amazon web services": "amazonwebservices",
  gcp: "googlecloud",
  "google cloud platform": "googlecloud",
  azure: "microsoftazure",
  // Microsoft Office, Teams and Power BI logos aren't available anywhere free; those show a dot.
  "vs code": "visualstudiocode",
  vscode: "visualstudiocode",
  postgres: "postgresql",
  k8s: "kubernetes",
  "c++": "cplusplus",
  golang: "go",
  js: "javascript",
  ts: "typescript",
  "react native": "react",
  "sap pm": "sap",
  "google analytics": "googleanalytics",
  "google ads": "googleads",
  "meta ads": "meta",
  "facebook ads": "meta",
  hubspot: "hubspot",
  "scikit-learn": "scikitlearn",
  sklearn: "scikitlearn",
  "hugging face": "huggingface",
  "github actions": "githubactions",
};

/**
 * The Simple Icons slug for a tool name, following their rule: + → plus, . → dot, & → and,
 * accents dropped, then only a–z and 0–9 kept ("Next.js" → "nextdotjs").
 */
function simpleIconsSlug(name: string) {
  const key = name.trim().toLowerCase();
  if (SIMPLE_ICONS_ALIASES[key]) return SIMPLE_ICONS_ALIASES[key];
  return key
    .replace(/\+/g, "plus")
    .replace(/\./g, "dot")
    .replace(/&/g, "and")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Logo candidates for a tool, best first: a full-colour devicon for the common ones, then
 * Simple Icons (3,000+ brands, in their own colour) matched by name. The template tries each
 * and falls back to a dot, so any tool someone types gets a logo if one exists.
 */
export function toolIconUrls(name: string): string[] {
  const urls: string[] = [];
  const devicon = DEVICON[name.trim().toLowerCase()];
  if (devicon) urls.push(`https://cdn.jsdelivr.net/gh/devicons/devicon@2.16.0/icons/${devicon}.svg`);
  const slug = simpleIconsSlug(name);
  if (slug.length >= 2) urls.push(`https://cdn.simpleicons.org/${slug}`);
  return urls;
}
