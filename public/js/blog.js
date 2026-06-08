import { app, db } from '../js/firebase.js'; // Ensure this path is correct
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Extract the blog ID from the URL path
const blogId = decodeURI(location.pathname.split("/").pop());

// Reference to the specific document in the Firestore collection
const docRef = doc(db, "blogs", blogId);

// Fetch the document data
getDoc(docRef)
  .then((docSnap) => {
    if (docSnap.exists()) {
      // Access the data from the document snapshot
      const data = docSnap.data();
      setupBlog(data); // Pass the data to setupBlog function
    } else {
      // Redirect to the home page if the document does not exist
      location.replace("/");
    }
  })
  .catch((error) => {
    console.error("Error fetching document: ", error);
  });

  const setupBlog = (data) => {
    // Select elements for banner, blog title, published date, and article content
    //const banner = document.querySelector('.banner');
    const bannerImg = document.querySelector('#banner-image');
    const blogTitle = document.querySelector('.title');
    const publishedAt = document.querySelector('.published');
    const article = document.querySelector('.article');
    
    if (data.bannerImage) {
        bannerImg.src = data.bannerImage;
    } else {
        console.error('Banner image URL is missing.');
    }
    //banner.style.backgroundImage = `url(${data.bannerImage})`;
    

    
  
    // Set blog title and published date
    blogTitle.textContent = data.title;
    publishedAt.innerHTML = `<span>Published At:</span> ${data.publishedAt}`;
  
    // Set article content
    addArticle(article, data.article);
}
  

  

const addArticle = (ele, data) => {
  data = data.split("\n").filter(item => item.length);

  data.forEach(item => {
    if (item[0] == '#') {
      let hCount = 0;
      let i = 0;
      while (item[i] == '#') {
        hCount++;
        i++;
      }
      let tag = `h${hCount}`;
      ele.innerHTML += `<${tag}>${item.slice(hCount)}</${tag}>`
    } else if (item[0] == "!" && item[1] == "[") {
      let separator;
      for (let i = 0; i <= item.length; i++) {
        if (item[i] == "]" && item[i + 1] == "(" && item[item.length - 1] == ")") {
          separator = i;
        }
      }
      let alt = item.slice(2, separator);
      let src = item.slice(separator + 2, item.length - 1);
      ele.innerHTML += `<img src ="${src}" alt="${alt}" class="article-image">`;
    } else {
      ele.innerHTML += `<p>${item}</p>`;
    }
  });
}

