import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


const blogTitleField =document.querySelector('.title');
const articleField=document.querySelector('.article');

const correctPassword = "admin123"; // Change this to your desired password

document.getElementById("passwordForm").addEventListener("submit", function(event) {
    event.preventDefault(); // Prevent form submission

        const password = document.getElementById("passwordInput").value;

        if (password === correctPassword) {
                // Show editor content if password is correct
                document.getElementById("passwordForm").style.display = "none";
                document.getElementById("editorContainer").style.display = "block";
        } else {
                // Show error message if password is incorrect
                document.getElementById("errorMessage").textContent = "Incorrect password";
        }
    });


//banner
const bannerImage=document.querySelector('#banner-upload');
const banner=document.querySelector(".banner");
let bannerPath;

const publishBtn=document.querySelector('.publish-btn')
const uploadInput=document.querySelector('#image-upload');


bannerImage.addEventListener('change',()=>{
    uploadImage(bannerImage,"banner");
})

uploadInput.addEventListener('change',()=>{
    uploadImage(bannerImage,"image");
})


const uploadImage=(uploadFile,uploadType)=>{
    const[file]=uploadFile.files;
    if(file && file.type.includes("image")){
        const formdata=new FormData();
        formdata.append('image',file);

        fetch('/upload',{
            method:'post',
            body:formdata
        }).then(res=>res.json())
        .then(data=> {
            if(uploadType=="image"){
                addImage(data,file.name);

            }
            else{
               bannerPath=`${location.origin}/${data}`;
               banner.style.backgroundImage=`url("${bannerPath}")`;}
        })
    }else{
        alert("image upload only")
    }
}

const addImage=(imagepath,alt)=>{
    let curPos=articleField.selectionStart;
    let textToInsert=`\r![${alt}](${imagepath})\r`;
    articleField.value=articleField.value.slice(0,curPos) + textToInsert + articleField.value.slice(curPos);
    
}

publishBtn.addEventListener('click', async () => {
    if (articleField.value.length && blogTitleField.value.length) {
        // Generating id
        let letters = 'abcdefghijklmnopqrstuvwxyz';
        let blogTitle = blogTitleField.value.split(" ").join("-");
        let id = '';
        for (let i = 0; i < 4; i++) {
            id += letters[Math.floor(Math.random() * letters.length)];
        }

        // Setting up docName
        let docName = `${blogTitle}-${id}`;
        let date = new Date(); // For published at info
        let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        // Access Firestore with db variable
        try {
            await setDoc(doc(collection(window.db, "blogs"), docName), {
                title: blogTitleField.value,
                article: articleField.value,
                bannerImage: bannerPath,
                publishedAt: `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
            });
            console.log('Data entered');
            // Redirect to blog page
            window.location.href = `blog.html?blog=${docName}`;
        } catch (err) {
            console.error("Error adding document: ", err);
        }
    }
});

