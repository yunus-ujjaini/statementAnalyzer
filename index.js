const express = require('express');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const app = express();
const port = 3000;
const moment = require('moment');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

// File filter to accept only CSV files
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'), false);
    }
  };

const upload = multer({
  storage: storage,
  fileFilter: fileFilter
});

// Route to serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function identifyDateFormat(dateArray) {
  const dateFormats = ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'DD/MM/YY', 'MM/DD/YY', 'YYYY/MM/DD', 'YYYY-DD-MM'];
  const formatCounts = new Map();

  // Initialize format counts
  dateFormats.forEach(format => formatCounts.set(format, 0));

  // Count matches for each format
  dateArray.forEach(date => {
    dateFormats.forEach(format => {
      if (moment(date, format, true).isValid()) {
        formatCounts.set(format, formatCounts.get(format) + 1);
      }
    });
  });

  // Determine the most likely format
  let mostLikelyFormat = '';
  let maxCount = 0;
  console.log(formatCounts);
  formatCounts.forEach((count, format) => {
    if (count > maxCount) {
      maxCount = count;
      mostLikelyFormat = format;
    }
  });

  return mostLikelyFormat;
}

// Route to handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
  if (req.file) {
    const results = [];
    const filePath = req.file.path;

     // Dynamically import strip-bom-stream
     const stripBomStream = await import('strip-bom-stream');

    // Read the CSV file
    fs.createReadStream(filePath)
      .pipe(stripBomStream.default())
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        // Process the results
        // get the date format using moment
        const dateArray = results.map(item => item.Date);
        const dateFormat = identifyDateFormat(dateArray);
        res.json({ success: true, message: 'File uploaded successfully!', data: results, dateFormat: dateFormat });
      })
      .on('error', (error) => {
        res.status(500).json({ success: false, message: 'Error processing CSV file', error: error.message });
      });



  } else {
    res.status(400).json({ success: false, message: 'Only CSV files are allowed!' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === 'Only CSV files are allowed!') {
      // Handle Multer-specific errors and custom file filter errors
      res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      // Handle other errors
      console.error(err.stack);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    } else {
      next();
    }
  });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});