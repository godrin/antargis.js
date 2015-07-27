define(["hl/fetch", "hl/rest", "hl/invent", "hl/format_and_wait"],function(fetch, rest, invent, move) {
  return {
    Fetch: fetch,
    Invent: invent,
    Rest: rest,
    Move: move
  };
});
