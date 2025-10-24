
document.addEventListener('DOMContentLoaded', () => {
  const yearSpan = document.getElementById('year');
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
});

  const toggleBtn = document.getElementById("menu-toggle");
  const navLinks = document.getElementById("nav-links");
  const overlay = document.getElementById("nav-overlay");

  // Function to open menu
  const openMenu = () => {
    navLinks.classList.add("open");
    toggleBtn.classList.add("open");
    overlay.classList.add("active");
  };

  // Function to close menu
  const closeMenu = () => {
    navLinks.classList.remove("open");
    toggleBtn.classList.remove("open");
    overlay.classList.remove("active");
  };

  // Toggle menu on toggleBtn click
  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent bubbling up to document
    const isOpen = navLinks.classList.contains("open");
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close menu when clicking outside (including overlay)
  document.addEventListener("click", (e) => {
    const isClickInsideMenu = navLinks.contains(e.target);
    const isClickOnToggle = toggleBtn.contains(e.target);

    if (!isClickInsideMenu && !isClickOnToggle) {
      closeMenu();
    }
  });


window.addEventListener("DOMContentLoaded", () => {
    // Get the Google Apps Script Web App URL here
    const APP_URL = "https://script.google.com/macros/s/AKfycbx9CiJ7cSpWfu9vke6ZAuVJ0KpZtiamhfSrERy8bvPPJYfIQmZAxJ35WMhpZk4Jsw6_9A/exec";

    const id = new URLSearchParams(window.location.search).get("id");

    /**
     * Generates and returns HTML for a styled error message.
     * @param {string} errorCode - The HTTP-like error code (e.g., "404", "500").
     * @param {string} message - A user-friendly message explaining the error.
     * @returns {string} - The HTML string with inline styles.
     */
    const generateErrorHtml = (errorCode, message) => {
        return `
            <div style="
                max-width: fit-content;
                padding: 40px;
                background-color: #e2f1e9;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                margin: 100px auto;
                text-align: center;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #333;
            ">
                <h1 style="
                    font-size: 8rem;
                    margin: 0;
                    color: #e74c3c;
                    text-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
                ">${errorCode}</h1>
                <h2 style="
                    font-size: 2.5rem;
                    margin-top: 10px;
                    color: #555;
                ">Oops! ${message}</h2>
                <p style="
                    font-size: 1.2rem;
                    line-height: 1.6;
                    color: #777;
                    margin-bottom: 30px;
                ">It seems like something went wrong. The page you're looking for might not exist or there's a temporary issue.</p>
                <a href="/" style="
                    display: inline-block;
                    padding: 12px 25px;
                    background-color: #3498db;
                    color: #fff;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: bold;
                    transition: background-color 0.3s ease, transform 0.3s ease;
                " onmouseover="this.style.backgroundColor='#2980b9'; this.style.transform='translateY(-3px)'" onmouseout="this.style.backgroundColor='#3498db'; this.style.transform='translateY(0)'">Go Home</a>
            </div>
        `;
    };

    if (id) {
        // Logic for view-blog.html (single blog post)
        const container = document.getElementById("blog");
        if (!container) {
            console.error("Error: 'blog' div not found in view-blog.html");
            return;
        }

        fetch(`${APP_URL}?id=${id}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(blog => {
                console.log("Fetched blog:", blog);

                // Check if the blog data is missing or malformed
                if (!blog || blog.error || !blog.ID) {
                    container.innerHTML = generateErrorHtml("404", "Blog post not found");
                    return;
                }

                document.title = blog.Title; // Set page title
                container.innerHTML = `
                    <div class="hero">
                        <h1 style="color: #FFD700; font-family: cursive;">${blog.Title}</h1>
                        <p style="font-style: italic;">${blog.Summary}</p>
                    </div>
                    <div class="blog-page">
                        <div class="blog-header">
                            <img src="${blog.ImageLink}" alt="Blog Thumbnail" />
                        </div>
                        <div class="blog-content">
                            ${blog.Content}
                        </div>
                    </div>
                `;
            })
            .catch(err => {
                console.error("Blog fetch error:", err);
                container.innerHTML = generateErrorHtml("500", "Error loading blog post");
            });

    } else {
        // Logic for blog.html (list of all blog posts)
        const container = document.getElementById("blog-container");
        if (!container) {
            console.error("Error: 'blog-container' div not found in blog.html");
            return;
        }

        fetch(APP_URL) // Fetch all blogs
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                // Check if the data is not an array or is empty
                if (!Array.isArray(data) || data.length === 0) {
                    container.innerHTML = generateErrorHtml("404", "No blog posts found");
                    return;
                }

                let htmlContent = "";
                data.forEach(post => {
                    // Skip posts that don't have essential data
                    if (!post.ID || !post.Title || !post.Summary || !post.ImageLink) {
                        console.warn("Skipping malformed blog post:", post);
                        return;
                    }

                    htmlContent += `
                        <div class="blog-card" data-aos="fade-up" data-aos-delay="100">
                            <img src="${post.ImageLink}" alt="Blog Thumbnail" class="blog-thumb">
                            <div class="blog-info">
                                <h2>${post.Title}</h2>
                                <p>${post.Summary}</p>
                                <a href="view-blog.html?id=${post.ID}" class="read-more">Read More →</a>
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = htmlContent;
            })
            .catch(err => {
                console.error("Summary fetch error:", err);
                container.innerHTML = generateErrorHtml("500", "Error loading blog summaries");
            });
    }
});