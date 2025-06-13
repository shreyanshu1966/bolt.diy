import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('analytics-middleware');

// Types for analytics tracking
export interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: Date;
}

interface AnalyticsMiddlewareOptions {
  autoTrack?: boolean;
  trackPageViews?: boolean;
  trackClicks?: boolean;
  trackForms?: boolean;
  trackErrors?: boolean;
  sampleRate?: number; // 0-100
}

export class AnalyticsMiddleware {
  private _events: AnalyticsEvent[] = [];
  private _options: AnalyticsMiddlewareOptions = {};
  private _isTrackingEnabled = true;
  private _flushInterval: ReturnType<typeof setInterval> | null = null;
  private _trackEventCallback?: (event: AnalyticsEvent) => Promise<void>;
  private _isInitialized = false;

  constructor(options: AnalyticsMiddlewareOptions = {}) {
    this._options = {
      autoTrack: true,
      trackPageViews: true,
      trackClicks: false, // More conservative defaults to prevent over-logging
      trackForms: false,
      trackErrors: true,
      sampleRate: 100,
      ...options,
    };
  }

  /**
   * Initialize the analytics middleware
   */
  initialize(trackEventCallback?: (event: AnalyticsEvent) => Promise<void>) {
    if (this._isInitialized) {
      return;
    }

    this._trackEventCallback = trackEventCallback;

    if (typeof window !== 'undefined' && this._options.autoTrack) {
      this._setupAutoTracking();
    }

    // Set up periodic flushing
    this._flushInterval = setInterval(() => this.flush(), 30000); // Flush every 30 seconds

    this._isInitialized = true;
    logger.info('Analytics middleware initialized');
  }

  /**
   * Track a custom event
   */
  trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>) {
    if (!this._isTrackingEnabled || !this._shouldSample()) {
      return undefined;
    }

    const fullEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date(),
    };

    this._events.push(fullEvent);

    // If we have a direct callback, send immediately
    if (this._trackEventCallback) {
      this._trackEventCallback(fullEvent).catch((error: Error) => {
        logger.error('Error sending event to callback:', error);
      });
    }

    return fullEvent;
  }

  /**
   * Track a page view
   */
  trackPageView(path: string, title?: string) {
    return this.trackEvent({
      event: 'page_view',
      category: 'navigation',
      action: 'view',
      label: title || path,
      properties: { path, title },
    });
  }

  /**
   * Track an error
   */
  trackError(error: Error, context?: Record<string, any>) {
    return this.trackEvent({
      event: 'error',
      category: 'error',
      action: 'exception',
      label: error.name,
      properties: {
        message: error.message,
        stack: error.stack,
        ...context,
      },
    });
  }

  /**
   * Enable or disable tracking
   */
  setTrackingEnabled(enabled: boolean) {
    this._isTrackingEnabled = enabled;
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<void> {
    if (this._events.length === 0) {
      return;
    }

    try {
      // If we have a backend, send events in batches
      if (this._trackEventCallback) {
        const promises = [];

        for (const event of this._events) {
          promises.push(this._trackEventCallback(event));
        }
        await Promise.all(promises);
      }

      // Clear the events
      this._events = [];
    } catch (err) {
      logger.error('Error flushing events:', err);
    }
  }

  /**
   * Clean up
   */
  dispose() {
    if (this._flushInterval) {
      clearInterval(this._flushInterval);
      this._flushInterval = null;
    }

    // Flush any remaining events
    this.flush().catch((err: Error) => {
      logger.error('Error during final flush:', err);
    });

    this._isInitialized = false;
  }

  /**
   * Determine if we should sample this event based on sample rate
   */
  private _shouldSample(): boolean {
    return Math.random() * 100 <= (this._options.sampleRate || 100);
  }

  /**
   * Set up automatic tracking for various events
   */
  private _setupAutoTracking() {
    // Track initial page view
    if (this._options.trackPageViews) {
      this.trackPageView(window.location.pathname);

      // Track navigation changes
      const originalPushState = window.history.pushState;

      window.history.pushState = (...args) => {
        originalPushState.apply(window.history, args);
        this.trackPageView(window.location.pathname);
      };
    }

    // Track errors
    if (this._options.trackErrors) {
      window.addEventListener('error', (event) => {
        this.trackError(event.error || new Error(event.message), {
          lineno: event.lineno,
          colno: event.colno,
          filename: event.filename,
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

        this.trackError(error, { unhandledRejection: true });
      });
    }

    // Track clicks on specific elements
    if (this._options.trackClicks) {
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;

        // Track button clicks
        if (target.tagName === 'BUTTON' || target.closest('button')) {
          const button = target.tagName === 'BUTTON' ? target : target.closest('button');

          if (button) {
            const text = button.textContent?.trim();
            const id = button.id;
            const classes = Array.from(button.classList).join(' ');

            this.trackEvent({
              event: 'button_click',
              category: 'interaction',
              action: 'click',
              label: text || id || 'button',
              properties: { text, id, classes },
            });
          }
        }

        // Track link clicks
        if (target.tagName === 'A' || target.closest('a')) {
          const link = target.tagName === 'A' ? target : target.closest('a');

          if (link) {
            const href = (link as HTMLAnchorElement).href;
            const text = link.textContent?.trim();

            this.trackEvent({
              event: 'link_click',
              category: 'interaction',
              action: 'click',
              label: text || href || 'link',
              properties: { href, text },
            });
          }
        }
      });
    }
  }
}

// Create a singleton instance
export const analytics = new AnalyticsMiddleware();

// Initialize during import
if (typeof window !== 'undefined') {
  analytics.initialize();
}

// Export a hook for React components
export function useAnalytics() {
  return analytics;
}
