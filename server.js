const express = require('express');
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs');

const app = express();
const initial_path = path.join(__dirname, 'public');

app.use(express.static(initial_path));
app.use(fileUpload());

// Ensure the upload directory exists
const uploadDir = path.join(initial_path, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.get('/', (req, res) => {
    res.sendFile(path.join(initial_path, "home.html"));
});

app.get('/editor', (req, res) => {
    res.sendFile(path.join(initial_path, "editor.html"));
});

// Upload route
app.post('/upload', (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let file = req.files.image;
    let date = new Date();
    // Image name
    let imagename = date.getDate() + date.getTime() + file.name;
    // Image upload path
    let uploadPath = path.join(uploadDir, imagename);

    // Move the file to the upload directory
    file.mv(uploadPath, (err) => {
        if (err) {
            return res.status(500).send(err);
        }
        // Return the relative path to the uploaded file
        res.json(`uploads/${imagename}`);
    });
});

app.get("/:blog",(req,res)=>{
    res.sendFile(path.join(initial_path,"blog.html"));
})

app.use((req,res)=>{
    res.json("404");
})

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
