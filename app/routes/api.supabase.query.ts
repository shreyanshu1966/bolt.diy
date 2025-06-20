import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createScopedLogger } from '~/utils/logger';
import { createClient } from '@supabase/supabase-js';

const logger = createScopedLogger('api.supabase.query');

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { projectId, query } = (await request.json()) as any;
    logger.debug('Executing query:', { projectId, query });

    // Check if we have managed Supabase configuration
    const env = context?.cloudflare?.env || process.env;
    const managedSupabaseUrl = env.SUPABASE_URL;
    const managedSupabaseServiceKey = env.SUPABASE_SERVICE_KEY;

    if (managedSupabaseUrl && managedSupabaseServiceKey) {
      // Use managed Supabase instance
      logger.debug('Using managed Supabase instance');

      try {
        // Create supabase client with service role key for admin operations
        const supabase = createClient(managedSupabaseUrl, managedSupabaseServiceKey);

        // Try to execute the query using the sql function
        const result = await supabase.rpc('sql', { query });

        if (result.error) {
          // Log the specific error for debugging
          logger.error('SQL function error:', result.error);

          // If it's a function not found error, provide a helpful message
          if (
            result.error.code === '42883' ||
            result.error.message?.includes('function') ||
            result.error.message?.includes('does not exist')
          ) {
            return new Response(
              JSON.stringify({
                error: {
                  message: 'Database functions not set up. Please run the setup commands in your Supabase dashboard.',
                  setup_required: true,
                  instructions:
                    'Go to your Supabase dashboard > SQL Editor and run the commands from: docs/SUPABASE_FUNCTIONS_SETUP.md',
                  details: result.error,
                },
              }),
              {
                status: 500,
                headers: {
                  'Content-Type': 'application/json',
                },
              },
            );
          }

          // For other errors, return them directly
          return new Response(
            JSON.stringify({
              error: {
                message: result.error.message || 'Query execution failed',
                details: result.error,
              },
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
              },
            },
          );
        }

        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        logger.error('Managed Supabase query error:', error);

        return new Response(
          JSON.stringify({
            error: {
              message: error instanceof Error ? error.message : 'Query execution failed',
              details: error,
            },
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );
      }
    }

    // Fallback to user-provided Supabase (existing logic)
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return new Response('No authorization token provided', { status: 401 });
    }

    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        console.log(e);
        errorData = { message: errorText };
      }

      logger.error(
        'Supabase API error:',
        JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        }),
      );

      return new Response(
        JSON.stringify({
          error: {
            status: response.status,
            statusText: response.statusText,
            message: errorData.message || errorData.error || errorText,
            details: errorData,
          },
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    logger.error('Query execution error:', error);
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Query execution failed',
          stack: error instanceof Error ? error.stack : undefined,
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
