export type Framework =
  | 'vite'
  | 'nextjs'
  | 'vue'
  | 'angular'
  | 'remix'
  | 'react'
  | 'nuxt'
  | 'sveltekit'
  | 'astro'
  | 'expo'
  | 'unknown';

export interface FrameworkConfig {
  name: string;
  envPrefix: string;
  clientEnvAccess: string;
  serverEnvAccess: string;
  supabaseClientPattern: string;
  packageJsonDeps: string[];
  files: string[];
}

export const FRAMEWORK_CONFIGS: Record<Framework, FrameworkConfig> = {
  nextjs: {
    name: 'Next.js',
    envPrefix: 'NEXT_PUBLIC_',
    clientEnvAccess: 'process.env.NEXT_PUBLIC_',
    serverEnvAccess: 'process.env.',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: ['next', '@next/', 'next/'],
    files: ['app/layout.tsx', 'pages/_app.tsx', 'next.config.js', 'app/page.tsx'],
  },

  vite: {
    name: 'Vite + React',
    envPrefix: 'VITE_',
    clientEnvAccess: 'import.meta.env.VITE_',
    serverEnvAccess: 'process.env.',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: ['vite', '@vitejs/', 'react'],
    files: ['index.html', 'src/main.tsx', 'src/main.jsx', 'vite.config.ts', 'vite.config.js'],
  },

  remix: {
    name: 'Remix',
    envPrefix: 'VITE_',
    clientEnvAccess: 'import.meta.env.VITE_',
    serverEnvAccess: 'process.env.',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: ['@remix-run/', 'remix'],
    files: ['app/root.tsx', 'remix.config.js'],
  },

  vue: {
    name: 'Vue.js',
    envPrefix: 'VITE_',
    clientEnvAccess: 'import.meta.env.VITE_',
    serverEnvAccess: 'process.env.',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: ['vue', '@vitejs/plugin-vue'],
    files: ['src/App.vue', 'src/main.ts', 'vite.config.ts'],
  },

  nuxt: {
    name: 'Nuxt.js',
    envPrefix: 'NUXT_PUBLIC_',
    clientEnvAccess: 'useRuntimeConfig().public.',
    serverEnvAccess: 'useRuntimeConfig().',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'

const config = useRuntimeConfig()
const supabaseUrl = config.public.supabaseUrl!
const supabaseAnonKey = config.public.supabaseAnonKey!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: ['nuxt', '@nuxt/'],
    files: ['nuxt.config.ts', 'nuxt.config.js', 'pages/', 'layouts/'],
  },

  angular: {
    name: 'Angular',
    envPrefix: 'NG_APP_',
    clientEnvAccess: 'environment.',
    serverEnvAccess: 'process.env.',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'
import { environment } from '../environments/environment'

const supabaseUrl = environment.supabaseUrl!
const supabaseAnonKey = environment.supabaseAnonKey!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: ['@angular/', 'angular'],
    files: ['angular.json', 'src/app/app.module.ts', 'src/environments/', 'src/main.ts'],
  },

  sveltekit: {
    name: 'SvelteKit',
    envPrefix: 'PUBLIC_',
    clientEnvAccess: '$env/static/public',
    serverEnvAccess: '$env/static/private',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

export const supabase = createClient(PUBLIC_SUPABASE_URL!, PUBLIC_SUPABASE_ANON_KEY!)`,
    packageJsonDeps: ['@sveltejs/kit', 'svelte'],
    files: ['svelte.config.js', 'src/app.html', 'src/routes/+layout.svelte'],
  },

  astro: {
    name: 'Astro',
    envPrefix: 'PUBLIC_',
    clientEnvAccess: 'import.meta.env.PUBLIC_',
    serverEnvAccess: 'import.meta.env.',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: ['astro', '@astrojs/'],
    files: ['astro.config.mjs', 'src/pages/', 'src/layouts/'],
  },

  expo: {
    name: 'Expo',
    envPrefix: 'EXPO_PUBLIC_',
    clientEnvAccess: 'process.env.EXPO_PUBLIC_',
    serverEnvAccess: 'process.env.',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: ['expo', '@expo/', 'expo-'],
    files: ['app.json', 'metro.config.js', 'babel.config.js', 'app/_layout.tsx'],
  },

  react: {
    name: 'React',
    envPrefix: 'REACT_APP_',
    clientEnvAccess: 'process.env.REACT_APP_',
    serverEnvAccess: 'process.env.',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: ['react-scripts', 'create-react-app'],
    files: ['public/index.html', 'src/index.js', 'src/index.tsx'],
  },

  unknown: {
    name: 'Unknown Framework',
    envPrefix: 'VITE_',
    clientEnvAccess: 'import.meta.env.VITE_',
    serverEnvAccess: 'process.env.',
    supabaseClientPattern: `import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    packageJsonDeps: [],
    files: [],
  },
};

export function detectFrameworkFromPackageJson(packageJson: any): Framework {
  if (!packageJson || (!packageJson.dependencies && !packageJson.devDependencies)) {
    return 'unknown';
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };

  const depNames = Object.keys(allDeps);

  // Check for Next.js
  if (depNames.some((dep) => dep === 'next' || dep.startsWith('@next/'))) {
    return 'nextjs';
  }

  // Check for Remix
  if (depNames.some((dep) => dep.startsWith('@remix-run/'))) {
    return 'remix';
  }

  // Check for Nuxt
  if (depNames.some((dep) => dep === 'nuxt' || dep.startsWith('@nuxt/'))) {
    return 'nuxt';
  }

  // Check for SvelteKit
  if (depNames.some((dep) => dep === '@sveltejs/kit')) {
    return 'sveltekit';
  }

  // Check for Angular
  if (depNames.some((dep) => dep.startsWith('@angular/'))) {
    return 'angular';
  }

  // Check for Astro
  if (depNames.some((dep) => dep === 'astro' || dep.startsWith('@astrojs/'))) {
    return 'astro';
  }

  // Check for Expo
  if (depNames.some((dep) => dep === 'expo' || dep.startsWith('@expo/') || dep.startsWith('expo-'))) {
    return 'expo';
  }

  // Check for Vue
  if (depNames.some((dep) => dep === 'vue')) {
    return 'vue';
  }

  // Check for React with Create React App
  if (depNames.some((dep) => dep === 'react-scripts')) {
    return 'react';
  }

  // Check for Vite + React
  if (depNames.some((dep) => dep === 'vite') && depNames.some((dep) => dep === 'react')) {
    return 'vite';
  }

  return 'unknown';
}

export function detectFrameworkFromFiles(files: string[]): Framework {
  const fileSet = new Set(files);

  // Check for Next.js files
  if (
    fileSet.has('next.config.js') ||
    fileSet.has('next.config.ts') ||
    files.some((f) => f.includes('app/layout.tsx') || f.includes('pages/_app.tsx'))
  ) {
    return 'nextjs';
  }

  // Check for Remix files
  if (files.some((f) => f.includes('app/root.tsx')) || fileSet.has('remix.config.js')) {
    return 'remix';
  }

  // Check for Vue files
  if (files.some((f) => f.endsWith('.vue')) || files.some((f) => f.includes('src/App.vue'))) {
    return 'vue';
  }

  // Check for Angular files
  if (fileSet.has('angular.json') || files.some((f) => f.includes('src/app/app.module.ts'))) {
    return 'angular';
  }

  // Check for SvelteKit files
  if (fileSet.has('svelte.config.js') || files.some((f) => f.includes('+layout.svelte'))) {
    return 'sveltekit';
  }

  // Check for Astro files
  if (fileSet.has('astro.config.mjs') || files.some((f) => f.includes('src/pages/'))) {
    return 'astro';
  }

  // Check for Expo files
  if (fileSet.has('app.json') && (fileSet.has('metro.config.js') || files.some((f) => f.includes('app/_layout.tsx')))) {
    return 'expo';
  }

  // Check for Nuxt files
  if (fileSet.has('nuxt.config.ts') || fileSet.has('nuxt.config.js')) {
    return 'nuxt';
  }

  // Check for Vite
  if (fileSet.has('vite.config.ts') || fileSet.has('vite.config.js')) {
    return 'vite';
  }

  // Check for Create React App
  if (files.some((f) => f.includes('public/index.html')) && files.some((f) => f.includes('src/index'))) {
    return 'react';
  }

  return 'unknown';
}

export function getFrameworkConfig(framework: Framework): FrameworkConfig {
  return FRAMEWORK_CONFIGS[framework] || FRAMEWORK_CONFIGS.unknown;
}

export function generateSupabaseClientCode(framework: Framework): string {
  const config = getFrameworkConfig(framework);
  return config.supabaseClientPattern;
}

export function generateEnvVariables(framework: Framework): { client: string; server: string } {
  const config = getFrameworkConfig(framework);

  const client = `${config.envPrefix}SUPABASE_URL=your_supabase_url_here
${config.envPrefix}SUPABASE_ANON_KEY=your_supabase_anon_key_here`;

  const server =
    framework === 'nextjs' || framework === 'nuxt'
      ? `SUPABASE_SERVICE_KEY=your_supabase_service_key_here`
      : `SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here`;

  return { client, server };
}
