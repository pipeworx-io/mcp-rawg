# mcp-rawg

RAWG MCP — wraps the RAWG video games database API (rawg.io)

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_games` | Search the RAWG video game database by name, genre, or platform. Returns games with ratings, Metacritic scores, release dates, platforms, and genres. Example: search_games({ query: "zelda", ordering: "-metacritic" }) |
| `get_game` | Get full details for a single video game: description, ratings, Metacritic score, platforms, genres, developers, publishers, ESRB rating, and playtime. Example: get_game({ id: "the-witcher-3-wild-hunt" }) |
| `list_genres` | List all video game genres in the RAWG database, with game counts per genre (e.g. Action, RPG, Indie, Strategy). |
| `list_platforms` | List all gaming platforms in the RAWG database, with game counts per platform (e.g. PC, PlayStation 5, Xbox Series X, Nintendo Switch). |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "rawg": {
      "url": "https://gateway.pipeworx.io/rawg/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Rawg data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
