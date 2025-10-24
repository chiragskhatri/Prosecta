document.addEventListener('DOMContentLoaded', () => {
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});

window.addEventListener('DOMContentLoaded', () => {
  // set year
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  // NAV MENU (safe guards in case elements missing)
  const toggleBtn = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");
  const overlay = document.getElementById("nav-overlay");

  const openMenu = () => {
    if (!navLinks || !toggleBtn || !overlay) return;
    navLinks.classList.add("open");
    toggleBtn.classList.add("open");
    overlay.classList.add("active");
  };
  const closeMenu = () => {
    if (!navLinks || !toggleBtn || !overlay) return;
    navLinks.classList.remove("open");
    toggleBtn.classList.remove("open");
    overlay.classList.remove("active");
  };

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = navLinks.classList.contains("open");
      isOpen ? closeMenu() : openMenu();
    });
  }

  // Prefetch full posts for top N items (non-blocking)
  const prefetchTopPosts = (postsArray) => {
    if (!Array.isArray(postsArray)) return;
    postsArray.forEach(p => {
      if (!p || !p.ID) return;
      const key = `post_${p.ID}`;
      // if already cached, skip
      if (cacheGet(key)) return;
      // fetch in background and cache
      fetchAndCache(`${APP_URL}?id=${encodeURIComponent(p.ID)}`, key, 1000*60*10, 15000)
        .catch(()=>{});
    });
  };
  // close when clicking outside or on overlay
  document.addEventListener("click", (e) => {
    if (!navLinks || !toggleBtn) return;
    const isClickInsideMenu = navLinks.contains(e.target);
    const isClickOnToggle = toggleBtn.contains(e.target);
    if (!isClickInsideMenu && !isClickOnToggle) closeMenu();
  });
  if (overlay) overlay.addEventListener('click', closeMenu);

  // BLOG FETCHING + UX HELPERS
  const APP_URL = "https://script.google.com/macros/s/AKfycbx9CiJ7cSpWfu9vke6ZAuVJ0KpZtiamhfSrERy8bvPPJYfIQmZAxJ35WMhpZk4Jsw6_9A/exec";
  const id = new URLSearchParams(window.location.search).get("id");

  const generateErrorHtml = (errorCode, message) => `
    <div style="max-width:fit-content;padding:40px;background:#e2f1e9;border-radius:15px;margin:100px auto;text-align:center;font-family:Segoe UI, Tahoma, Geneva, Verdana, sans-serif;color:#333;">
      <h1 style="font-size:6rem;margin:0;color:#e74c3c">${errorCode}</h1>
      <h2 style="font-size:1.8rem;margin-top:10px;color:#555">Oops! ${message}</h2>
      <p style="color:#777;margin-bottom:30px">It seems like something went wrong. Please try again later.</p>
      <a href="../blog.html" style="display:inline-block;padding:12px 25px;background:#3498db;color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;">Go Home</a>
    </div>`;

  // Skeletons
  const showSkeleton = (container, type = 'list') => {
    if (!container) return;
    if (type === 'post') {

      container.innerHTML = `
        <div class="blog-page skeleton" aria-busy="true">
          <div class="blog-header">
            <div class="blog-hero-img skeleton-thumb"></div>
          </div>
          <div class="blog-content">
            <h1 class="skeleton-line skeleton-title skeleton-line--large"></h1>
            <p class="skeleton-line skeleton-summary skeleton-line--medium"></p>

            <!-- inline content image placeholder (represents images being lazy-loaded inside post) -->
            <div class="content-image skeleton-thumb" aria-hidden="true"></div>

            <div class="skeleton-line skeleton-line--full"></div>
            <div class="skeleton-line skeleton-line--full"></div>
            <div class="skeleton-line skeleton-line--short"></div>
            <div class="skeleton-line skeleton-line--medium"></div>
          </div>
        </div>`;
    } else {
      // list skeleton: render N cards that use the same classes as the real cards
      const count = 4;
      container.innerHTML = Array.from({length: count}).map(() => `
        <div class="blog-card skeleton" data-aos="fade-up" data-aos-delay="100">
          <div class="blog-thumb skeleton-thumb" aria-hidden="true"></div>
          <div class="blog-info">
            <h2 class="skeleton-line skeleton-title"></h2>
            <p class="skeleton-line skeleton-summary"></p>
            <a class="read-more skeleton-readmore" aria-hidden="true"></a>
          </div>
        </div>
      `).join('');
    }
  };

  // Small localStorage cache with TTL
  const cacheGet = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const {ts, ttl, val} = JSON.parse(raw);
      if (Date.now() - ts > ttl) {
        localStorage.removeItem(key);
        return null;
      }
      return val;
    } catch {
      return null;
    }
  };
  const cacheSet = (key, val, ttl = 1000 * 60 * 5) => {
    try {
      localStorage.setItem(key, JSON.stringify({ts: Date.now(), ttl, val}));
    } catch {
    }
  };

  // fetch wrapper with cache + timeout
  const fetchWithCache = (url, cacheKey = null, ttl = 1000*60*5, timeoutMs = 15000) => {
    const cached = cacheKey ? cacheGet(cacheKey) : null;
    if (cached) return Promise.resolve(cached);

    const controller = new AbortController();
    const idTimeout = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {signal: controller.signal})
      .then(res => {
        clearTimeout(idTimeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (cacheKey) cacheSet(cacheKey, json, ttl);
        return json;
      });
  };

  // fetch-and-cache: always does a network fetch and updates cache
  const fetchAndCache = (url, cacheKey = null, ttl = 1000*60*5, timeoutMs = 15000) => {
    const controller = new AbortController();
    const idTimeout = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, {signal: controller.signal})
      .then(res => {
        clearTimeout(idTimeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (cacheKey) cacheSet(cacheKey, json, ttl);
        return json;
      });
  };

  // stale-while-revalidate: return cached value immediately if present, but refresh in background
  const fetchSWR = (url, cacheKey = null, ttl = 1000*60*5, timeoutMs = 15000) => {
    const cached = cacheKey ? cacheGet(cacheKey) : null;
    if (cached) {
      // kick off background refresh but do not wait
      fetchAndCache(url, cacheKey, ttl, timeoutMs).catch(() => {});
      return Promise.resolve(cached);
    }
    // no cache -> fetch and cache (wait)
    return fetchAndCache(url, cacheKey, ttl, timeoutMs);
  };

  if (id) {
    // single blog view
    const container = document.getElementById("blog");
    if (!container) {
      console.error("Error: 'blog' div not found in view-blog.html");
      return;
    }
    // show skeleton while we try to render cached or fresh
    showSkeleton(container, 'post');

    // helper to render post into container
    const renderPost = (blog) => {
      if (!blog || blog.error || !blog.ID) {
        container.innerHTML = generateErrorHtml("404", "Blog post not found");
        return;
      }
      document.title = blog.Title || 'Blog';
      container.innerHTML = `
        <div class="hero">
          <h1 style="color:#FFD700;font-family:cursive">${blog.Title}</h1>
          <p style="font-style:italic">${blog.Summary || ''}</p>
        </div>
        <div class="blog-page">
          <div class="blog-header">
            <img src="${blog.ImageLink || ''}" alt="Blog Thumbnail" loading="lazy" style="max-width:100%;border-radius:8px" />
          </div>
          <div class="blog-content">
            ${blog.Content || ''}
          </div>
        </div>
      `;
    };

    // try stale-while-revalidate: render cache immediately if present, then replace when fresh arrives
    const postCacheKey = `post_${id}`;
    const cachedPost = cacheGet(postCacheKey);
    if (cachedPost) {
      try { renderPost(cachedPost); } catch(e){/* ignore render errors */}
      // refresh in background and replace if different
      fetchAndCache(`${APP_URL}?id=${encodeURIComponent(id)}`, postCacheKey, 1000*60*10, 15000)
        .then(fresh => {
          try {
            // replace only if different (simple string compare)
            if (JSON.stringify(fresh) !== JSON.stringify(cachedPost)) renderPost(fresh);
          } catch (e) { /* ignore */ }
        }).catch(err => { console.debug('Post background refresh failed', err); });
    } else {
      // no cache -> fetch and render
      fetchAndCache(`${APP_URL}?id=${encodeURIComponent(id)}`, postCacheKey, 1000*60*10, 15000)
        .then(blog => renderPost(blog))
        .catch(err => {
          console.error("Blog fetch error:", err);
          container.innerHTML = generateErrorHtml("500", "Error loading blog post");
        });
    }

  } else {
    // list of blog posts
    const container = document.getElementById("blog-container");
    if (!container) {
      console.error("Error: 'blog-container' div not found in blog.html");
      return;
    }

    // list of blog posts: use stale-while-revalidate to render cached summaries immediately
    const renderList = (data) => {
      // data to show latest->oldest on the site
      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = generateErrorHtml("404", "No blog posts found");
        return;
      }
      const reversed = data.slice().reverse(); // newest first
      let htmlContent = "";
      reversed.forEach(post => {
        if (!post.ID || !post.Title || !post.Summary || !post.ImageLink) {
          console.warn("Skipping malformed blog post:", post);
          return;
        }
        htmlContent += `
          <div class="blog-card" data-aos="fade-up" data-aos-delay="100">
            <img src="${post.ImageLink}" alt="Blog Thumbnail" class="blog-thumb" loading="lazy">
            <div class="blog-info">
              <h2>${post.Title}</h2>
              <p>${post.Summary}</p>
              <a href="view-blog.html?id=${post.ID}" class="read-more">Read More →</a>
            </div>
          </div>
        `;
      });
      container.innerHTML = htmlContent;
      return reversed; 
    };

    showSkeleton(container, 'list');

    const summaryCacheKey = 'all_posts_summary';
    const cachedSummary = cacheGet(summaryCacheKey);
    if (cachedSummary) {
      try { renderList(cachedSummary); } catch(e){}
      // background refresh and update if changed
      fetchAndCache(APP_URL, summaryCacheKey, 1000*60*5, 15000)
        .then(fresh => {
          try {
            if (JSON.stringify(fresh) !== JSON.stringify(cachedSummary)) renderList(fresh);
            // prefetch top 2 newest posts (fresh is oldest->latest, so reverse then slice)
            if (Array.isArray(fresh) && fresh.length) prefetchTopPosts(fresh.slice().reverse().slice(0,3));
          } catch(e){}
        })
        .catch(err => { console.debug('Background summary refresh failed', err); });
    } else {
      // no cache -> fetch then render
      fetchAndCache(APP_URL, summaryCacheKey, 1000*60*5, 15000)
        .then(data => {
          const newest = renderList(data) || data.slice().reverse();
          if (Array.isArray(newest) && newest.length) prefetchTopPosts(newest.slice(0,3));
        })
        .catch(err => {
          console.error("Summary fetch error:", err);
          container.innerHTML = generateErrorHtml("500", "Error loading blog summaries");
        });
    }
  }
});