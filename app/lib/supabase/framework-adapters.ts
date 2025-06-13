import { detectFrameworkFromFiles } from '~/lib/utils/framework-detection';
import type { Framework } from '~/lib/utils/framework-detection';

export interface FrameworkSupabaseConfig {
  clientCode: string;
  authCode: string;
  envSetup: string;
  imports: string;
}

/**
 * Simple framework detection for current project
 */
async function detectFramework(): Promise<Framework> {
  if (typeof window !== 'undefined') {
    // Client-side detection is limited, use file patterns
    return 'vite'; // Default for client-side
  }

  // Server-side: check for common framework files
  try {
    const { existsSync } = await import('fs');
    const { join } = await import('path');
    const cwd = process.cwd();

    const files = [];

    if (existsSync(join(cwd, 'next.config.js'))) {
      files.push('next.config.js');
    }

    if (existsSync(join(cwd, 'nuxt.config.js'))) {
      files.push('nuxt.config.js');
    }

    if (existsSync(join(cwd, 'vite.config.ts'))) {
      files.push('vite.config.ts');
    }

    if (existsSync(join(cwd, 'angular.json'))) {
      files.push('angular.json');
    }

    return detectFrameworkFromFiles(files);
  } catch {
    // Fallback to vite if file system access fails
    return 'vite';
  }
}

/**
 * Generate framework-specific Supabase client code
 */
export async function generateSupabaseClientCode(framework?: string): Promise<FrameworkSupabaseConfig> {
  const detectedFramework = framework || (await detectFramework());

  switch (detectedFramework) {
    case 'nextjs':
      return generateNextJSCode();
    case 'nuxt':
      return generateNuxtCode();
    case 'vue':
      return generateVueCode();
    case 'sveltekit':
      return generateSvelteKitCode();
    case 'astro':
      return generateAstroCode();
    case 'angular':
      return generateAngularCode();
    case 'remix':
      return generateRemixCode();
    default:
      return generateViteReactCode();
  }
}

/**
 * Next.js Supabase integration
 */
function generateNextJSCode(): FrameworkSupabaseConfig {
  return {
    imports: `import { createClient } from '@supabase/supabase-js'`,
    envSetup: `const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!`,
    clientCode: `export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    authCode: `// Authentication helper
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }
}`,
  };
}

/**
 * Nuxt Supabase integration
 */
function generateNuxtCode(): FrameworkSupabaseConfig {
  return {
    imports: `import { createClient } from '@supabase/supabase-js'`,
    envSetup: `const config = useRuntimeConfig()
const supabaseUrl = config.public.supabaseUrl
const supabaseAnonKey = config.public.supabaseAnonKey`,
    clientCode: `export const useSupabase = () => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  return supabase
}`,
    authCode: `// Authentication composable
export const useAuth = () => {
  const supabase = useSupabase()
  
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  }
  
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }
  
  const user = useSupabaseUser()
  
  return { signUp, signIn, signOut, user }
}`,
  };
}

/**
 * Vue 3 Composition API Supabase integration
 */
function generateVueCode(): FrameworkSupabaseConfig {
  return {
    imports: `import { createClient } from '@supabase/supabase-js'
import { ref, reactive } from 'vue'`,
    envSetup: `const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY`,
    clientCode: `export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Reactive auth state
export const authState = reactive({
  user: null,
  session: null,
  loading: true
})`,
    authCode: `// Authentication composable
export const useAuth = () => {
  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  }
  
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.user) {
      authState.user = data.user;
      authState.session = data.session;
    }
    return { data, error };
  }
  
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      authState.user = null;
      authState.session = null;
    }
    return { error };
  }
  
  const getUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user) authState.user = user;
    return { user, error };
  }
  
  return { signUp, signIn, signOut, getUser, authState }
}`,
  };
}

/**
 * SvelteKit Supabase integration
 */
function generateSvelteKitCode(): FrameworkSupabaseConfig {
  return {
    imports: `import { createClient } from '@supabase/supabase-js'
import { writable } from 'svelte/store'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'`,
    envSetup: `const supabaseUrl = PUBLIC_SUPABASE_URL
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY`,
    clientCode: `export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Svelte stores for auth state
export const user = writable(null)
export const session = writable(null)`,
    authCode: `// Authentication functions
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },
  
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.user) {
      user.set(data.user);
      session.set(data.session);
    }
    return { data, error };
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      user.set(null);
      session.set(null);
    }
    return { error };
  },
  
  getUser: async () => {
    const { data: { user: currentUser }, error } = await supabase.auth.getUser();
    if (currentUser) user.set(currentUser);
    return { user: currentUser, error };
  }
}`,
  };
}

/**
 * Astro Supabase integration
 */
function generateAstroCode(): FrameworkSupabaseConfig {
  return {
    imports: `import { createClient } from '@supabase/supabase-js'`,
    envSetup: `const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY`,
    clientCode: `export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    authCode: `// Authentication utilities
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },
  
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }
}`,
  };
}

/**
 * Angular Supabase integration
 */
function generateAngularCode(): FrameworkSupabaseConfig {
  return {
    imports: `import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';`,
    envSetup: `// Add to environment.ts:
// export const environment = {
//   production: false,
//   supabaseUrl: '${process.env.NG_APP_SUPABASE_URL}',
//   supabaseKey: '${process.env.NG_APP_SUPABASE_ANON_KEY}'
// };`,
    clientCode: `@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  get client() {
    return this.supabase;
  }
}`,
    authCode: `@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private supabaseService: SupabaseService) {}

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabaseService.client.auth.signUp({ email, password });
    return { data, error };
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async signOut() {
    const { error } = await this.supabaseService.client.auth.signOut();
    return { error };
  }

  async getUser() {
    const { data: { user }, error } = await this.supabaseService.client.auth.getUser();
    return { user, error };
  }
}`,
  };
}

/**
 * Remix Supabase integration
 */
function generateRemixCode(): FrameworkSupabaseConfig {
  return {
    imports: `import { createClient } from '@supabase/supabase-js'`,
    envSetup: `const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!`,
    clientCode: `export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client for loader/action functions
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)`,
    authCode: `// Authentication utilities
export const auth = {
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  },
  
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  }
}`,
  };
}

/**
 * Vite + React Supabase integration (default)
 */
function generateViteReactCode(): FrameworkSupabaseConfig {
  return {
    imports: `import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'`,
    envSetup: `const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY`,
    clientCode: `export const supabase = createClient(supabaseUrl, supabaseAnonKey)`,
    authCode: `// React hook for authentication
export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { data, error };
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  return { user, loading, signUp, signIn, signOut }
}`,
  };
}

/**
 * Generate complete Supabase setup code for any framework
 */
export async function generateCompleteSupabaseSetup(framework?: string): Promise<string> {
  const config = await generateSupabaseClientCode(framework);

  return `${config.imports}

${config.envSetup}

${config.clientCode}

${config.authCode}`;
}
