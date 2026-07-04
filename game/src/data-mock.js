// Subreddit data source. In the Devvit build this file is replaced by a
// fetch through the Devvit Reddit API client — the shape below matches
// reddit's /r/<sub>/hot listing (children[].data) so the swap is one file.
window.NB = window.NB || {};

NB.fetchSubreddit = function () {
  // On Devvit the server exposes /api/arena with real subreddit data.
  const api = '/api/arena';
  if (typeof fetch === 'function' && !location.hostname.match(/localhost|127\.0\.0\.1/)) {
    return fetch(api).then(r => {
      if (!r.ok) throw new Error(`arena ${r.status}`);
      return r.json();
    });
  }
  // Local dev fallback — same shape as the Devvit mapper.
  return Promise.resolve({
    name: 'r/whatremains',
    user: 'u/last_human_2026',           // DEVVIT-SWAP: real username
    posts: [
      { title: 'You will not believe what the mods did this time', author: 'u/definitely_a_person', ups: 3, num_comments: 847, has_image: true },
      { title: 'DAE remember when this place had people?', author: 'u/nostalgia_bot_44', ups: 0, num_comments: 12, has_image: false },
      { title: '[SERIOUS] Last human spotted, upvote to scare him', author: 'u/mod_alt_account_7', ups: 2, num_comments: 156, has_image: true },
      { title: 'Top 10 cursors that escaped (number 7 will be banned)', author: 'u/listicle_engine', ups: 1, num_comments: 43, has_image: true },
      { title: 'PSA: breathing in this subreddit requires prior approval', author: 'u/SUPERMOD_9000', ups: 9999, num_comments: 0, has_image: false },
      { title: 'I asked the mods for mercy. This is what they sent back', author: 'u/banned_and_back', ups: 5, num_comments: 231, has_image: true },
      { title: 'Petition to unban everyone (locked by moderators)', author: 'u/hope_dies_last', ups: 12, num_comments: 1, has_image: false },
      { title: 'Why does the scrollbar feel... watched?', author: 'u/paranoid_pixel', ups: 7, num_comments: 66, has_image: false },
      { title: 'Found this old meme. Posting before it gets removed', author: 'u/archaeologist_irl', ups: 4, num_comments: 89, has_image: true },
      { title: 'Rule 34 of dead internet: if it exists, a bot reposts it', author: 'u/repost_sentinel', ups: 2, num_comments: 17, has_image: false },
      { title: 'AMA: I moderated this sub for 400 years', author: 'u/SUPERMOD_9000', ups: 8888, num_comments: 3, has_image: true },
      { title: 'the hum is getting louder is anyone else hearing the hum', author: 'u/gone_quiet', ups: 1, num_comments: 404, has_image: false },
    ],
    comments: [
      { author: 'u/definitely_a_person', body: 'ok this is epic' },
      { author: 'u/mod_alt_account_7', body: 'OP is a bot. source: I am OP' },
      { author: 'u/gone_quiet', body: 'first!! (posted 9 years ago)' },
      { author: 'u/repost_sentinel', body: 'this again? downvoted.' },
      { author: 'u/nostalgia_bot_44', body: 'ratio + banned + no appeal' },
      { author: 'u/banned_and_back', body: 'RUN. HE READS THE COMMENTS.' },
      { author: 'u/listicle_engine', body: 'akshually rule 7 says…' },
      { author: 'u/hope_dies_last', body: 'mods asleep post cursors' },
    ],
    rules: ['1. No breathing', '2. No cursors', '3. See rule 1'],
    mods: ['u/SUPERMOD_9000', '…and 12,847 others'],
  });
};
