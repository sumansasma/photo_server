const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs'); // Import the fs module
const cors = require('cors'); // Import the cors module

const app = express();
const port = 3000;
const db = new sqlite3.Database('photos.db');

// Use the cors middleware to enable CORS
app.use(cors()); // Enable CORS for all routes

// Create a table to store photo file names
db.run(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY,
    filename TEXT
  )
`);

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

// Serve static files from the "uploads" directory
app.use('/uploads', express.static('uploads'));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Handle the root route ("/") by redirecting to the upload form
app.get('/', (req, res) => {
    res.redirect('/upload.html');
});

app.get('/upload-files', (req, res) => {
    db.all('SELECT id, filename FROM photos', (err, rows) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        console.log('Data sent to the client:', rows);

        // Convert the database rows into an array of objects
        const photos = rows.map(row => ({
            id: row.id,
            filename: row.filename
        }));
        
        res.json(photos);
    });
});


// Add a route to delete a specific file by its ID
// Add a route to delete a specific file by its ID
app.delete('/delete-file/:id', (req, res) => {
    const fileId = req.params.id;
    console.log('Received delete request for file with ID:', fileId);
    
    // Check if the fileId is a valid positive integer
    if (!/^[1-9]\d*$/.test(fileId)) {
        return res.status(400).send('Invalid file ID');
    }

    // Find the file in the database by ID
    db.get('SELECT * FROM photos WHERE id = ?', [fileId], (err, row) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        if (!row) {
            return res.status(404).send('File not found');
        }

        // Delete the file from the 'uploads' directory
        const filename = row.filename;
        const filePath = path.join(__dirname, 'uploads', filename);
        fs.unlink(filePath, (err) => {
            if (err) {
                return res.status(500).send(err.message);
            }

            // Delete the file from the database
            db.run('DELETE FROM photos WHERE id = ?', [fileId], (err) => {
                if (err) {
                    return res.status(500).send(err.message);
                }
                res.status(200).send('File deleted successfully');
            });
        });
    });
});


// Upload a photo and store its filename in the database
app.post('https://photo-server-jxyh.onrender.com/upload', upload.single('photo'), (req, res) => {
    if (req.file) {
        const filename = req.file.filename;
        db.run('INSERT INTO photos (filename) VALUES (?)', [filename], (err) => {
            if (err) {
                return res.status(500).send(err.message);
            }
            res.send("File uploaded Successfully");
        });
    } else {
        res.status(400).send('No file uploaded.');
    }
});

// Get a list of uploaded photos
app.get('/photos', (req, res) => {
    db.all('SELECT * FROM photos', (err, rows) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.json(rows.map((row) => row.filename));
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
