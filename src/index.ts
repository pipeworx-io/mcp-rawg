interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * RAWG MCP — wraps the RAWG video games database API (rawg.io)
 *
 * The largest open video game database: 800k+ games with ratings, Metacritic
 * scores, platforms, genres, developers, and publishers.
 *
 * Tools:
 * - search_games: search the game database by name, genre, or platform
 * - get_game: full details for a single video game (ratings, platforms, genres)
 * - list_genres: browse all video game genres
 * - list_platforms: browse all gaming platforms
 *
 * Dual-key model: _apiKey is OPTIONAL — pass your own RAWG key for higher
 * limits, or omit it to use the shared Pipeworx key. Passed as the `key` query
 * param. All requests are GET against https://api.rawg.io/api.
 */


const BASE_URL = 'https://api.rawg.io/api';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_games',
    description:
      'Search the RAWG video game database by name, genre, or platform. Returns games with ratings, Metacritic scores, release dates, platforms, and genres. Example: search_games({ query: "zelda", ordering: "-metacritic" })',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — a game name or keyword, e.g. "elden ring", "mario"',
        },
        genres: {
          type: 'string',
          description: 'Filter by genre slug(s) or id(s), comma-separated, e.g. "action", "role-playing-games-rpg"',
        },
        platforms: {
          type: 'string',
          description: 'Filter by platform id(s), comma-separated, e.g. "4" (PC), "187" (PS5)',
        },
        ordering: {
          type: 'string',
          description: 'Sort order, e.g. "-rating" (top rated), "-released" (newest), "-metacritic" (best reviewed)',
        },
        page_size: {
          type: 'number',
          description: 'Number of games to return (default 20, max 40)',
        },
        _apiKey: {
          type: 'string',
          description: 'Optional — your own RAWG API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
    },
  },
  {
    name: 'get_game',
    description:
      'Get full details for a single video game: description, ratings, Metacritic score, platforms, genres, developers, publishers, ESRB rating, and playtime. Example: get_game({ id: "the-witcher-3-wild-hunt" })',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'RAWG game id or slug, e.g. "3328" or "the-witcher-3-wild-hunt"',
        },
        _apiKey: {
          type: 'string',
          description: 'Optional — your own RAWG API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_genres',
    description:
      'List all video game genres in the RAWG database, with game counts per genre (e.g. Action, RPG, Indie, Strategy).',
    inputSchema: {
      type: 'object',
      properties: {
        _apiKey: {
          type: 'string',
          description: 'Optional — your own RAWG API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
    },
  },
  {
    name: 'list_platforms',
    description:
      'List all gaming platforms in the RAWG database, with game counts per platform (e.g. PC, PlayStation 5, Xbox Series X, Nintendo Switch).',
    inputSchema: {
      type: 'object',
      properties: {
        _apiKey: {
          type: 'string',
          description: 'Optional — your own RAWG API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
    },
  },
];

// RAWG returns the API key as a `key` query param. _apiKey is optional — when
// omitted the gateway injects the shared platform key; if neither is present we
// return an actionable error rather than calling RAWG keyless (which 401s).
async function rawgGet(path: string, params: URLSearchParams, apiKey: string): Promise<unknown> {
  if (!apiKey) {
    return { error: 'api_key_required', message: 'No RAWG key available.' };
  }
  params.set('key', apiKey);
  const res = await fetch(`${BASE_URL}${path}?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  return res.json();
}

interface RawgGameSummary {
  id: number;
  slug: string;
  name: string;
  released: string | null;
  rating: number;
  metacritic: number | null;
  platforms?: Array<{ platform?: { name?: string } }>;
  genres?: Array<{ name?: string }>;
  background_image: string | null;
}

interface RawgGameDetail {
  id: number;
  name: string;
  released: string | null;
  rating: number;
  metacritic: number | null;
  description_raw?: string;
  platforms?: Array<{ platform?: { name?: string } }>;
  genres?: Array<{ name?: string }>;
  developers?: Array<{ name?: string }>;
  publishers?: Array<{ name?: string }>;
  website?: string;
  esrb_rating?: { name?: string } | null;
  playtime?: number;
}

interface RawgGenre {
  id: number;
  name: string;
  slug: string;
  games_count: number;
}

interface RawgPlatform {
  id: number;
  name: string;
  slug: string;
  games_count: number;
}

async function searchGames(
  args: { query?: string; genres?: string; platforms?: string; ordering?: string; page_size?: number },
  apiKey: string,
) {
  const pageSize = Math.min(40, Math.max(1, Number(args.page_size) || 20));
  const params = new URLSearchParams({ page_size: String(pageSize) });
  if (args.query) params.set('search', args.query);
  if (args.genres) params.set('genres', args.genres);
  if (args.platforms) params.set('platforms', args.platforms);
  if (args.ordering) params.set('ordering', args.ordering);

  const data = (await rawgGet('/games', params, apiKey)) as
    | { count: number; results: RawgGameSummary[] }
    | { error: unknown; message: string };
  if ('error' in data) return data;

  return {
    count: data.count,
    games: data.results.map((g) => ({
      id: g.id,
      slug: g.slug,
      name: g.name,
      released: g.released,
      rating: g.rating,
      metacritic: g.metacritic,
      platforms: g.platforms?.map((p) => p.platform?.name),
      genres: g.genres?.map((x) => x.name),
      background_image: g.background_image,
    })),
  };
}

async function getGame(id: string, apiKey: string) {
  const data = (await rawgGet(`/games/${encodeURIComponent(id)}`, new URLSearchParams(), apiKey)) as
    | RawgGameDetail
    | { error: unknown; message: string };
  if ('error' in data) return data;

  return {
    id: data.id,
    name: data.name,
    released: data.released,
    rating: data.rating,
    metacritic: data.metacritic,
    description: (data.description_raw || '').slice(0, 1000),
    platforms: data.platforms?.map((p) => p.platform?.name),
    genres: data.genres?.map((x) => x.name),
    developers: data.developers?.map((d) => d.name),
    publishers: data.publishers?.map((p) => p.name),
    website: data.website,
    esrb: data.esrb_rating?.name,
    playtime: data.playtime,
  };
}

async function listGenres(apiKey: string) {
  const data = (await rawgGet('/genres', new URLSearchParams(), apiKey)) as
    | { results: RawgGenre[] }
    | { error: unknown; message: string };
  if ('error' in data) return data;

  return data.results.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    games_count: g.games_count,
  }));
}

async function listPlatforms(apiKey: string) {
  const data = (await rawgGet('/platforms', new URLSearchParams(), apiKey)) as
    | { results: RawgPlatform[] }
    | { error: unknown; message: string };
  if ('error' in data) return data;

  return data.results.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    games_count: p.games_count,
  }));
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string;
  delete args._apiKey;

  switch (name) {
    case 'search_games':
      return searchGames(
        {
          query: args.query as string | undefined,
          genres: args.genres as string | undefined,
          platforms: args.platforms as string | undefined,
          ordering: args.ordering as string | undefined,
          page_size: args.page_size as number | undefined,
        },
        apiKey,
      );
    case 'get_game':
      return getGame(args.id as string, apiKey);
    case 'list_genres':
      return listGenres(apiKey);
    case 'list_platforms':
      return listPlatforms(apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
