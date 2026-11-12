const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const session = require('express-session');
const passport = require('./config/passport');

const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const aiRoutes = require('./routes/aiRoutes');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'vastra-boutique-secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// Routes
app.get('/', (req, res) => {
  res.send('Vastra Boutique API is running...');
});
app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;