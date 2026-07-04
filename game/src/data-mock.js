// Home feed data — mirrors reddit.com /hot (multi-subreddit cards).
// Devvit server maps real API children[].data into this exact shape.
window.NB = window.NB || {};

NB.fetchSubreddit = function () {
  const api = '/api/arena';
  if (typeof fetch === 'function' && !location.hostname.match(/localhost|127\.0\.0\.1/)) {
    return fetch(api).then(r => {
      if (!r.ok) throw new Error(`arena ${r.status}`);
      return r.json();
    });
  }

  return Promise.resolve({
    mode: 'home',
    name: 'reddit',
    user: 'u/last_human_2026',
    posts: [
      { subreddit: 'r/AskReddit', author: 'u/throwaway_question', time: '4 hr. ago', title: 'What is the most underrated skill that everyone should learn?', ups: 4821, num_comments: 2187, has_image: false },
      { subreddit: 'r/funny', author: 'u/chaos_goblin_42', time: '2 hr. ago', title: 'My cat filed a formal complaint with the HOA', ups: 12400, num_comments: 341, has_image: true, image_label: 'imgur.com' },
      { subreddit: 'r/worldnews', author: 'u/AssociatedPressBot', time: '1 hr. ago', title: 'Headline that makes you refresh seventeen times before the comments load', ups: 8900, num_comments: 1204, has_image: false },
      { subreddit: 'r/gaming', author: 'u/patch_notes_when', time: '6 hr. ago', title: 'Indie dev updates game after one reddit comment. Community in shambles.', ups: 3312, num_comments: 892, has_image: true, image_tall: true, image_label: 'i.redd.it' },
      { subreddit: 'r/todayilearned', author: 'u/wikipedia_rabbit_hole', time: '8 hr. ago', title: 'TIL the scrollbar was invented because someone needed a place to hide', ups: 15600, num_comments: 412, has_image: false },
      { subreddit: 'r/mildlyinteresting', author: 'u/phone_camera_pro', time: '3 hr. ago', title: 'This receipt printed the word "reddit" in the thermal ink', ups: 2103, num_comments: 88, has_image: true, image_label: 'gallery' },
      { subreddit: 'r/technology', author: 'u/comment_section_lawyer', time: '5 hr. ago', title: 'New study confirms users read headlines and argue anyway', ups: 6700, num_comments: 1903, has_image: false },
      { subreddit: 'r/pics', author: 'u/accidental_renaissance', time: '12 hr. ago', title: 'Took this photo of my desk. Someone said it looks like a boss arena.', ups: 42100, num_comments: 967, has_image: true, image_tall: true, image_label: 'i.redd.it' },
      { subreddit: 'r/AmItheAsshole', author: 'u/throwaway_moral_event', time: '45 min. ago', title: 'AITA for moving my cursor away from the mod?', ups: 980, num_comments: 2401, has_image: false },
      { subreddit: 'r/memes', author: 'u/dank_archivist', time: '7 hr. ago', title: 'When the algorithm finally shows you the one post that matters', ups: 18900, num_comments: 156, has_image: true, image_label: 'i.redd.it' },
      { subreddit: 'r/OutOfTheLoop', author: 'u/just_got_here', time: '9 hr. ago', title: 'Why is everyone talking about a guy in a gold elevator?', ups: 5400, num_comments: 803, has_image: false },
      { subreddit: 'r/popular', author: 'u/SUPERMOD_9000', time: 'just now', title: 'PSA: your cursor is still visible to moderators', ups: 1, num_comments: 404, has_image: false },
    ],
    comments: [
      { author: 'u/throwaway_question', body: 'ok but actually though' },
      { author: 'u/chaos_goblin_42', body: 'this is the content I come here for' },
      { author: 'u/comment_section_lawyer', body: 'source: trust me bro' },
      { author: 'u/wikipedia_rabbit_hole', body: 'citation needed (joking)' },
      { author: 'u/just_got_here', body: 'following' },
      { author: 'u/SUPERMOD_9000', body: 'RUN. HE READS THE COMMENTS.' },
      { author: 'u/phone_camera_pro', body: 'enhance' },
      { author: 'u/dank_archivist', body: 'ratio + you fell off + caught' },
    ],
    popular: [
      { name: 'r/AskReddit', members: '57.2m' },
      { name: 'r/funny', members: '66.8m' },
      { name: 'r/gaming', members: '47.3m' },
      { name: 'r/worldnews', members: '46.1m' },
      { name: 'r/todayilearned', members: '41.2m' },
    ],
    rules: [],
    mods: [],
  });
};