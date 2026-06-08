import { app, db } from '../js/firebase.js'; // Ensure this path is correct
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const blogSection = document.querySelector('.blog-section');

    if (!blogSection) {
        console.error("Error: The blog section element was not found in the DOM.");
        return;
    }

    const fetchBlogs = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "blogs"));
            querySnapshot.forEach((blog) => {
                if (blog.id !== decodeURI(location.pathname.split("/").pop())) {
                    createBlog(blog);
                }
            });
        } catch (error) {
            console.error("Error fetching blogs: ", error);
        }
    };

    const createBlog = (blog) => {
        let data = blog.data();
        blogSection.innerHTML += `
        <div class="blog-card">
            <img src="${data.bannerImage}" class="blog-image" alt="">
            <h1 class="blog-title">${data.title.substring(0, 100) + '.....'}</h1>
            <p class="blog-overview">${data.article.substring(0, 200) + '.....'}</p>
            <a href="/${blog.id}" class="btn dark">read</a>
        </div>`;
    };

    // Fetch and display blogs
    fetchBlogs();
});
