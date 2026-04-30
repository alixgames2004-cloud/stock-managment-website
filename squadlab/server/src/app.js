const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SquadLab API is running' });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/components', require('./routes/components.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/projects', require('./routes/projects.routes'));
app.use('/api/discharge-sheets', require('./routes/discharge-sheets.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
